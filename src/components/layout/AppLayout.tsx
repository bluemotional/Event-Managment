import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { Sidebar } from './Sidebar'
import { canEditActivities, canManageSystem } from '@/lib/access-control'
import { Dashboard } from '@/components/pages/Dashboard'
import { CreateEvent } from '@/components/pages/CreateEvent'
import { EventDetail } from '@/components/pages/EventDetail'
import { TaskBoard } from '@/components/pages/TaskBoard'
import { Members } from '@/components/pages/Members'
import { SettingsPage } from '@/components/pages/Settings'
import { ConsolePage } from '@/components/pages/Console'
import { TemplateManager } from '@/components/pages/TemplateManager'
import { DeployCheckPage } from '@/components/pages/DeployCheck'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck } from 'lucide-react'

export function AppLayout() {
  const {
    currentPage,
    selectedEventId,
    adminMemberIds,
    eventEditorMemberIds,
    viewerMode,
    currentMemberId,
    members,
    setCurrentPage,
    setCurrentMemberId,
    setSelectedEventId,
    setViewerMode,
  } = useAppStore()
  const canSeeAdminPages = canManageSystem(adminMemberIds, viewerMode, currentMemberId)
  const canSeeEditorPages = canEditActivities(eventEditorMemberIds, adminMemberIds, viewerMode, currentMemberId)

  useEffect(() => {
    const applyHashRoute = () => {
      const hash = window.location.hash.replace(/^#\/?/, '')
      if (!hash) return

      const [page, id] = hash.split('/')
      if (page === 'event' && id) {
        setSelectedEventId(id)
        return
      }
      if (page === 'recover') {
        setSelectedEventId(null)
        setViewerMode('console')
        if (!members.some((member) => member.id === currentMemberId) && members[0]) {
          setCurrentMemberId(members[0].id)
        }
        setCurrentPage('console')
        return
      }

      const pageMap: Record<string, string> = {
        dashboard: 'dashboard',
        create: 'create-event',
        tasks: 'tasks',
        members: 'members',
        templates: 'templates',
        console: 'console',
        deploy: 'deploy-check',
        settings: 'settings',
      }
      if (pageMap[page]) {
        setSelectedEventId(null)
        setCurrentPage(pageMap[page])
      }
    }

    applyHashRoute()
    window.addEventListener('hashchange', applyHashRoute)
    return () => window.removeEventListener('hashchange', applyHashRoute)
  }, [currentMemberId, members, setCurrentMemberId, setCurrentPage, setSelectedEventId, setViewerMode])

  const renderPage = () => {
    if (selectedEventId) return <EventDetail />
    if (['create-event', 'templates'].includes(currentPage) && !canSeeEditorPages) {
      return (
        <Card>
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">没有活动编辑权限</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              当前成员不能创建活动或维护模板。请让系统管理员或活动编辑者在团队成员里给你添加活动编辑权限。
            </p>
            <Button className="mt-5" onClick={() => {
              setSelectedEventId(null)
              setCurrentPage('dashboard')
              window.location.hash = '/dashboard'
            }}>
              回到仪表盘
            </Button>
          </CardContent>
        </Card>
      )
    }

    if (['console', 'deploy-check', 'settings'].includes(currentPage) && !canSeeAdminPages) {
      return (
        <Card>
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">没有系统管理权限</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              当前成员不能查看控制台、部署检查或系统设置。请让系统管理员在控制台里把你加入管理员白名单。
            </p>
            <Button className="mt-5" onClick={() => {
              setSelectedEventId(null)
              setCurrentPage('dashboard')
              window.location.hash = '/dashboard'
            }}>
              回到仪表盘
            </Button>
          </CardContent>
        </Card>
      )
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'create-event': return <CreateEvent />
      case 'tasks': return <TaskBoard />
      case 'members': return <Members />
      case 'templates': return <TemplateManager />
      case 'console': return <ConsolePage />
      case 'deploy-check': return <DeployCheckPage />
      case 'settings': return <SettingsPage />
      default: return <Dashboard />
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto animate-fade-in">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
