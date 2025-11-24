/**
 * 管理搜索历史的 Hook
 * 支持本地存储持久化
 */

import { useState, useEffect, useCallback } from 'react'

interface UseSearchHistoryOptions {
  storageKey: string
  maxItems?: number
}

export function useSearchHistory(options: UseSearchHistoryOptions) {
  const { storageKey, maxItems = 5 } = options
  const [history, setHistory] = useState<string[]>([])

  // 从 localStorage 初始化
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
      if (stored) {
        setHistory(JSON.parse(stored))
      }
    } catch {
      setHistory([])
    }
  }, [storageKey])

  // 添加搜索记录
  const addToHistory = useCallback(
    (term: string) => {
      const normalized = term.trim()
      if (!normalized) return

      setHistory((prev) => {
        const next = [normalized, ...prev.filter((item) => item !== normalized)].slice(0, maxItems)
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // 忽略存储错误
        }
        return next
      })
    },
    [storageKey, maxItems]
  )

  // 清空历史
  const clearHistory = useCallback(() => {
    setHistory([])
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // 忽略清除错误
    }
  }, [storageKey])

  return {
    history,
    addToHistory,
    clearHistory,
  }
}
