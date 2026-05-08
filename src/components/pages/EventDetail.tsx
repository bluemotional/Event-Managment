import { useState } from 'react'
import type { ComponentType } from 'react'
import { useAppStore } from '@/store'
import { canEditActivities, canReadEvent } from '@/lib/access-control'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  getEventTypeLabel,
  MATERIAL_STATUS_LABELS,
  MaterialStatus,
  TaskStatus,
} from '@/types'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  FolderOpen,
  MapPin,
  Package,
  Paperclip,
  PlayCircle,
  Plus,
  ReceiptText,
  Trash2,
  Users,
} from 'lucide-react'

type DetailTab = 'tasks' | 'budget' | 'materials' | 'guests' | 'copy' | 'attachments'

const materialStatusOptions = [
  { value: 'needed', label: '待准备' },
  { value: 'ordered', label: '采购中' },
  { value: 'ready', label: '已就绪' },
  { value: 'used', label: '已使用' },
]

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-5 h-5 text-success" />
    case 'in_progress': return <PlayCircle className="w-5 h-5 text-warning" />
    case 'overdue': return <AlertCircle className="w-5 h-5 text-urgent" />
    default: return <Circle className="w-5 h-5 text-muted-foreground" />
  }
}

export function EventDetail() {
  const store = useAppStore()
  const {
    events,
    members,
    eventAccess,
    adminMemberIds,
    eventEditorMemberIds,
    viewerMode,
    currentMemberId,
    selectedEventId,
    setSelectedEventId,
    deleteEvent,
    updateTaskStatus,
    updateTask,
    addTask,
    deleteTask,
    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    addMaterialItem,
    updateMaterialItem,
    deleteMaterialItem,
    addGuestRecord,
    updateGuestRecord,
    deleteGuestRecord,
    addCopyRecord,
    updateCopyRecord,
    deleteCopyRecord,
    addAttachment,
    updateAttachment,
    deleteAttachment,
  } = store

  const event = events.find((item) => item.id === selectedEventId)
  const [activeTab, setActiveTab] = useState<DetailTab>('tasks')
  const [newTask, setNewTask] = useState({ title: '', dueDate: todayKey() })
  const [budgetDraft, setBudgetDraft] = useState({ title: '', category: '', estimatedAmount: '', actualAmount: '', ownerId: '', note: '' })
  const [materialDraft, setMaterialDraft] = useState({ name: '', quantity: '', ownerId: '', status: 'needed' as MaterialStatus, note: '' })
  const [guestDraft, setGuestDraft] = useState({ name: '', organization: '', role: '', contact: '', status: '', note: '' })
  const [copyDraft, setCopyDraft] = useState({ title: '', channel: '', content: '', ownerId: '' })
  const [attachmentDraft, setAttachmentDraft] = useState({ name: '', url: '', fileType: '', sizeMb: '', note: '' })

  if (!event) return null

  const canRead = canReadEvent(event, eventAccess, viewerMode, currentMemberId)
  const canEdit = canEditActivities(eventEditorMemberIds, adminMemberIds, viewerMode, currentMemberId)

  if (!canRead) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setSelectedEventId(null)
            window.location.hash = '/dashboard'
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-fast"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <Card>
          <CardContent className="p-10 text-center">
            <AlertCircle className="w-10 h-10 text-warning mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground">没有该活动的阅读权限</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              当前视图不能查看真实活动信息。请在控制台为成员分配活动，或切换到控制台模式。
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completedCount = event.tasks.filter((task) => task.status === 'completed').length
  const progress = event.tasks.length > 0 ? (completedCount / event.tasks.length) * 100 : 0
  const memberOptions = [{ value: '', label: '未分配' }, ...members.map((member) => ({ value: member.id, label: member.name }))]
  const tabs: { id: DetailTab; label: string; icon: ComponentType<{ className?: string }>; count: number }[] = [
    { id: 'tasks', label: '任务', icon: CheckCircle2, count: event.tasks.length },
    { id: 'budget', label: '预算', icon: ReceiptText, count: event.budgets?.length || 0 },
    { id: 'materials', label: '物料', icon: Package, count: event.materials?.length || 0 },
    { id: 'guests', label: '嘉宾', icon: Users, count: event.guests?.length || 0 },
    { id: 'copy', label: '文案', icon: FileText, count: event.copyDocs?.length || 0 },
    { id: 'attachments', label: '附件', icon: Paperclip, count: event.attachments?.length || 0 },
  ]

  const cycleStatus = (taskId: string, currentStatus: TaskStatus) => {
    if (!canEdit) return
    const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'completed']
    const currentIndex = Math.max(statusOrder.indexOf(currentStatus), 0)
    updateTaskStatus(event.id, taskId, statusOrder[(currentIndex + 1) % statusOrder.length])
  }

  const addTaskFromDraft = () => {
    if (!newTask.title.trim() || !newTask.dueDate) return
    const daysBeforeEvent = Math.ceil((new Date(event.startDate).getTime() - new Date(newTask.dueDate).getTime()) / 86400000)
    addTask(event.id, {
      eventId: event.id,
      title: newTask.title.trim(),
      description: '',
      assigneeId: '',
      status: 'pending',
      priority: 'medium',
      dueDate: newTask.dueDate,
      daysBeforeEvent,
      reminderSent: false,
    })
    setNewTask({ title: '', dueDate: todayKey() })
  }

  const addBudgetFromDraft = () => {
    if (!budgetDraft.title.trim()) return
    addBudgetItem(event.id, {
      title: budgetDraft.title.trim(),
      category: budgetDraft.category.trim(),
      estimatedAmount: Number(budgetDraft.estimatedAmount) || 0,
      actualAmount: Number(budgetDraft.actualAmount) || 0,
      ownerId: budgetDraft.ownerId,
      note: budgetDraft.note.trim(),
    })
    setBudgetDraft({ title: '', category: '', estimatedAmount: '', actualAmount: '', ownerId: '', note: '' })
  }

  const addMaterialFromDraft = () => {
    if (!materialDraft.name.trim()) return
    addMaterialItem(event.id, { ...materialDraft, name: materialDraft.name.trim(), note: materialDraft.note.trim() })
    setMaterialDraft({ name: '', quantity: '', ownerId: '', status: 'needed', note: '' })
  }

  const addGuestFromDraft = () => {
    if (!guestDraft.name.trim()) return
    addGuestRecord(event.id, { ...guestDraft, name: guestDraft.name.trim(), note: guestDraft.note.trim() })
    setGuestDraft({ name: '', organization: '', role: '', contact: '', status: '', note: '' })
  }

  const addCopyFromDraft = () => {
    if (!copyDraft.title.trim()) return
    addCopyRecord(event.id, { ...copyDraft, title: copyDraft.title.trim() })
    setCopyDraft({ title: '', channel: '', content: '', ownerId: '' })
  }

  const addAttachmentFromDraft = () => {
    if (!attachmentDraft.name.trim() || !attachmentDraft.url.trim()) return
    addAttachment(event.id, {
      name: attachmentDraft.name.trim(),
      url: attachmentDraft.url.trim(),
      fileType: attachmentDraft.fileType.trim(),
      sizeBytes: Math.round((Number(attachmentDraft.sizeMb) || 0) * 1024 * 1024),
      note: attachmentDraft.note.trim(),
    })
    setAttachmentDraft({ name: '', url: '', fileType: '', sizeMb: '', note: '' })
  }

  const handleDeleteEvent = () => {
    if (!canEdit) return
    if (!window.confirm(`确定删除活动「${event.title}」吗？活动下的任务、预算、物料、嘉宾、文案和附件记录都会一起删除。`)) return
    deleteEvent(event.id)
    setSelectedEventId(null)
    window.location.hash = '/dashboard'
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => {
          setSelectedEventId(null)
          window.location.hash = '/dashboard'
        }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-fast"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
            <Badge>{getEventTypeLabel(event.type)}</Badge>
          </div>
          {event.theme && <p className="text-muted-foreground mt-1">主题：{event.theme}</p>}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{event.startDate}</span>
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{event.location || '地点待定'}</span>
          </div>
        </div>
        {canEdit && (
          <Button variant="destructive" onClick={handleDeleteEvent}>
            <Trash2 className="w-4 h-4 mr-2" />
            删除活动
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">筹备进度</span>
            <span className="text-sm text-muted-foreground">{completedCount}/{event.tasks.length} 完成</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div className="h-full gradient-primary rounded-full transition-smooth" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-fast whitespace-nowrap ${
                active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className="text-xs rounded-full bg-secondary px-1.5 py-0.5">{tab.count}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {canEdit && (
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <Input placeholder="新增任务名称" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                <Button onClick={addTaskFromDraft}><Plus className="w-4 h-4 mr-1" />添加</Button>
              </div>
            </CardContent>
          </Card>
          )}

          {[...event.tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((task) => {
            const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date(todayKey())
            const displayStatus = isOverdue ? 'overdue' : task.status
            return (
              <Card key={task.id} className={isOverdue ? 'border-urgent/30 bg-urgent/5' : ''}>
                <CardContent className="p-4">
                  <div className="grid gap-3 lg:grid-cols-[auto_1fr_150px_140px_auto] lg:items-center">
                    <button disabled={!canEdit} onClick={() => cycleStatus(task.id, task.status)} className="transition-smooth hover:scale-110 justify-self-start disabled:cursor-not-allowed">
                      {getStatusIcon(displayStatus)}
                    </button>
                    <Input disabled={!canEdit} value={task.title} onChange={(e) => updateTask(event.id, task.id, { title: e.target.value })} />
                    <Select disabled={!canEdit} value={task.assigneeId} onChange={(e) => updateTask(event.id, task.id, { assigneeId: e.target.value })} options={memberOptions} />
                    <Input disabled={!canEdit} type="date" value={task.dueDate} onChange={(e) => updateTask(event.id, task.id, { dueDate: e.target.value })} />
                    {canEdit && (
                    <button onClick={() => deleteTask(event.id, task.id)} className="p-2 text-muted-foreground hover:text-urgent justify-self-start">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{isOverdue ? '已逾期' : '截止'}：{task.dueDate}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {activeTab === 'budget' && (
        <div className="space-y-3">
          <Card><CardContent className="p-4 grid gap-3 lg:grid-cols-[1fr_120px_120px_120px_150px]">
            <Input placeholder="预算项" value={budgetDraft.title} onChange={(e) => setBudgetDraft({ ...budgetDraft, title: e.target.value })} />
            <Input placeholder="分类" value={budgetDraft.category} onChange={(e) => setBudgetDraft({ ...budgetDraft, category: e.target.value })} />
            <Input placeholder="预估金额" type="number" value={budgetDraft.estimatedAmount} onChange={(e) => setBudgetDraft({ ...budgetDraft, estimatedAmount: e.target.value })} />
            <Input placeholder="实际金额" type="number" value={budgetDraft.actualAmount} onChange={(e) => setBudgetDraft({ ...budgetDraft, actualAmount: e.target.value })} />
            <Button onClick={addBudgetFromDraft}><Plus className="w-4 h-4 mr-1" />添加预算</Button>
          </CardContent></Card>
          {(event.budgets || []).map((item) => (
            <Card key={item.id}><CardContent className="p-4 grid gap-3 lg:grid-cols-[1fr_120px_120px_120px_150px_auto] lg:items-center">
              <Input value={item.title} onChange={(e) => updateBudgetItem(event.id, item.id, { title: e.target.value })} />
              <Input value={item.category} onChange={(e) => updateBudgetItem(event.id, item.id, { category: e.target.value })} />
              <Input type="number" value={item.estimatedAmount} onChange={(e) => updateBudgetItem(event.id, item.id, { estimatedAmount: Number(e.target.value) || 0 })} />
              <Input type="number" value={item.actualAmount} onChange={(e) => updateBudgetItem(event.id, item.id, { actualAmount: Number(e.target.value) || 0 })} />
              <Select value={item.ownerId} onChange={(e) => updateBudgetItem(event.id, item.id, { ownerId: e.target.value })} options={memberOptions} />
              <button onClick={() => deleteBudgetItem(event.id, item.id)} className="p-2 text-muted-foreground hover:text-urgent"><Trash2 className="w-4 h-4" /></button>
            </CardContent></Card>
          ))}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-3">
          <Card><CardContent className="p-4 grid gap-3 lg:grid-cols-[1fr_120px_150px_130px_auto]">
            <Input placeholder="物料名称" value={materialDraft.name} onChange={(e) => setMaterialDraft({ ...materialDraft, name: e.target.value })} />
            <Input placeholder="数量" value={materialDraft.quantity} onChange={(e) => setMaterialDraft({ ...materialDraft, quantity: e.target.value })} />
            <Select value={materialDraft.ownerId} onChange={(e) => setMaterialDraft({ ...materialDraft, ownerId: e.target.value })} options={memberOptions} />
            <Select value={materialDraft.status} onChange={(e) => setMaterialDraft({ ...materialDraft, status: e.target.value as MaterialStatus })} options={materialStatusOptions} />
            <Button onClick={addMaterialFromDraft}><Plus className="w-4 h-4 mr-1" />添加物料</Button>
          </CardContent></Card>
          {(event.materials || []).map((item) => (
            <Card key={item.id}><CardContent className="p-4 grid gap-3 lg:grid-cols-[1fr_120px_150px_130px_auto] lg:items-center">
              <Input value={item.name} onChange={(e) => updateMaterialItem(event.id, item.id, { name: e.target.value })} />
              <Input value={item.quantity} onChange={(e) => updateMaterialItem(event.id, item.id, { quantity: e.target.value })} />
              <Select value={item.ownerId} onChange={(e) => updateMaterialItem(event.id, item.id, { ownerId: e.target.value })} options={memberOptions} />
              <Select value={item.status} onChange={(e) => updateMaterialItem(event.id, item.id, { status: e.target.value as MaterialStatus })} options={materialStatusOptions} />
              <button onClick={() => deleteMaterialItem(event.id, item.id)} className="p-2 text-muted-foreground hover:text-urgent"><Trash2 className="w-4 h-4" /></button>
              <p className="text-xs text-muted-foreground lg:col-span-5">{MATERIAL_STATUS_LABELS[item.status]} {item.note}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {activeTab === 'guests' && (
        <div className="space-y-3">
          <Card><CardContent className="p-4 grid gap-3 lg:grid-cols-[1fr_1fr_120px_150px_auto]">
            <Input placeholder="姓名" value={guestDraft.name} onChange={(e) => setGuestDraft({ ...guestDraft, name: e.target.value })} />
            <Input placeholder="组织/公司" value={guestDraft.organization} onChange={(e) => setGuestDraft({ ...guestDraft, organization: e.target.value })} />
            <Input placeholder="角色" value={guestDraft.role} onChange={(e) => setGuestDraft({ ...guestDraft, role: e.target.value })} />
            <Input placeholder="状态" value={guestDraft.status} onChange={(e) => setGuestDraft({ ...guestDraft, status: e.target.value })} />
            <Button onClick={addGuestFromDraft}><Plus className="w-4 h-4 mr-1" />添加嘉宾</Button>
          </CardContent></Card>
          {(event.guests || []).map((item) => (
            <Card key={item.id}><CardContent className="p-4 grid gap-3 lg:grid-cols-[1fr_1fr_120px_150px_auto] lg:items-center">
              <Input value={item.name} onChange={(e) => updateGuestRecord(event.id, item.id, { name: e.target.value })} />
              <Input value={item.organization} onChange={(e) => updateGuestRecord(event.id, item.id, { organization: e.target.value })} />
              <Input value={item.role} onChange={(e) => updateGuestRecord(event.id, item.id, { role: e.target.value })} />
              <Input value={item.status} onChange={(e) => updateGuestRecord(event.id, item.id, { status: e.target.value })} />
              <button onClick={() => deleteGuestRecord(event.id, item.id)} className="p-2 text-muted-foreground hover:text-urgent"><Trash2 className="w-4 h-4" /></button>
            </CardContent></Card>
          ))}
        </div>
      )}

      {activeTab === 'copy' && (
        <div className="space-y-3">
          <Card><CardContent className="p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
              <Input placeholder="文案标题" value={copyDraft.title} onChange={(e) => setCopyDraft({ ...copyDraft, title: e.target.value })} />
              <Input placeholder="渠道" value={copyDraft.channel} onChange={(e) => setCopyDraft({ ...copyDraft, channel: e.target.value })} />
              <Select value={copyDraft.ownerId} onChange={(e) => setCopyDraft({ ...copyDraft, ownerId: e.target.value })} options={memberOptions} />
              <Button onClick={addCopyFromDraft}><Plus className="w-4 h-4 mr-1" />添加文案</Button>
            </div>
            <Textarea placeholder="文案内容" value={copyDraft.content} onChange={(e) => setCopyDraft({ ...copyDraft, content: e.target.value })} />
          </CardContent></Card>
          {(event.copyDocs || []).map((item) => (
            <Card key={item.id}><CardContent className="p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
                <Input value={item.title} onChange={(e) => updateCopyRecord(event.id, item.id, { title: e.target.value })} />
                <Input value={item.channel} onChange={(e) => updateCopyRecord(event.id, item.id, { channel: e.target.value })} />
                <Select value={item.ownerId} onChange={(e) => updateCopyRecord(event.id, item.id, { ownerId: e.target.value })} options={memberOptions} />
                <button onClick={() => deleteCopyRecord(event.id, item.id)} className="p-2 text-muted-foreground hover:text-urgent"><Trash2 className="w-4 h-4" /></button>
              </div>
              <Textarea value={item.content} onChange={(e) => updateCopyRecord(event.id, item.id, { content: e.target.value })} />
            </CardContent></Card>
          ))}
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="space-y-3">
          <Card><CardContent className="p-4 grid gap-3 lg:grid-cols-[1fr_1.5fr_120px_120px_auto]">
            <Input placeholder="文件名称" value={attachmentDraft.name} onChange={(e) => setAttachmentDraft({ ...attachmentDraft, name: e.target.value })} />
            <Input placeholder="本地阶段可先贴链接；上线后接 Supabase Storage" value={attachmentDraft.url} onChange={(e) => setAttachmentDraft({ ...attachmentDraft, url: e.target.value })} />
            <Input placeholder="类型" value={attachmentDraft.fileType} onChange={(e) => setAttachmentDraft({ ...attachmentDraft, fileType: e.target.value })} />
            <Input placeholder="大小 MB" type="number" value={attachmentDraft.sizeMb} onChange={(e) => setAttachmentDraft({ ...attachmentDraft, sizeMb: e.target.value })} />
            <Button onClick={addAttachmentFromDraft}><Plus className="w-4 h-4 mr-1" />添加附件</Button>
          </CardContent></Card>
          {(event.attachments || []).map((item) => (
            <Card key={item.id}><CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center">
              <FolderOpen className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <Input value={item.name} onChange={(e) => updateAttachment(event.id, item.id, { name: e.target.value })} />
                <a className="text-xs text-primary hover:underline" href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
              </div>
              <span className="text-xs text-muted-foreground">{item.fileType || '文件'} · {(item.sizeBytes / 1024 / 1024).toFixed(1)}MB</span>
              <button onClick={() => deleteAttachment(event.id, item.id)} className="p-2 text-muted-foreground hover:text-urgent"><Trash2 className="w-4 h-4" /></button>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  )
}
