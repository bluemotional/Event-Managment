import { useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { LayoutTemplate, Plus, RotateCcw, Trash2 } from 'lucide-react'

const DEFAULT_CATEGORY = '流程'

export function TemplateManager() {
  const {
    eventTemplates,
    taskLibrary,
    addEventTemplate,
    deleteEventTemplate,
    updateEventTemplate,
    toggleTemplateTask,
    resetEventTemplates,
    addTaskLibraryItem,
    updateTaskLibraryItem,
    deleteTaskLibraryItem,
    resetTaskLibrary,
  } = useAppStore()
  const [selectedTemplateId, setSelectedTemplateId] = useState(eventTemplates[0]?.id || '')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState(DEFAULT_CATEGORY)
  const [newTaskDays, setNewTaskDays] = useState('7')
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')

  const taskCategories = useMemo(() => {
    const categories = Array.from(new Set(taskLibrary.map((task) => task.category))).sort()
    return categories.length > 0 ? categories : [DEFAULT_CATEGORY]
  }, [taskLibrary])
  const categoryOptions = taskCategories.map((category) => ({ value: category, label: category }))
  const selectedTemplate = eventTemplates.find((template) => template.id === selectedTemplateId) || eventTemplates[0]

  if (!selectedTemplate) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">模板管理</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">暂无活动模板</CardContent>
        </Card>
      </div>
    )
  }

  const selectedTasks = selectedTemplate.taskIds
    .map((taskId) => taskLibrary.find((task) => task.id === taskId))
    .filter((task): task is typeof taskLibrary[number] => Boolean(task))

  const handleAddTask = () => {
    const title = newTaskTitle.trim()
    if (!title) return

    addTaskLibraryItem({
      title,
      description: newTaskDescription.trim(),
      category: newTaskCategory.trim() || DEFAULT_CATEGORY,
      defaultDaysBeforeEvent: Number(newTaskDays) || 0,
    })
    setNewTaskTitle('')
    setNewTaskDescription('')
    setNewTaskDays('7')
  }

  const handleAddTemplate = () => {
    const name = newTemplateName.trim()
    if (!name) return
    addEventTemplate({
      name,
      description: newTemplateDescription.trim() || '自定义活动模板',
      icon: 'LayoutTemplate',
      taskIds: [],
    })
    setNewTemplateName('')
    setNewTemplateDescription('')
  }

  const handleDeleteTemplate = () => {
    if (eventTemplates.length <= 1) {
      window.alert('至少保留一个活动模板')
      return
    }
    if (!window.confirm(`确定删除模板「${selectedTemplate.name}」吗？已创建的活动不会被删除。`)) return
    deleteEventTemplate(selectedTemplate.id)
    const nextTemplate = eventTemplates.find((template) => template.id !== selectedTemplate.id)
    setSelectedTemplateId(nextTemplate?.id || '')
  }

  const handleResetAll = () => {
    if (!window.confirm('确定要恢复默认任务库和默认模板吗？当前自定义任务库和模板勾选会被覆盖。')) return
    resetTaskLibrary()
    resetEventTemplates()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">模板管理</h1>
          <p className="text-muted-foreground mt-1">调整每种活动默认带出的任务清单，也可以维护任务库</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleResetAll}>
            <RotateCcw className="w-4 h-4 mr-2" />
            恢复默认
          </Button>
          <Button variant="outline" onClick={handleDeleteTemplate}>
            <Trash2 className="w-4 h-4 mr-2" />
            删除当前模板
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">新增模板</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={newTemplateName}
                onChange={(event) => setNewTemplateName(event.target.value)}
                placeholder="模板名称"
              />
              <Textarea
                value={newTemplateDescription}
                onChange={(event) => setNewTemplateDescription(event.target.value)}
                placeholder="模板说明"
                className="min-h-20"
              />
              <Button className="w-full" onClick={handleAddTemplate} disabled={!newTemplateName.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                增加模板
              </Button>
            </CardContent>
          </Card>

          {eventTemplates.map((template) => {
            const active = template.id === selectedTemplate.id
            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                className={`w-full rounded-lg border p-4 text-left transition-smooth ${
                  active ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{template.name}</span>
                  <Badge variant="secondary">{template.taskIds.length}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{template.description}</p>
              </button>
            )
          })}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-primary" />
                {selectedTemplate.name}
              </CardTitle>
              <CardDescription>修改名称、说明和默认任务。修改后创建新活动会使用新模板。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">模板名称</label>
                  <Input
                    value={selectedTemplate.name}
                    onChange={(event) => updateEventTemplate(selectedTemplate.id, { name: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">模板说明</label>
                  <Input
                    value={selectedTemplate.description}
                    onChange={(event) => updateEventTemplate(selectedTemplate.id, { description: event.target.value })}
                  />
                </div>
              </div>

              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">当前默认任务（{selectedTasks.length}）</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTasks.map((task) => (
                    <Badge key={task.id} variant="secondary">{task.title}</Badge>
                  ))}
                  {selectedTasks.length === 0 && <span className="text-sm text-muted-foreground">暂无任务</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>新增任务库条目</CardTitle>
              <CardDescription>新增后可勾选到任意活动模板里。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_140px_120px_auto]">
                <Input
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  placeholder="任务名称"
                />
                <Input
                  value={newTaskCategory}
                  onChange={(event) => setNewTaskCategory(event.target.value)}
                  placeholder="分类"
                  list="task-category-options"
                />
                <Input
                  type="number"
                  min={0}
                  value={newTaskDays}
                  onChange={(event) => setNewTaskDays(event.target.value)}
                  placeholder="活动前天数"
                />
                <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加
                </Button>
              </div>
              <Textarea
                value={newTaskDescription}
                onChange={(event) => setNewTaskDescription(event.target.value)}
                placeholder="任务说明，可留空"
                className="min-h-20"
              />
              <datalist id="task-category-options">
                {taskCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>任务库</CardTitle>
              <CardDescription>勾选任务后会加入当前模板；任务名称、说明、分类和默认截止时间都可以直接编辑。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {taskCategories.map((category) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">{category}</h3>
                    <div className="space-y-2">
                      {taskLibrary.filter((task) => task.category === category).map((task) => {
                        const checked = selectedTemplate.taskIds.includes(task.id)
                        return (
                          <div
                            key={task.id}
                            className={`rounded-lg border p-3 transition-smooth ${
                              checked ? 'border-primary/40 bg-accent/70' : 'border-border bg-card hover:border-primary/30'
                            }`}
                          >
                            <div className="grid gap-3 md:grid-cols-[auto_1fr_120px_140px_auto] md:items-start">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => toggleTemplateTask(selectedTemplate.id, task.id, event.target.checked)}
                                className="mt-2 h-4 w-4 accent-primary"
                              />
                              <div className="space-y-2">
                                <Input
                                  value={task.title}
                                  onChange={(event) => updateTaskLibraryItem(task.id, { title: event.target.value })}
                                  className="h-9"
                                />
                                <Textarea
                                  value={task.description}
                                  onChange={(event) => updateTaskLibraryItem(task.id, { description: event.target.value })}
                                  className="min-h-16 text-xs"
                                  placeholder="任务说明"
                                />
                              </div>
                              <Input
                                type="number"
                                min={0}
                                value={task.defaultDaysBeforeEvent}
                                onChange={(event) => updateTaskLibraryItem(task.id, { defaultDaysBeforeEvent: Number(event.target.value) || 0 })}
                                className="h-9"
                              />
                              <Select
                                value={task.category}
                                onChange={(event) => updateTaskLibraryItem(task.id, { category: event.target.value })}
                                options={categoryOptions}
                                className="h-9"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteTaskLibraryItem(task.id)}
                                aria-label="删除任务"
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
