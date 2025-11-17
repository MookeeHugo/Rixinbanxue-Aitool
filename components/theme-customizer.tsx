/**
 * 日新平台 - 主题定制器
 * 允许管理员自定义品牌色、字体、圆角等设计令牌
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, RotateCcw, Save } from 'lucide-react';

interface ThemeConfig {
  colors: {
    primary: string;
    success: string;
    warning: string;
    error: string;
  };
  borderRadius: {
    base: string;
    card: string;
  };
  fontFamily: {
    sans: string;
    mono: string;
  };
}

const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#8b5cf6',  // 紫色
    success: '#10b981',  // 绿色
    warning: '#f59e0b',  // 橙色
    error: '#ef4444',    // 红色
  },
  borderRadius: {
    base: '0.5rem',      // 8px
    card: '0.75rem',     // 12px
  },
  fontFamily: {
    sans: 'Inter',
    mono: 'JetBrains Mono',
  },
};

export function ThemeCustomizer() {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [previewMode, setPreviewMode] = useState(false);

  // 从localStorage加载自定义主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('custom-theme');
    if (savedTheme) {
      setTheme(JSON.parse(savedTheme));
    }
  }, []);

  // 应用主题到CSS变量
  const applyTheme = (config: ThemeConfig) => {
    const root = document.documentElement;

    // 应用颜色
    root.style.setProperty('--primary', hexToHSL(config.colors.primary));
    root.style.setProperty('--success-500', config.colors.success);
    root.style.setProperty('--warning-500', config.colors.warning);
    root.style.setProperty('--error-500', config.colors.error);

    // 应用圆角
    root.style.setProperty('--radius', config.borderRadius.base);
    root.style.setProperty('--radius-lg', config.borderRadius.card);

    // 应用字体
    root.style.setProperty('--font-sans', `"${config.fontFamily.sans}", -apple-system, sans-serif`);
    root.style.setProperty('--font-mono', `"${config.fontFamily.mono}", monospace`);
  };

  // Hex颜色转HSL（用于CSS变量）
  const hexToHSL = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '262 83% 58%';

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  };

  // 保存主题
  const saveTheme = () => {
    localStorage.setItem('custom-theme', JSON.stringify(theme));
    applyTheme(theme);
    alert('主题已保存！');
  };

  // 重置为默认主题
  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.removeItem('custom-theme');
    applyTheme(defaultTheme);
  };

  // 导出主题配置
  const exportTheme = () => {
    const dataStr = JSON.stringify(theme, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `theme-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // 导入主题配置
  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setTheme(imported);
        applyTheme(imported);
      } catch (error) {
        alert('主题文件格式错误！');
      }
    };
    reader.readAsText(file);
  };

  // 预览主题
  const togglePreview = () => {
    if (!previewMode) {
      applyTheme(theme);
    } else {
      const savedTheme = localStorage.getItem('custom-theme');
      if (savedTheme) {
        applyTheme(JSON.parse(savedTheme));
      } else {
        applyTheme(defaultTheme);
      }
    }
    setPreviewMode(!previewMode);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">主题定制器</h1>
        <p className="text-muted-foreground">
          自定义日新平台的视觉风格，包括颜色、字体和圆角。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 配色设置 */}
        <Card>
          <CardHeader>
            <CardTitle>配色方案</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                主色调（Primary）
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.colors.primary}
                  onChange={(e) => setTheme({
                    ...theme,
                    colors: { ...theme.colors, primary: e.target.value }
                  })}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <Input
                  value={theme.colors.primary}
                  onChange={(e) => setTheme({
                    ...theme,
                    colors: { ...theme.colors, primary: e.target.value }
                  })}
                  placeholder="#8b5cf6"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                成功色（Success）
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.colors.success}
                  onChange={(e) => setTheme({
                    ...theme,
                    colors: { ...theme.colors, success: e.target.value }
                  })}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <Input
                  value={theme.colors.success}
                  onChange={(e) => setTheme({
                    ...theme,
                    colors: { ...theme.colors, success: e.target.value }
                  })}
                  placeholder="#10b981"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                警告色（Warning）
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.colors.warning}
                  onChange={(e) => setTheme({
                    ...theme,
                    colors: { ...theme.colors, warning: e.target.value }
                  })}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <Input
                  value={theme.colors.warning}
                  onChange={(e) => setTheme({
                    ...theme,
                    colors: { ...theme.colors, warning: e.target.value }
                  })}
                  placeholder="#f59e0b"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                错误色（Error）
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.colors.error}
                  onChange={(e) => setTheme({
                    ...theme,
                    colors: { ...theme.colors, error: e.target.value }
                  })}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <Input
                  value={theme.colors.error}
                  onChange={(e) => setTheme({
                    ...theme,
                    colors: { ...theme.colors, error: e.target.value }
                  })}
                  placeholder="#ef4444"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 圆角和字体设置 */}
        <Card>
          <CardHeader>
            <CardTitle>样式设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                基础圆角（按钮、输入框）
              </label>
              <Input
                value={theme.borderRadius.base}
                onChange={(e) => setTheme({
                  ...theme,
                  borderRadius: { ...theme.borderRadius, base: e.target.value }
                })}
                placeholder="0.5rem"
              />
              <p className="text-xs text-muted-foreground mt-1">
                推荐: 0.25rem (4px) - 1rem (16px)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                卡片圆角
              </label>
              <Input
                value={theme.borderRadius.card}
                onChange={(e) => setTheme({
                  ...theme,
                  borderRadius: { ...theme.borderRadius, card: e.target.value }
                })}
                placeholder="0.75rem"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                UI字体（Sans-serif）
              </label>
              <Input
                value={theme.fontFamily.sans}
                onChange={(e) => setTheme({
                  ...theme,
                  fontFamily: { ...theme.fontFamily, sans: e.target.value }
                })}
                placeholder="Inter"
              />
              <p className="text-xs text-muted-foreground mt-1">
                推荐: Inter, Roboto, SF Pro
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                代码字体（Monospace）
              </label>
              <Input
                value={theme.fontFamily.mono}
                onChange={(e) => setTheme({
                  ...theme,
                  fontFamily: { ...theme.fontFamily, mono: e.target.value }
                })}
                placeholder="JetBrains Mono"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 预览区域 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>预览效果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 按钮预览 */}
            <div>
              <p className="text-sm font-medium mb-3">按钮样式</p>
              <div className="flex flex-wrap gap-3">
                <Button>主按钮</Button>
                <Button variant="secondary">次要按钮</Button>
                <Button variant="outline">轮廓按钮</Button>
                <Button variant="ghost">幽灵按钮</Button>
                <Button variant="destructive">危险按钮</Button>
              </div>
            </div>

            {/* 徽章预览 */}
            <div>
              <p className="text-sm font-medium mb-3">徽章样式</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">默认</Badge>
                <Badge variant="secondary">次要</Badge>
                <Badge variant="destructive">危险</Badge>
                <Badge variant="outline">轮廓</Badge>
              </div>
            </div>

            {/* 卡片预览 */}
            <div>
              <p className="text-sm font-medium mb-3">卡片样式</p>
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>示例题目卡片</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    七年级上册 · 代数
                  </p>
                </CardHeader>
                <CardContent>
                  <p>这是一个使用自定义主题的卡片示例。</p>
                </CardContent>
                <CardFooter>
                  <Button size="sm">查看详情</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3 mt-6">
        <Button onClick={togglePreview} variant="outline">
          {previewMode ? '取消预览' : '预览主题'}
        </Button>
        <Button onClick={saveTheme}>
          <Save className="mr-2 h-4 w-4" />
          保存主题
        </Button>
        <Button onClick={resetTheme} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          重置为默认
        </Button>
        <Button onClick={exportTheme} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          导出配置
        </Button>
        <label>
          <input
            type="file"
            accept=".json"
            onChange={importTheme}
            className="hidden"
          />
          <Button variant="outline" asChild>
            <span className="flex items-center">
              <Upload className="mr-2 h-4 w-4" />
              导入配置
            </span>
          </Button>
        </label>
      </div>

      {/* 使用说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ol>
            <li>调整颜色：点击色块或输入HEX颜色值（如 #8b5cf6）</li>
            <li>修改圆角：输入CSS单位（如 0.5rem、8px）</li>
            <li>更换字体：输入字体名称（需确保该字体已加载）</li>
            <li>点击"预览主题"查看效果，满意后点击"保存主题"</li>
            <li>可导出配置文件，分享给团队其他成员</li>
          </ol>

          <h4 className="mt-4">技术说明</h4>
          <p>
            主题配置保存在浏览器的localStorage中，应用到CSS变量后立即生效。
            导出的JSON文件可用于版本控制或团队共享。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ThemeCustomizer;
