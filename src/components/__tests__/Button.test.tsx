/**
 * UI 组件测试示例
 * 测试 shadcn/ui Button 组件的基本功能
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button 组件', () => {
  it('应该渲染按钮文本', () => {
    render(<Button>点击我</Button>)
    expect(screen.getByText('点击我')).toBeInTheDocument()
  })

  it('应该响应点击事件', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>点击我</Button>)

    const button = screen.getByText('点击我')
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('应该在禁用时不响应点击事件', () => {
    const handleClick = jest.fn()
    render(
      <Button disabled onClick={handleClick}>
        禁用按钮
      </Button>
    )

    const button = screen.getByText('禁用按钮')
    fireEvent.click(button)

    expect(handleClick).not.toHaveBeenCalled()
    expect(button).toBeDisabled()
  })

  it('应该应用不同的变体样式', () => {
    const { rerender } = render(<Button variant="default">默认</Button>)
    let button = screen.getByText('默认')
    expect(button.className).toContain('bg-primary-500')

    rerender(<Button variant="destructive">危险</Button>)
    button = screen.getByText('危险')
    expect(button.className).toContain('bg-red-600')

    rerender(<Button variant="outline">轮廓</Button>)
    button = screen.getByText('轮廓')
    expect(button.className).toContain('border-primary-500')
  })

  it('应该支持不同的尺寸', () => {
    const { rerender } = render(<Button size="default">默认</Button>)
    let button = screen.getByText('默认')
    expect(button.className).toContain('h-10') // 默认尺寸

    rerender(<Button size="sm">小号</Button>)
    button = screen.getByText('小号')
    expect(button.className).toContain('h-8')  // 小号

    rerender(<Button size="lg">大号</Button>)
    button = screen.getByText('大号')
    expect(button.className).toContain('h-12') // 大号
  })

  it('应该支持自定义className', () => {
    render(<Button className="custom-class">自定义</Button>)
    const button = screen.getByText('自定义')
    expect(button.className).toContain('custom-class')
  })
})
