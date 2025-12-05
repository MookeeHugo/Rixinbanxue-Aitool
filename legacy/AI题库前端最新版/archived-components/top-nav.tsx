'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LayoutDashboard, User } from 'lucide-react'
import Image from 'next/image'

export function TopNav() {
  const router = useRouter()

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="日新伴学"
              width={40}
              height={40}
              className="rounded-full"
            />
            <h1 className="text-lg font-semibold text-gray-900">
              日新伴学AI题库系统
              <span className="text-blue-600 ml-1">R1.0</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">管理员</span>
              <Badge variant="success" className="text-xs">在线</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin')}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              后台管理
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
