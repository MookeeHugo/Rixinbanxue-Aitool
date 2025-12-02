/**
 * Button 组件 Storybook 文档
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Search, Plus, Download, Trash2, Sparkles } from 'lucide-react';

const meta = {
  title: '日新平台/UI组件/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '日新平台按钮组件，支持多种变体、尺寸和状态。基于shadcn/ui扩展，添加了渐变样式和AI特效。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'outline', 'ghost', 'link', 'destructive', 'success', 'ai'],
      description: '按钮变体',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: '按钮尺寸',
    },
    loading: {
      control: 'boolean',
      description: '加载状态',
    },
    disabled: {
      control: 'boolean',
      description: '禁用状态',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ==========================================
// 基础示例
// ==========================================

export const Default: Story = {
  args: {
    children: '添加到题篮',
    variant: 'default',
  },
};

export const Primary: Story = {
  args: {
    children: '预览',
    variant: 'primary',
  },
};

export const Outline: Story = {
  args: {
    children: '取消',
    variant: 'outline',
  },
};

export const Destructive: Story = {
  args: {
    children: '删除题目',
    variant: 'destructive',
    leftIcon: <Trash2 className="h-4 w-4" />,
  },
};

export const Success: Story = {
  args: {
    children: '确认提交',
    variant: 'success',
  },
};

export const AI: Story = {
  args: {
    children: 'AI生成题目',
    variant: 'ai',
    leftIcon: <Sparkles className="h-4 w-4" />,
  },
  parameters: {
    docs: {
      description: {
        story: 'AI功能专用按钮，带有紫粉渐变和特殊悬停效果。',
      },
    },
  },
};

// ==========================================
// 尺寸示例
// ==========================================

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">小按钮</Button>
      <Button size="default">默认按钮</Button>
      <Button size="lg">大按钮</Button>
      <Button size="icon">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  ),
};

// ==========================================
// 带图标示例
// ==========================================

export const WithLeftIcon: Story = {
  args: {
    children: '搜索题目',
    leftIcon: <Search className="h-4 w-4" />,
  },
};

export const WithRightIcon: Story = {
  args: {
    children: '导出PDF',
    rightIcon: <Download className="h-4 w-4" />,
  },
};

// ==========================================
// 状态示例
// ==========================================

export const Loading: Story = {
  args: {
    children: '提交中...',
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: '加载状态会显示旋转图标，并自动禁用按钮。',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    children: '已禁用',
    disabled: true,
  },
};

// ==========================================
// 完整变体展示
// ==========================================

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <Button variant="default">主按钮</Button>
        <Button variant="outline">次要</Button>
        <Button variant="outline">轮廓</Button>
        <Button variant="ghost">幽灵</Button>
      </div>
      <div className="flex gap-4">
        <Button variant="link">链接</Button>
        <Button variant="destructive">危险</Button>
        <Button variant="success">成功</Button>
        <Button variant="ai">AI功能</Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示所有8种按钮变体。',
      },
    },
  },
};

// ==========================================
// 实际使用场景
// ==========================================

export const QuestionCardActions: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="outline" size="sm">
        <Search className="h-4 w-4 mr-2" />
        预览
      </Button>
      <Button variant="default" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        添加到题篮
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '题目卡片底部操作按钮的实际使用场景。',
      },
    },
  },
};

export const AIGenerateButton: Story = {
  render: () => (
    <Button variant="ai" size="lg">
      <Sparkles className="h-5 w-5 mr-2" />
      AI生成相似题目
    </Button>
  ),
  parameters: {
    docs: {
      description: {
        story: 'AI功能的主要入口按钮，使用特殊渐变吸引用户注意。',
      },
    },
  },
};
