/**
 * 简单的Toast Hook
 * 用于显示通知消息（临时实现）
 */

interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    // 临时使用alert，后续可替换为更好的UI组件
    const message = description ? `${title}\n${description}` : title

    if (variant === 'destructive') {
      console.error('[Error]', message)
      alert(`❌ ${message}`)
    } else {
      console.log('[Success]', message)
      alert(`✅ ${message}`)
    }
  }

  return { toast }
}
