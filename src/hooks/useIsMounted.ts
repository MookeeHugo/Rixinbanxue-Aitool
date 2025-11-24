/**
 * 检测组件是否已挂载的 Hook
 * 用于避免在组件卸载后更新状态
 */

import { useEffect, useRef } from 'react'

export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  return () => isMountedRef.current
}
