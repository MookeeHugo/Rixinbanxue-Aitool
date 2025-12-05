"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, X, ArrowRight, Clock } from "lucide-react"

const STAGE_LABELS = {
  uploading: "上传文件",
  parsing: "解析题目",
  editing: "编辑题目",
  tagging: "标签管理",
  completed: "已完成",
}

const STAGE_ROUTES = {
  uploading: "/upload",
  parsing: "/parse",
  editing: "/parse",
  tagging: "/edit",
  completed: "/library",
}

export function TaskRecoveryBanner() {
  const router = useRouter()
  const currentTask = useAppStore((state) => state.currentTask)
  const dismissIncompleteTask = useAppStore((state) => state.dismissIncompleteTask)
  const clearIncompleteTask = useAppStore((state) => state.clearIncompleteTask)

  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const [windowWidth, setWindowWidth] = useState(0)

  const incompleteTask =
    currentTask && currentTask.isIncomplete && currentTask.stage !== "completed" ? currentTask : null
  const isDismissed = currentTask?.isDismissed

  const [autoRecovery, setAutoRecovery] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("autoRecovery") === "true"
    }
    return false
  })

  const updateButtonPosition = () => {
    const button = document.querySelector("[data-start-record-button]") as HTMLElement
    if (button) {
      const rect = button.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      setButtonPosition({ x: centerX, y: centerY })
    }
    setWindowWidth(window.innerWidth)
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      updateButtonPosition()
      window.addEventListener("resize", updateButtonPosition)
      return () => window.removeEventListener("resize", updateButtonPosition)
    }
  }, [])

  useEffect(() => {
    if (incompleteTask && !isDismissed) {
      if (autoRecovery) {
        const route = STAGE_ROUTES[incompleteTask.stage as keyof typeof STAGE_ROUTES]
        router.push(route)
        return
      }

      // Update position before showing
      updateButtonPosition()
      setIsVisible(true)
    } else if (isDismissed) {
      // If dismissed, we might be animating out, or already hidden
      // The handlePostpone handles the animation and then sets isDismissed
      // If it was restored (isDismissed became false), the first block handles it
      if (!isAnimating) {
        setIsVisible(false)
      }
    } else {
      setIsVisible(false)
    }
  }, [incompleteTask, isDismissed, autoRecovery, router, isAnimating])

  const handleContinue = () => {
    if (incompleteTask) {
      const route = STAGE_ROUTES[incompleteTask.stage as keyof typeof STAGE_ROUTES]
      router.push(route)
      setIsVisible(false)
    }
  }

  const handleDismiss = () => {
    dismissIncompleteTask()
    setIsVisible(false)
  }

  const handleAbandon = () => {
    if (confirm("确定要放弃此任务吗？所有进度将被清除。")) {
      clearIncompleteTask()
      setIsVisible(false)
    }
  }

  const handleAutoRecoveryToggle = () => {
    const newValue = !autoRecovery
    setAutoRecovery(newValue)
    if (typeof window !== "undefined") {
      localStorage.setItem("autoRecovery", String(newValue))
    }
  }

  const handlePostpone = () => {
    // Update position one last time before flying
    updateButtonPosition()
    setIsAnimating(true)

    dismissIncompleteTask()

    // Wait for animation to finish before hiding card
    setTimeout(() => {
      setIsAnimating(false)
      setIsVisible(false)
    }, 800)
  }

  const getTimeSinceLastActive = () => {
    if (!incompleteTask?.lastActiveAt) return ""
    const minutes = Math.floor((Date.now() - incompleteTask.lastActiveAt) / 60000)
    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes} 分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} 小时前`
    return `${Math.floor(hours / 24)} 天前`
  }

  if (!isVisible || !incompleteTask) return null

  // Calculate the translation needed to move from center-top to the button
  // Initial position is left: 50%, top: 5rem (80px)
  // We need to move to buttonPosition.x, buttonPosition.y
  // The element is centered horizontally with -translate-x-1/2
  // So the visual center is at windowWidth / 2
  // Delta X = buttonPosition.x - (windowWidth / 2)
  // Delta Y = buttonPosition.y - 80px
  const deltaX = buttonPosition.x - windowWidth / 2
  const deltaY = buttonPosition.y - 80

  return (
    <>
      <div
        ref={cardRef}
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 transition-all duration-700 ${
          isAnimating ? "animate-fly-to-button" : ""
        }`}
        style={
          isAnimating
            ? ({
                "--translate-x": `${deltaX}px`,
                "--translate-y": `${deltaY}px`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-2xl">
          <div className="p-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-shrink-0">
                <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base mb-1 flex items-center gap-2">
                  检测到未完成的任务
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    <Clock className="h-3 w-3" />
                    {getTimeSinceLastActive()}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  <span className="font-medium">{incompleteTask.fileName}</span>
                  {" · "}
                  当前环节：
                  <span className="font-medium text-amber-700">
                    {STAGE_LABELS[incompleteTask.stage as keyof typeof STAGE_LABELS]}
                  </span>
                  {incompleteTask.progress > 0 && ` · 进度 ${Math.round(incompleteTask.progress)}%`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleContinue}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
                >
                  继续任务
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAbandon}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-transparent"
                >
                  放弃任务
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 py-2 bg-white/50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-recovery"
                  checked={autoRecovery}
                  onChange={handleAutoRecoveryToggle}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="auto-recovery" className="text-xs text-gray-600 cursor-pointer select-none">
                  下次自动恢复任务（无需手动点击）
                </label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePostpone}
                disabled={isAnimating}
                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 text-xs"
              >
                稍后处理
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <style jsx>{`
        @keyframes flyToButton {
          0% {
            transform: translate(-50%, 0) scale(1);
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            transform: translate(
              calc(-50% + var(--translate-x)), 
              var(--translate-y)
            ) scale(0.1);
            opacity: 0;
          }
        }

        .animate-fly-to-button {
          animation: flyToButton 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </>
  )
}

export function PostponedTaskButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExiting(true)
    setTimeout(() => {
      onClick(e)
    }, 400)
  }

  return (
    <button
      onClick={handleClick}
      className={`absolute inset-0 w-full h-full border-2 border-dashed border-amber-500 bg-amber-50/95 hover:bg-amber-100/95 rounded-lg transition-all duration-400 flex items-center justify-center gap-2 text-amber-700 font-medium text-sm z-10 hover:scale-105 ${
        isExiting ? "opacity-0 scale-90" : "animate-fade-in"
      }`}
      style={{
        animation: isExiting ? "none" : "fadeIn 0.6s ease-out",
      }}
    >
      <AlertCircle className="h-4 w-4" />
      处理未完成任务
    </button>
  )
}
