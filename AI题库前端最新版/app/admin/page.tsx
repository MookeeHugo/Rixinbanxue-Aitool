"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  FileUp,
  Database,
  Tags,
  Settings,
  Activity,
  Users,
  Ticket,
  BarChart3,
  Palette,
  FileText,
  Bell,
  Menu,
  X,
  Download,
  Clock,
} from "lucide-react"
import { AdminDashboard } from "@/components/admin/dashboard"
import { AdminUploadMonitor } from "@/components/admin/upload-monitor"
import { AdminQuestionBank } from "@/components/admin/question-bank"
import { AdminTagSystem } from "@/components/admin/tag-system"
import { AdminProviderManagement } from "@/components/admin/provider-management"
import { AdminAIPipeline } from "@/components/admin/ai-pipeline"
import { AdminMembership } from "@/components/admin/membership"
import { AdminInviteCode } from "@/components/admin/invite-code"
import { AdminUsageDashboard } from "@/components/admin/usage-dashboard"
import { AdminBranding } from "@/components/admin/branding"
import { AdminAuditLog } from "@/components/admin/audit-log"
import { AdminAlerts } from "@/components/admin/alerts"
import { AdminExportCenter } from "@/components/admin/export-center"
import { AdminTaskRecoveryManager } from "@/components/admin/task-recovery-manager" // Import AdminTaskRecoveryManager component
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { TaskRecoveryBanner } from "@/components/task-recovery-banner"

type TabType =
  | "dashboard"
  | "upload"
  | "questions"
  | "tags"
  | "provider"
  | "pipeline"
  | "membership"
  | "invite"
  | "usage"
  | "branding"
  | "audit"
  | "alerts"
  | "export"
  | "recovery" // Add recovery tab

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const menuItems = [
    { id: "dashboard", label: "仪表盘", icon: LayoutDashboard },
    { id: "upload", label: "上传监控", icon: FileUp },
    { id: "questions", label: "题库审核", icon: Database },
    { id: "tags", label: "标签管理", icon: Tags },
    { id: "provider", label: "API管理", icon: Settings },
    { id: "pipeline", label: "AI监控", icon: Activity },
    { id: "membership", label: "会员套餐", icon: Users },
    { id: "invite", label: "邀请码", icon: Ticket },
    { id: "usage", label: "用量统计", icon: BarChart3 },
    { id: "export", label: "导出中心", icon: Download },
    { id: "recovery", label: "任务恢复", icon: Clock }, // Add recovery menu item
    { id: "branding", label: "品牌定制", icon: Palette },
    { id: "audit", label: "审计日志", icon: FileText },
    { id: "alerts", label: "告警通知", icon: Bell },
  ]

  const getBreadcrumbItems = () => {
    const currentItem = menuItems.find((item) => item.id === activeTab)
    return currentItem ? [{ label: "后台管理" }, { label: currentItem.label }] : []
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard onNavigate={setActiveTab} />
      case "upload":
        return <AdminUploadMonitor />
      case "questions":
        return <AdminQuestionBank />
      case "tags":
        return <AdminTagSystem />
      case "provider":
        return <AdminProviderManagement />
      case "pipeline":
        return <AdminAIPipeline />
      case "membership":
        return <AdminMembership />
      case "invite":
        return <AdminInviteCode />
      case "usage":
        return <AdminUsageDashboard />
      case "export":
        return <AdminExportCenter />
      case "recovery": // Add recovery case
        return <AdminTaskRecoveryManager />
      case "branding":
        return <AdminBranding />
      case "audit":
        return <AdminAuditLog />
      case "alerts":
        return <AdminAlerts />
      default:
        return <AdminDashboard onNavigate={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <TaskRecoveryBanner />

      <aside
        className={`${sidebarOpen ? "w-64" : "w-0"} bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex-shrink-0`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">日</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-900">日新伴学</h2>
              <p className="text-xs text-gray-500">Admin R1.0</p>
            </div>
          </div>
        </div>

        <nav className="p-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                activeTab === item.id ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="text-xl font-bold text-gray-900">
              {menuItems.find((item) => item.id === activeTab)?.label}
            </h1>
          </div>

          <Button variant="outline" size="sm" onClick={() => router.push("/")}>
            返回首页
          </Button>
        </header>

        <div className="p-6 pb-0">
          <BreadcrumbNav items={getBreadcrumbItems()} />
        </div>

        <div className="flex-1 overflow-auto p-6 pt-0">{renderContent()}</div>
      </main>
    </div>
  )
}
