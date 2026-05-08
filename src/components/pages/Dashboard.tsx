import { useAppStore } from '@/store'
import { canEditActivities, filterReadableEvents } from '@/lib/access-control'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getEventTypeLabel } from '@/types'
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  MapPin,
} from 'lucide-react'

function getCountdown(dateStr: string): { days: number; label: string; urgent: boolean } {
  const now = new Date()
  const target = new Date(dateStr)
  const diff = target.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  if (days < 0) return { days: Math.abs(days), label: `已过 ${Math.abs(days)} 天`, urgent: false }
  if (days === 0) return { days: 0, label: '今天', urgent: true }
  if (days === 1) return { days: 1, label: '明天', urgent: true }
  return { days, label: `${days} 天后`, urgent: days <= 7 }
}

export function Dashboard() {
  const { events, members, eventAccess, adminMemberIds, eventEditorMemberIds, viewerMode, currentMemberId, setSelectedEventId, setCurrentPage } = useAppStore()
  const readableEvents = filterReadableEvents(events, eventAccess, viewerMode, currentMemberId)
  const canEdit = canEditActivities(eventEditorMemberIds, adminMemberIds, viewerMode, currentMemberId)

  const upcomingEvents = readableEvents
    .filter((e) => new Date(e.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  const totalTasks = readableEvents.reduce((sum, e) => sum + e.tasks.length, 0)
  const completedTasks = readableEvents.reduce(
    (sum, e) => sum + e.tasks.filter((t) => t.status === 'completed').length,
    0
  )
  const inProgressTasks = readableEvents.reduce(
    (sum, e) => sum + e.tasks.filter((t) => t.status === 'in_progress').length,
    0
  )
  const overdueTasks = readableEvents.reduce(
    (sum, e) => sum + e.tasks.filter((t) => {
      return t.status !== 'completed' && new Date(t.dueDate) < new Date()
    }).length,
    0
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">仪表盘</h1>
          <p className="text-muted-foreground mt-1">活动筹备进度一览</p>
        </div>
        {canEdit && (
        <Button onClick={() => {
          setCurrentPage('create-event')
          window.location.hash = '/create'
        }}>
          <Calendar className="w-4 h-4 mr-2" />
          创建新活动
        </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">活动总数</p>
                <p className="text-2xl font-bold text-foreground mt-1">{readableEvents.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已完成任务</p>
                <p className="text-2xl font-bold text-foreground mt-1">{completedTasks}/{totalTasks}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">进行中</p>
                <p className="text-2xl font-bold text-foreground mt-1">{inProgressTasks}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已逾期</p>
                <p className="text-2xl font-bold text-foreground mt-1">{overdueTasks}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-urgent/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-urgent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">即将到来的活动</h2>
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {viewerMode === 'public' ? '公开展示模式不会显示真实活动数据' : '暂无即将到来的活动'}
                </p>
                {canEdit && (
                <Button className="mt-4" onClick={() => {
                  setCurrentPage('create-event')
                  window.location.hash = '/create'
                }}>
                  创建第一个活动
                </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            upcomingEvents.map((event) => {
              const countdown = getCountdown(event.startDate)
              const completedCount = event.tasks.filter((t) => t.status === 'completed').length
              const progress = event.tasks.length > 0 ? (completedCount / event.tasks.length) * 100 : 0

              return (
                <Card
                  key={event.id}
                  className="cursor-pointer hover:border-primary/30"
                  onClick={() => {
                    setSelectedEventId(event.id)
                    window.location.hash = `/event/${event.id}`
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-foreground">{event.title}</h3>
                          <Badge>{getEventTypeLabel(event.type)}</Badge>
                          {countdown.urgent && (
                            <Badge variant="urgent" className="animate-pulse-gentle">
                              紧急
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {event.startDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.location}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full gradient-primary rounded-full transition-smooth"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {completedCount}/{event.tasks.length} 已完成
                          </span>
                        </div>
                      </div>
                      
                      <div className="ml-6 text-right">
                        <div className={`text-2xl font-bold ${countdown.urgent ? 'text-urgent animate-countdown' : 'text-primary'}`}>
                          {countdown.days === 0 ? '今天' : countdown.days}
                        </div>
                        {countdown.days > 0 && (
                          <p className="text-xs text-muted-foreground">天后开始</p>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground mt-2 ml-auto" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Team Overview */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">团队工作量</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {members.slice(0, 6).map((member) => {
            const memberTasks = readableEvents.flatMap((e) =>
              e.tasks.filter((t) => t.assigneeId === member.id)
            )
            const memberCompleted = memberTasks.filter((t) => t.status === 'completed').length
            const memberPending = memberTasks.filter((t) => t.status !== 'completed').length

            return (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{memberPending}</p>
                      <p className="text-xs text-muted-foreground">待办</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
