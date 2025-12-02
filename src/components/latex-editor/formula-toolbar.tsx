'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { FormulaToolbarProps, FormulaCategory } from './types'
import { ChevronDown, Sigma, Pi, Divide, Superscript, Subscript, Radical, Infinity } from 'lucide-react'

const FORMULA_CATEGORIES: FormulaCategory[] = [
  {
    name: 'basic',
    label: '基础运算',
    symbols: [
      { latex: '+', label: '+', description: '加' },
      { latex: '-', label: '-', description: '减' },
      { latex: '\\times', label: '\u00d7', description: '乘' },
      { latex: '\\div', label: '\u00f7', description: '除' },
      { latex: '\\pm', label: '\u00b1', description: '正负' },
      { latex: '\\mp', label: '\u2213', description: '负正' },
      { latex: '=', label: '=', description: '等于' },
      { latex: '\\neq', label: '\u2260', description: '不等于' },
      { latex: '<', label: '<', description: '小于' },
      { latex: '>', label: '>', description: '大于' },
      { latex: '\\leq', label: '\u2264', description: '小于等于' },
      { latex: '\\geq', label: '\u2265', description: '大于等于' },
      { latex: '\\approx', label: '\u2248', description: '约等于' },
      { latex: '\\equiv', label: '\u2261', description: '恒等于' }
    ]
  },
  {
    name: 'fractions',
    label: '分数/根式',
    symbols: [
      { latex: '\\frac{a}{b}', label: 'a/b', description: '分数' },
      { latex: '\\dfrac{a}{b}', label: 'a/b (大)', description: '显示分数' },
      { latex: '\\sqrt{x}', label: '\u221ax', description: '平方根' },
      { latex: '\\sqrt[n]{x}', label: '\u207f\u221ax', description: 'n次根' },
      { latex: '^{2}', label: 'x\u00b2', description: '平方' },
      { latex: '^{3}', label: 'x\u00b3', description: '立方' },
      { latex: '^{n}', label: 'x\u207f', description: 'n次方' },
      { latex: '_{n}', label: 'x\u2099', description: '下标' }
    ]
  },
  {
    name: 'greek',
    label: '希腊字母',
    symbols: [
      { latex: '\\alpha', label: '\u03b1', description: 'alpha' },
      { latex: '\\beta', label: '\u03b2', description: 'beta' },
      { latex: '\\gamma', label: '\u03b3', description: 'gamma' },
      { latex: '\\delta', label: '\u03b4', description: 'delta' },
      { latex: '\\epsilon', label: '\u03b5', description: 'epsilon' },
      { latex: '\\theta', label: '\u03b8', description: 'theta' },
      { latex: '\\lambda', label: '\u03bb', description: 'lambda' },
      { latex: '\\mu', label: '\u03bc', description: 'mu' },
      { latex: '\\pi', label: '\u03c0', description: 'pi' },
      { latex: '\\sigma', label: '\u03c3', description: 'sigma' },
      { latex: '\\omega', label: '\u03c9', description: 'omega' },
      { latex: '\\Delta', label: '\u0394', description: 'Delta' },
      { latex: '\\Sigma', label: '\u03a3', description: 'Sigma' },
      { latex: '\\Omega', label: '\u03a9', description: 'Omega' }
    ]
  },
  {
    name: 'trigonometry',
    label: '三角函数',
    symbols: [
      { latex: '\\sin', label: 'sin', description: '正弦' },
      { latex: '\\cos', label: 'cos', description: '余弦' },
      { latex: '\\tan', label: 'tan', description: '正切' },
      { latex: '\\cot', label: 'cot', description: '余切' },
      { latex: '\\sec', label: 'sec', description: '正割' },
      { latex: '\\csc', label: 'csc', description: '余割' },
      { latex: '\\arcsin', label: 'arcsin', description: '反正弦' },
      { latex: '\\arccos', label: 'arccos', description: '反余弦' },
      { latex: '\\arctan', label: 'arctan', description: '反正切' },
      { latex: '\\sinh', label: 'sinh', description: '双曲正弦' },
      { latex: '\\cosh', label: 'cosh', description: '双曲余弦' },
      { latex: '\\tanh', label: 'tanh', description: '双曲正切' }
    ]
  },
  {
    name: 'calculus',
    label: '微积分',
    symbols: [
      { latex: '\\sum_{i=1}^{n}', label: '\u03a3', description: '求和' },
      { latex: '\\prod_{i=1}^{n}', label: '\u03a0', description: '连乘' },
      { latex: '\\int', label: '\u222b', description: '积分' },
      { latex: '\\int_{a}^{b}', label: '\u222b\u1d43\u1d47', description: '定积分' },
      { latex: '\\iint', label: '\u222c', description: '二重积分' },
      { latex: '\\iiint', label: '\u222d', description: '三重积分' },
      { latex: '\\oint', label: '\u222e', description: '环路积分' },
      { latex: '\\lim_{x \\to a}', label: 'lim', description: '极限' },
      { latex: '\\frac{d}{dx}', label: 'd/dx', description: '导数' },
      { latex: '\\frac{\\partial}{\\partial x}', label: '\u2202/\u2202x', description: '偏导数' },
      { latex: '\\nabla', label: '\u2207', description: '梯度' },
      { latex: '\\infty', label: '\u221e', description: '无穷' }
    ]
  },
  {
    name: 'sets',
    label: '集合/逻辑',
    symbols: [
      { latex: '\\in', label: '\u2208', description: '属于' },
      { latex: '\\notin', label: '\u2209', description: '不属于' },
      { latex: '\\subset', label: '\u2282', description: '真子集' },
      { latex: '\\subseteq', label: '\u2286', description: '子集' },
      { latex: '\\cup', label: '\u222a', description: '并集' },
      { latex: '\\cap', label: '\u2229', description: '交集' },
      { latex: '\\emptyset', label: '\u2205', description: '空集' },
      { latex: '\\forall', label: '\u2200', description: '任意' },
      { latex: '\\exists', label: '\u2203', description: '存在' },
      { latex: '\\neg', label: '\u00ac', description: '非' },
      { latex: '\\land', label: '\u2227', description: '与' },
      { latex: '\\lor', label: '\u2228', description: '或' },
      { latex: '\\Rightarrow', label: '\u21d2', description: '推出' },
      { latex: '\\Leftrightarrow', label: '\u21d4', description: '等价' }
    ]
  },
  {
    name: 'matrices',
    label: '矩阵/括号',
    symbols: [
      { latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', label: '( )', description: '圆括号矩阵' },
      { latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', label: '[ ]', description: '方括号矩阵' },
      { latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', label: '| |', description: '行列式' },
      { latex: '\\left( \\right)', label: '( )', description: '自适应圆括号' },
      { latex: '\\left[ \\right]', label: '[ ]', description: '自适应方括号' },
      { latex: '\\left\\{ \\right\\}', label: '{ }', description: '自适应大括号' },
      { latex: '\\left| \\right|', label: '| |', description: '自适应绝对值' },
      { latex: '\\vec{a}', label: 'a\u20d7', description: '向量' },
      { latex: '\\overline{x}', label: 'x\u0304', description: '上划线' },
      { latex: '\\hat{x}', label: 'x\u0302', description: '帽子' },
      { latex: '\\dot{x}', label: 'x\u0307', description: '点' },
      { latex: '\\ddot{x}', label: 'x\u0308', description: '双点' }
    ]
  }
]

export function FormulaToolbar({
  onInsert,
  disabled = false,
  className
}: FormulaToolbarProps) {
  const [open, setOpen] = useState(false)

  const handleInsert = (latex: string) => {
    onInsert(latex)
  }

  // 快捷按钮 - 常用符号
  const quickButtons = [
    { icon: <Superscript className="h-4 w-4" />, latex: '^{}', title: '上标' },
    { icon: <Subscript className="h-4 w-4" />, latex: '_{}', title: '下标' },
    { icon: <Divide className="h-4 w-4" />, latex: '\\frac{}{}', title: '分数' },
    { icon: <Radical className="h-4 w-4" />, latex: '\\sqrt{}', title: '根号' },
    { icon: <Sigma className="h-4 w-4" />, latex: '\\sum_{i=1}^{n}', title: '求和' },
    { icon: <Pi className="h-4 w-4" />, latex: '\\pi', title: '\u03c0' },
    { icon: <Infinity className="h-4 w-4" />, latex: '\\infty', title: '\u221e' }
  ]

  return (
    <div className={cn('flex items-center gap-1 flex-wrap w-full max-w-full', className)}>
      {/* 快捷按钮 */}
      {quickButtons.map((btn, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleInsert(btn.latex)}
          title={btn.title}
          className="h-8 w-8 p-0"
        >
          {btn.icon}
        </Button>
      ))}

      {/* 更多符号弹出框 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8 gap-1"
          >
            更多
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] max-w-[calc(100vw-2rem)] min-w-[280px] p-0"
          align="start"
          side="bottom"
          sideOffset={5}
          avoidCollisions={true}
          collisionPadding={8}
        >
          <Tabs defaultValue="basic" className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="w-full justify-start h-auto p-1 flex-wrap">
                {FORMULA_CATEGORIES.map((cat) => (
                  <TabsTrigger
                    key={cat.name}
                    value={cat.name}
                    className="text-xs px-2 py-1"
                  >
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
            {FORMULA_CATEGORIES.map((cat) => (
              <TabsContent key={cat.name} value={cat.name} className="p-2 mt-0">
                <div className="grid grid-cols-7 gap-1">
                  {cat.symbols.map((symbol, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full text-sm font-mono hover:bg-accent"
                      onClick={() => {
                        handleInsert(symbol.latex)
                        setOpen(false)
                      }}
                      title={symbol.description}
                    >
                      {symbol.label}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  )
}
