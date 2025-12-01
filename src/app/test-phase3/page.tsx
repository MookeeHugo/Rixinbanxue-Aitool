'use client'

import { useState } from 'react'
import { LatexEditor } from '@/components/latex-editor'
import { ImagePositionEditor, useImagePositionEditor, type ImageItem } from '@/components/image-position-editor'
import { processImage, processAndSaveImage } from '@/app/actions/image-processing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Upload, Loader2 } from 'lucide-react'

export default function TestPhase3Page() {
  const { toast } = useToast()

  // LaTeX 编辑器状态
  const [latex, setLatex] = useState('\\frac{a}{b} + \\sqrt{x^2 + y^2}')

  // 图片处理状态
  const [processingImage, setProcessingImage] = useState(false)
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('')

  // 图片拖拽状态
  const { images, addImage, removeImage, reorderImages } = useImagePositionEditor([
    {
      id: '1',
      url: '/test-image-1.jpg',
      title: '测试图片 1',
      width: 800,
      height: 600
    },
    {
      id: '2',
      url: '/test-image-2.jpg',
      title: '测试图片 2',
      width: 800,
      height: 600
    }
  ])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessingImage(true)
    setProcessedImageUrl('')

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string

        // 测试图片处理
        const result = await processImage(base64, {
          sharpen: 30,
          resize: { width: 800, fit: 'inside' },
          format: 'png',
          quality: 90
        })

        if (result.success && result.data) {
          setProcessedImageUrl(result.data.base64)

          // 添加到拖拽列表
          addImage({
            id: Date.now().toString(),
            url: result.data.base64,
            title: file.name,
            width: result.data.width,
            height: result.data.height
          })

          toast({
            title: '图片处理成功',
            description: `尺寸: ${result.data.width}x${result.data.height}`
          })
        } else {
          toast({
            title: '图片处理失败',
            description: result.error,
            variant: 'destructive'
          })
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setProcessingImage(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl" data-testid="phase3-test-page">
      <h1 className="text-3xl font-bold mb-6">Phase 3: 高级编辑工具测试</h1>

      <Tabs defaultValue="latex" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="latex" data-testid="tab-latex">LaTeX 编辑器</TabsTrigger>
          <TabsTrigger value="image-process" data-testid="tab-image-process">图片处理</TabsTrigger>
          <TabsTrigger value="image-drag" data-testid="tab-image-drag">图片拖拽</TabsTrigger>
        </TabsList>

        {/* LaTeX 编辑器测试 */}
        <TabsContent value="latex" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LaTeX 可视化编辑器</CardTitle>
              <CardDescription>
                测试公式输入、预览和符号工具栏功能
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LatexEditor
                value={latex}
                onChange={setLatex}
                showToolbar={true}
                height={200}
                placeholder="输入 LaTeX 公式..."
                data-testid="latex-editor"
              />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">当前公式值：</h4>
                <pre
                  className="p-3 bg-muted rounded-md text-sm overflow-x-auto"
                  data-testid="latex-value"
                >
                  {latex}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLatex('\\int_{a}^{b} f(x) dx')}
                  data-testid="latex-preset-integral"
                >
                  测试：积分公式
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLatex('\\sum_{i=1}^{n} x_i')}
                  data-testid="latex-preset-sum"
                >
                  测试：求和公式
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLatex('')}
                  data-testid="latex-clear"
                >
                  清空
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 图片处理测试 */}
        <TabsContent value="image-process" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>图片处理功能</CardTitle>
              <CardDescription>
                测试图片降噪、锐化、调整尺寸等功能
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={processingImage}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    disabled:opacity-50"
                  data-testid="image-upload-input"
                />
                {processingImage && (
                  <Loader2 className="h-4 w-4 animate-spin" data-testid="processing-spinner" />
                )}
              </div>

              {processedImageUrl && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">处理后的图片：</h4>
                  <div className="border rounded-md p-4 bg-muted/30">
                    <img
                      src={processedImageUrl}
                      alt="处理后的图片"
                      className="max-w-full h-auto"
                      data-testid="processed-image"
                    />
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                上传图片后将自动应用以下处理：
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>锐化强度: 30</li>
                  <li>调整尺寸: 宽度 800px（保持比例）</li>
                  <li>输出格式: PNG</li>
                  <li>质量: 90</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 图片拖拽测试 */}
        <TabsContent value="image-drag" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>图片拖拽排序</CardTitle>
              <CardDescription>
                测试拖拽改变图片顺序、删除图片等功能
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImagePositionEditor
                images={images}
                onChange={reorderImages}
                onDelete={removeImage}
                layout="grid"
                columns={3}
                showDelete={true}
                showPreview={true}
                imageSize="md"
                data-testid="image-position-editor"
              />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">当前图片顺序：</h4>
                <div
                  className="p-3 bg-muted rounded-md text-sm space-y-1"
                  data-testid="image-order-display"
                >
                  {images.map((img, idx) => (
                    <div key={img.id} className="flex items-center gap-2">
                      <span className="font-mono">{idx + 1}.</span>
                      <span>{img.title || img.id}</span>
                      <span className="text-muted-foreground text-xs">
                        ({img.width}x{img.height})
                      </span>
                    </div>
                  ))}
                  {images.length === 0 && (
                    <div className="text-muted-foreground">暂无图片</div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    addImage({
                      id: Date.now().toString(),
                      url: `/test-image-${Date.now()}.jpg`,
                      title: `新图片 ${images.length + 1}`,
                      width: 800,
                      height: 600
                    })
                  }}
                  data-testid="add-test-image"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  添加测试图片
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
