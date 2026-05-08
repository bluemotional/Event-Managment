import { useState, useMemo } from 'react'
import { useAppStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { EventType, TaskPriority, EventTask } from '@/types'
import {
  Calendar,
  MapPin,
  Tag,
  FileText,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  X,
  ChevronUp,
  ChevronDown,
  Plus,
  Library,
  LayoutTemplate,
  Edit3,
  Trash2,
} from 'lucide-react'

// 动态导入 lucide 图标
import * as LucideIcons from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icons = LucideIcons as unknown as Record<string, React.ComponentType<any>>

interface DraftTask {
  id: string // 临时 ID，用于列表管理
  title: string
  description: string
  daysBeforeEvent: number
  priority: TaskPriority
  source: 'template' | 'library' | 'custom' // 来源标识
  libraryTaskId?: string // 如果是来自任务库，记录原始 ID
}

export function CreateEvent() {
  const { addEvent, setCurrentPage, eventTemplates, taskLibrary } = useAppStore()
  const [step, setStep] = useState(1)
  
  // 步骤1：选择模板
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  
  // 步骤2：表单数据
  const [formData, setFormData] = useState({
    title: '',
    type: 'meetup' as EventType,
    theme: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
  })
  
  // 步骤3：任务列表（草稿状态）
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([])
  const [showTaskLibrary, setShowTaskLibrary] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskTitle, setEditingTaskTitle] = useState('')
  
  // 自定义任务表单
  const [showCustomTaskForm, setShowCustomTaskForm] = useState(false)
  const [customTaskTitle, setCustomTaskTitle] = useState('')
  const [customTaskDays, setCustomTaskDays] = useState(7)
  
  const [created, setCreated] = useState(false)

  // 获取模板列表
  const templates = eventTemplates
  
  const taskCategories = useMemo(
    () => Array.from(new Set(taskLibrary.map((task) => task.category))).sort(),
    [taskLibrary]
  )
  
  // 根据模板 ID 获取图标组件
  const getIconComponent = (iconName: string) => {
    return Icons[iconName] || Icons.Sparkles
  }

  // 计算截止日期
  const calculateDueDate = (daysBeforeEvent: number): string => {
    if (!formData.startDate) return ''
    const startDate = new Date(formData.startDate)
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() - daysBeforeEvent)
    return dueDate.toISOString().split('T')[0]
  }

  // 从模板加载任务
  const loadTasksFromTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId)
    if (!template) {
      setDraftTasks([])
      return
    }
    
    const libraryTasks = template.taskIds
      .map((taskId) => taskLibrary.find((task) => task.id === taskId))
      .filter((task): task is typeof taskLibrary[number] => Boolean(task))
    const tasks: DraftTask[] = libraryTasks.map((task) => ({
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: task.title,
      description: task.description,
      daysBeforeEvent: task.defaultDaysBeforeEvent,
      priority: task.defaultPriority,
      source: 'template',
      libraryTaskId: task.id,
    }))
    
    setDraftTasks(tasks)
  }

  // 选择模板
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setFormData((prev) => ({ ...prev, type: templateId as EventType }))
    loadTasksFromTemplate(templateId)
  }

  // 删除任务
  const handleDeleteTask = (taskId: string) => {
    setDraftTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  // 从任务库添加任务
  const handleAddFromLibrary = (libraryTask: typeof taskLibrary[0]) => {
    // 检查是否已存在
    const exists = draftTasks.some((t) => t.libraryTaskId === libraryTask.id)
    if (exists) return
    
    const newTask: DraftTask = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: libraryTask.title,
      description: libraryTask.description,
      daysBeforeEvent: libraryTask.defaultDaysBeforeEvent,
      priority: libraryTask.defaultPriority,
      source: 'library',
      libraryTaskId: libraryTask.id,
    }
    setDraftTasks((prev) => [...prev, newTask])
  }

  // 添加自定义任务
  const handleAddCustomTask = () => {
    if (!customTaskTitle.trim()) return
    
    const newTask: DraftTask = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: customTaskTitle.trim(),
      description: '',
      daysBeforeEvent: customTaskDays,
      priority: 'medium',
      source: 'custom',
    }
    setDraftTasks((prev) => [...prev, newTask])
    
    // 重置表单
    setCustomTaskTitle('')
    setCustomTaskDays(7)
    setShowCustomTaskForm(false)
  }

  // 更新任务字段
  const handleUpdateTask = (taskId: string, updates: Partial<DraftTask>) => {
    setDraftTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    )
  }

  // 移动任务顺序
  const handleMoveTask = (taskId: string, direction: 'up' | 'down') => {
    const index = draftTasks.findIndex((t) => t.id === taskId)
    if (index === -1) return
    
    if (direction === 'up' && index > 0) {
      const newTasks = [...draftTasks]
      const temp = newTasks[index]
      newTasks[index] = newTasks[index - 1]
      newTasks[index - 1] = temp
      setDraftTasks(newTasks)
    } else if (direction === 'down' && index < draftTasks.length - 1) {
      const newTasks = [...draftTasks]
      const temp = newTasks[index]
      newTasks[index] = newTasks[index + 1]
      newTasks[index + 1] = temp
      setDraftTasks(newTasks)
    }
  }

  // 开始编辑任务标题
  const startEditingTitle = (task: DraftTask) => {
    setEditingTaskId(task.id)
    setEditingTaskTitle(task.title)
  }

  // 保存任务标题编辑
  const saveTitleEdit = () => {
    if (editingTaskId && editingTaskTitle.trim()) {
      handleUpdateTask(editingTaskId, { title: editingTaskTitle.trim() })
    }
    setEditingTaskId(null)
    setEditingTaskTitle('')
  }

  // 提交创建
  const handleSubmit = () => {
    if (!formData.title || !formData.startDate) return
    
    // 转换草稿任务为 EventTask 格式（不含 id 和 createdAt）
    const customTasks: Omit<EventTask, 'id' | 'createdAt'>[] = draftTasks.map((task) => ({
      eventId: '', // 将在 store 中设置
      title: task.title,
      description: task.description,
      assigneeId: '',
      status: 'pending',
      priority: task.priority,
      dueDate: calculateDueDate(task.daysBeforeEvent),
      daysBeforeEvent: task.daysBeforeEvent,
      reminderSent: false,
    }))
    
    addEvent(formData, customTasks)
    setCreated(true)
    setTimeout(() => {
      setCurrentPage('dashboard')
      setCreated(false)
    }, 2000)
  }

  if (created) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full gradient-success flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">活动创建成功！</h2>
          <p className="text-muted-foreground mt-2">已创建 {draftTasks.length} 个筹备任务</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">创建新活动</h1>
        <p className="text-muted-foreground mt-1">选择模板、填写信息、自定义任务清单</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-smooth ${
                s === step
                  ? 'gradient-primary text-primary-foreground shadow-primary-glow'
                  : s < step
                  ? 'bg-success text-success-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 3 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />
            )}
          </div>
        ))}
        <span className="ml-3 text-sm text-muted-foreground">
          {step === 1 && '选择活动模板'}
          {step === 2 && '填写活动信息'}
          {step === 3 && '编辑任务列表'}
        </span>
      </div>

      {/* Step 1: Choose template */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const IconComponent = getIconComponent(template.icon)
              const isSelected = selectedTemplateId === template.id
              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-smooth ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'hover:border-primary/30'
                  }`}
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'gradient-primary' : 'bg-secondary'
                      }`}>
                        <IconComponent className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="secondary" className="text-xs">
                            {template.taskIds.length} 个任务
                          </Badge>
                          {isSelected && (
                            <Badge variant="default">已选择</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={() => setStep(2)} 
              disabled={!selectedTemplateId}
            >
              下一步
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Fill details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>活动详情</CardTitle>
            <CardDescription>请填写活动的基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                活动名称
              </label>
              <Input
                placeholder="例如：2026年Q2全员大会"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                活动主题
              </label>
              <Input
                placeholder="例如：聚力前行·共创未来"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  开始日期
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  结束日期
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                活动地点
              </label>
              <Input
                placeholder="例如：公司三楼大会议室"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                活动描述
              </label>
              <Textarea
                placeholder="简要描述活动内容和目标..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                上一步
              </Button>
              <Button onClick={() => setStep(3)} disabled={!formData.title || !formData.startDate}>
                下一步
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Edit tasks */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Event summary card */}
          <Card>
            <CardHeader>
              <CardTitle>活动概览</CardTitle>
              <CardDescription>确认活动信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">活动名称</span>
                  <p className="font-medium text-foreground mt-0.5">{formData.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">活动模板</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {templates.find((t) => t.id === selectedTemplateId)?.name || '自定义'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">开始日期</span>
                  <p className="font-medium text-foreground mt-0.5">{formData.startDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">活动地点</span>
                  <p className="font-medium text-foreground mt-0.5">{formData.location || '待定'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task list card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-primary" />
                筹备任务清单（{draftTasks.length} 项）
              </CardTitle>
              <CardDescription>
                编辑、排序、添加或删除任务，所有修改将在创建时保存
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Task list */}
              <div className="space-y-2">
                {draftTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>暂无任务，请从任务库添加或手动创建</p>
                  </div>
                ) : (
                  draftTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-smooth"
                    >
                      {/* Order controls */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveTask(task.id, 'up')}
                          disabled={index === 0}
                          className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleMoveTask(task.id, 'down')}
                          disabled={index === draftTasks.length - 1}
                          className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>

                      {/* Task title */}
                      <div className="flex-1 min-w-0">
                        {editingTaskId === task.id ? (
                          <Input
                            value={editingTaskTitle}
                            onChange={(e) => setEditingTaskTitle(e.target.value)}
                            onBlur={saveTitleEdit}
                            onKeyDown={(e) => e.key === 'Enter' && saveTitleEdit()}
                            autoFocus
                            className="h-8 text-sm"
                          />
                        ) : (
                          <button
                            onClick={() => startEditingTitle(task)}
                            className="text-sm text-foreground hover:text-primary flex items-center gap-1 group"
                          >
                            <span className="truncate">{task.title}</span>
                            <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-smooth" />
                          </button>
                        )}
                      </div>

                      {/* Days before event */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">活动前</span>
                        <Input
                          type="number"
                          min={0}
                          value={task.daysBeforeEvent}
                          onChange={(e) => handleUpdateTask(task.id, { daysBeforeEvent: parseInt(e.target.value) || 0 })}
                          className="w-16 h-8 text-sm text-center"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">天</span>
                      </div>

                      {/* Due date display */}
                      <span className="text-xs text-muted-foreground whitespace-nowrap w-24">
                        {calculateDueDate(task.daysBeforeEvent)}
                      </span>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-smooth"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add task buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTaskLibrary(!showTaskLibrary)}
                >
                  <Library className="w-4 h-4 mr-2" />
                  {showTaskLibrary ? '收起任务库' : '从任务库添加'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomTaskForm(!showCustomTaskForm)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  自定义新任务
                </Button>
              </div>

              {/* Task library panel */}
              {showTaskLibrary && (
                <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Library className="w-4 h-4" />
                    任务库
                  </h4>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {taskCategories.map((category) => (
                      <div key={category}>
                        <h5 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                          {category}
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {taskLibrary
                            .filter((t) => t.category === category)
                            .map((task) => {
                              const isAdded = draftTasks.some((t) => t.libraryTaskId === task.id)
                              return (
                                <button
                                  key={task.id}
                                  onClick={() => !isAdded && handleAddFromLibrary(task)}
                                  disabled={isAdded}
                                  className={`text-left p-2.5 rounded-md text-sm transition-smooth border ${
                                    isAdded
                                      ? 'bg-muted/50 border-transparent text-muted-foreground cursor-not-allowed'
                                      : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={isAdded ? 'line-through' : ''}>{task.title}</span>
                                    {isAdded && <CheckCircle2 className="w-4 h-4 text-success" />}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    活动前 {task.defaultDaysBeforeEvent} 天
                                  </p>
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom task form */}
              {showCustomTaskForm && (
                <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    添加自定义任务
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">任务标题</label>
                      <Input
                        placeholder="输入任务名称..."
                        value={customTaskTitle}
                        onChange={(e) => setCustomTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTask()}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">截止天数（活动前）</label>
                      <Input
                        type="number"
                        min={0}
                        value={customTaskDays}
                        onChange={(e) => setCustomTaskDays(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddCustomTask} disabled={!customTaskTitle.trim()}>
                        添加
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowCustomTaskForm(false)}>
                        取消
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              上一步
            </Button>
            <Button onClick={handleSubmit}>
              <Sparkles className="w-4 h-4 mr-2" />
              确认创建活动
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
