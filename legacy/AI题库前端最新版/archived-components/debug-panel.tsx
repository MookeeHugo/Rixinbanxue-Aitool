"use client"

import { useState } from "react"
import { Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { getMockConfig, setMockConfig } from "@/lib/mock-api"
import { useAppStore } from "@/lib/store"

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const config = getMockConfig()
  const { clearCurrentTask, usedStorage, updateUsedStorage } = useAppStore()

  const [uploadDelay, setUploadDelay] = useState(config.uploadDelay)
  const [parseSpeed, setParseSpeed] = useState(config.parseSpeed)
  const [failureProbability, setFailureProbability] = useState(config.failureProbability * 100)
  const [questionCount, setQuestionCount] = useState(config.questionCount)

  const handleApply = () => {
    setMockConfig({
      uploadDelay,
      parseSpeed,
      failureProbability: failureProbability / 100,
      questionCount,
    })
    alert("配置已更新！")
  }

  const handleReset = () => {
    const defaults = {
      uploadDelay: 1000,
      parseSpeed: 2000,
      failureProbability: 0,
      questionCount: 3,
    }
    setUploadDelay(defaults.uploadDelay)
    setParseSpeed(defaults.parseSpeed)
    setFailureProbability(defaults.failureProbability)
    setQuestionCount(defaults.questionCount)
    setMockConfig(defaults)
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
        size="icon"
      >
        <Settings className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">调试面板</h3>
        <Button onClick={() => setIsOpen(false)} variant="ghost" size="icon">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm">上传延迟: {uploadDelay}ms</Label>
          <Slider
            value={[uploadDelay]}
            onValueChange={(v) => setUploadDelay(v[0])}
            min={0}
            max={5000}
            step={500}
            className="mt-2"
          />
        </div>

        <div>
          <Label className="text-sm">解析速度: {parseSpeed}ms/题</Label>
          <Slider
            value={[parseSpeed]}
            onValueChange={(v) => setParseSpeed(v[0])}
            min={500}
            max={10000}
            step={500}
            className="mt-2"
          />
        </div>

        <div>
          <Label className="text-sm">失败概率: {failureProbability}%</Label>
          <Slider
            value={[failureProbability]}
            onValueChange={(v) => setFailureProbability(v[0])}
            min={0}
            max={100}
            step={10}
            className="mt-2"
          />
        </div>

        <div>
          <Label className="text-sm">题目数量</Label>
          <Input
            type="number"
            value={questionCount}
            onChange={(e) => setQuestionCount(Number.parseInt(e.target.value) || 1)}
            min={1}
            max={10}
            className="mt-2"
          />
        </div>

        <div className="border-t pt-4">
          <Label className="text-sm">存储空间: {usedStorage.toFixed(2)} MB</Label>
          <Button onClick={() => updateUsedStorage(-usedStorage)} variant="outline" size="sm" className="mt-2 w-full">
            清空存储
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleApply} className="flex-1">
            应用配置
          </Button>
          <Button onClick={handleReset} variant="outline" className="flex-1 bg-transparent">
            重置
          </Button>
        </div>

        <Button onClick={clearCurrentTask} variant="destructive" size="sm" className="w-full">
          清除当前任务
        </Button>
      </div>
    </Card>
  )
}
