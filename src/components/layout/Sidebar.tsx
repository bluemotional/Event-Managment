import { useAppStore } from '@/store'
import {
  LayoutDashboard,
  CalendarPlus,
  ListTodo,
  Users,
  LayoutTemplate,
  Rocket,
  ShieldCheck,
  Settings,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { canEditActivities, canManageSystem } from '@/lib/access-control'

const navItems = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
  { id: 'create-event', label: '创建活动', icon: CalendarPlus, editorOnly: true },
  { id: 'tasks', label: '任务面板', icon: ListTodo },
  { id: 'members', label: '团队成员', icon: Users },
  { id: 'templates', label: '模板管理', icon: LayoutTemplate, editorOnly: true },
  { id: 'console', label: '控制台', icon: ShieldCheck, adminOnly: true },
  { id: 'deploy-check', label: '部署检查', icon: Rocket, adminOnly: true },
  { id: 'settings', label: '系统设置', icon: Settings, adminOnly: true },
]

export function Sidebar() {
  const { currentPage, members, viewerMode, currentMemberId, adminMemberIds, eventEditorMemberIds, setCurrentPage, setSelectedEventId } = useAppStore()
  const currentMember = members.find((member) => member.id === currentMemberId)
  const canSeeAdminPages = canManageSystem(adminMemberIds, viewerMode, currentMemberId)
  const canSeeEditorPages = canEditActivities(eventEditorMemberIds, adminMemberIds, viewerMode, currentMemberId)

  return (
    <aside className="w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-primary-glow">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-primary-foreground">活动管家</h1>
            <p className="text-xs text-sidebar-foreground/60">智能筹备管理</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.filter((item) =>
          (!item.adminOnly || canSeeAdminPages) &&
          (!item.editorOnly || canSeeEditorPages)
        ).map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id)
                setSelectedEventId(null)
                const route = item.id === 'create-event' ? 'create' : item.id === 'deploy-check' ? 'deploy' : item.id
                window.location.hash = `/${route}`
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                isActive
                  ? "bg-sidebar-active text-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border/50"
              )}
            >
              <Icon className="w-4.5 h-4.5" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="space-y-2 text-xs text-sidebar-foreground/60">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${viewerMode === 'public' ? 'bg-warning' : 'bg-success'} animate-pulse-gentle`} />
            {viewerMode === 'console' ? '控制台视图' : viewerMode === 'member' ? '成员视图' : '公开展示视图'}
          </div>
          <div className="truncate">
            {viewerMode === 'public' ? '未选择成员' : currentMember ? `${currentMember.name} · ${currentMember.role}` : '身份未设置'}
          </div>
        </div>
      </div>
    </aside>
  )
}
