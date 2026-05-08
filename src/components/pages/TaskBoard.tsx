import { useState } from 'react'
import { useAppStore } from '@/store'
import { canEditActivities, filterReadableEvents } from '@/lib/access-control'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TaskStatus } from '@/types'
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  AlertCircle,
  Filter,
  Search,
} from 'lucide-react'

export function TaskBoard() {
  const { events, members, eventAccess, adminMemberIds, eventEditorMemberIds, viewerMode, currentMemberId, updateTaskStatus } = useAppStore()
  const [filterEvent, setFilterEvent] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterMember, setFilterMember] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const readableEvents = filterReadableEvents(events, eventAccess, viewerMode, currentMemberId)
  const canEdit = canEditActivities(eventEditorMemberIds, adminMemberIds, viewerMode, currentMemberId)

  // Get all tasks across events
  const allTasks = readableEvents.flatMap((event) =>
    event.tasks.map((task) => ({
      ...task,
      eventTitle: event.title,
      eventId: event.id,
    }))
  )

  // Filter tasks
  const filteredTasks = allTasks.filter((task) => {
    if (filterEvent !== 'all' && task.eventId !== filterEvent) return false
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    if (filterMember === 'unassigned' && task.assigneeId) return false
    if (filterMember !== 'all' && filterMember !== 'unassigned' && task.assigneeId !== filterMember) return false
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  const statusTabs: { value: TaskStatus | 'all'; label: string; count: number }[] = [
    { value: 'all', label: '全部', count: allTasks.length },
    { value: 'pending', label: '待开始', count: allTasks.filter((t) => t.status === 'pending').length },
    { value: 'in_progress', label: '进行中', count: allTasks.filter((t) => t.status === 'in_progress').length },
    { value: 'completed', label: '已完成', count: allTasks.filter((t) => t.status === 'completed').length },
  ]

  const eventOptions = [
    { value: 'all', label: '所有活动' },
    ...readableEvents.map((event) => ({ value: event.id, label: event.title })),
  ]

  const memberOptions = [
    { value: 'all', label: '所有负责人' },
    { value: 'unassigned', label: '未分配' },
    ...members.map((member) => ({ value: member.id, label: member.name })),
  ]

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'in_progress': return <PlayCircle className="w-4 h-4 text-warning" />
      case 'overdue': return <AlertCircle className="w-4 h-4 text-urgent" />
      default: return <Circle className="w-4 h-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">任务面板</h1>
        <p className="text-muted-foreground mt-1">管理所有活动的筹备任务</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索任务..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Event filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            options={eventOptions}
            className="w-56"
            aria-label="按活动筛选"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${
                filterStatus === tab.value
                  ? 'bg-background text-foreground shadow-elegant'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Member filter */}
        <div className="flex items-center gap-2">
          <Select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            options={memberOptions}
            className="w-36"
            aria-label="按负责人筛选"
          />
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {viewerMode === 'public' ? '公开展示模式不会显示真实任务数据' : '没有符合筛选条件的任务'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const assignee = members.find((m) => m.id === task.assigneeId)
            const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date()

            return (
              <Card
                key={task.id}
                className={`transition-smooth ${isOverdue ? 'border-urgent/30' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <button
                      disabled={!canEdit}
                      onClick={() => {
                        if (!canEdit) return
                        const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'completed']
                        const currentIndex = statusOrder.indexOf(task.status)
                        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
                        updateTaskStatus(task.eventId, task.id, nextStatus)
                      }}
                      className="transition-smooth hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {getStatusIcon(isOverdue && task.status !== 'completed' ? 'overdue' : task.status)}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {task.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.eventTitle}</p>
                    </div>

                    {assignee && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs">
                          {assignee.name.charAt(0)}
                        </div>
                        <span className="text-xs text-muted-foreground">{assignee.name}</span>
                      </div>
                    )}

                    <span className={`text-xs whitespace-nowrap ${isOverdue ? 'text-urgent font-medium' : 'text-muted-foreground'}`}>
                      {task.dueDate}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
