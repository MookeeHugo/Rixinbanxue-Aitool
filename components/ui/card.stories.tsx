/**
 * Card 组件 Storybook 文档
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Eye, Plus } from 'lucide-react';

const meta = {
  title: '日新平台/UI组件/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '日新平台卡片组件，用于展示题目、通知等内容。支持悬停效果和AI徽章。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    hover: {
      control: 'boolean',
      description: '启用悬停效果（阴影、位移、边框变化）',
    },
    aiGenerated: {
      control: 'boolean',
      description: '显示AI生成徽章',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// ==========================================
// 基础示例
// ==========================================

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>卡片标题</CardTitle>
        <CardDescription>这是卡片的描述文本</CardDescription>
      </CardHeader>
      <CardContent>
        <p>这里是卡片的主要内容区域。</p>
      </CardContent>
      <CardFooter>
        <Button>确定</Button>
      </CardFooter>
    </Card>
  ),
};

// ==========================================
// 题目卡片示例
// ==========================================

export const QuestionCard: Story = {
  render: () => (
    <Card className="w-[400px]" hover>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="line-clamp-2">
            因式分解：x² + 5x + 6
          </CardTitle>
          <Badge variant="easy">简单</Badge>
        </div>
        <CardDescription>
          七年级上册 · 代数 · 因式分解
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="formula-block">
          <p>将多项式 x² + 5x + 6 进行因式分解。</p>
          <p className="mt-2 text-sm text-muted-foreground">
            提示：寻找两个数，它们的和为5，积为6。
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            预览
          </Button>
          <Button variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">2025-11-15</span>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: '题目卡片的完整示例，包含难度徽章、科目标签、公式区域和操作按钮。',
      },
    },
  },
};

// ==========================================
// AI生成题目卡片
// ==========================================

export const AIGeneratedCard: Story = {
  render: () => (
    <Card className="w-[400px]" hover aiGenerated>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="line-clamp-2">
            解一元二次方程：2x² - 3x - 2 = 0
          </CardTitle>
          <Badge variant="medium">中等</Badge>
        </div>
        <CardDescription>
          八年级下册 · 代数 · 一元二次方程
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="formula-block">
          <p>使用公式法或配方法求解该方程。</p>
          <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-950 rounded-lg">
            <p className="text-sm font-mono">
              x = [-b ± √(b² - 4ac)] / 2a
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">预览</Button>
          <Button variant="default" size="sm">添加</Button>
        </div>
        <span className="text-sm text-muted-foreground">刚刚</span>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'AI生成的题目会在右上角显示AI徽章。',
      },
    },
  },
};

// ==========================================
// 悬停效果对比
// ==========================================

export const HoverEffectComparison: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="text-center">
        <p className="mb-2 text-sm text-muted-foreground">无悬停效果</p>
        <Card className="w-[250px]" hover={false}>
          <CardHeader>
            <CardTitle>普通卡片</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">鼠标悬停无变化</p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <p className="mb-2 text-sm text-muted-foreground">启用悬停效果</p>
        <Card className="w-[250px]" hover>
          <CardHeader>
            <CardTitle>交互卡片</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">鼠标悬停查看效果</p>
          </CardContent>
        </Card>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '悬停效果包括阴影增强、向上位移和边框颜色变化。',
      },
    },
  },
};

// ==========================================
// 题目网格布局
// ==========================================

export const QuestionGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[850px]">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} hover>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-base">题目标题 {i}</CardTitle>
              <Badge variant={i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy'}>
                {i % 3 === 0 ? '困难' : i % 2 === 0 ? '中等' : '简单'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              七年级上册 · 代数
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm line-clamp-2">
              这是题目内容的简短描述，用于快速浏览。
            </p>
          </CardContent>
          <CardFooter className="flex justify-between pt-4">
            <Button variant="outline" size="sm">预览</Button>
            <Button variant="default" size="sm">添加</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '题库浏览页面的网格布局示例。',
      },
    },
  },
};
