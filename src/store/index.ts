import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  BudgetItem,
  CopyRecord,
  Event,
  EventAccess,
  EventAttachment,
  EventTemplate,
  EventTask,
  FeishuConfig,
  GuestRecord,
  MaterialItem,
  TaskLibraryItem,
  TeamMember,
  TaskStatus,
  ViewerMode,
} from '@/types'
import { EVENT_TEMPLATES, TASK_LIBRARY } from '@/lib/task-templates'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function nowIso(): string {
  return new Date().toISOString()
}

interface AppSnapshot {
  version: 1
  exportedAt: string
  events: Event[]
  members: TeamMember[]
  eventAccess: EventAccess[]
  eventTemplates: EventTemplate[]
  taskLibrary: TaskLibraryItem[]
  adminMemberIds: string[]
  eventEditorMemberIds: string[]
  feishuConfig: FeishuConfig
  viewerMode: ViewerMode
  currentMemberId: string
}

type ImportSnapshotOptions = {
  preserveSession?: boolean
}

function isSnapshot(value: unknown): value is AppSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<AppSnapshot>
  return (
    Array.isArray(snapshot.events) &&
    Array.isArray(snapshot.members) &&
    Array.isArray(snapshot.eventAccess) &&
    Array.isArray(snapshot.eventTemplates) &&
    !!snapshot.feishuConfig
  )
}

interface AppState {
  // Data
  events: Event[]
  members: TeamMember[]
  eventAccess: EventAccess[]
  eventTemplates: EventTemplate[]
  taskLibrary: TaskLibraryItem[]
  adminMemberIds: string[]
  eventEditorMemberIds: string[]
  feishuConfig: FeishuConfig
  viewerMode: ViewerMode
  currentMemberId: string
  
  // Navigation
  currentPage: string
  selectedEventId: string | null
  
  // Actions
  setCurrentPage: (page: string) => void
  setSelectedEventId: (id: string | null) => void
  setViewerMode: (mode: ViewerMode) => void
  setCurrentMemberId: (id: string) => void
  setSystemAdmin: (memberId: string, active: boolean) => void
  setEventEditor: (memberId: string, active: boolean) => void
  
  // Event actions
  addEvent: (event: Omit<Event, 'id' | 'tasks' | 'createdAt'>, customTasks?: Omit<EventTask, 'id' | 'createdAt'>[]) => void
  updateEvent: (id: string, updates: Partial<Event>) => void
  deleteEvent: (id: string) => void
  setEventAccess: (eventId: string, memberId: string, active: boolean) => void
  addEventTemplate: (template: Omit<EventTemplate, 'id' | 'taskIds'> & { taskIds?: string[] }) => void
  deleteEventTemplate: (id: string) => void
  updateEventTemplate: (id: string, updates: Partial<EventTemplate>) => void
  toggleTemplateTask: (templateId: string, taskId: string, active: boolean) => void
  resetEventTemplates: () => void
  addTaskLibraryItem: (item: Omit<TaskLibraryItem, 'id' | 'defaultPriority' | 'suggestedRole'>) => void
  updateTaskLibraryItem: (id: string, updates: Partial<TaskLibraryItem>) => void
  deleteTaskLibraryItem: (id: string) => void
  resetTaskLibrary: () => void
  
  // Task actions
  addTask: (eventId: string, task: Omit<EventTask, 'id' | 'createdAt'>) => void
  updateTask: (eventId: string, taskId: string, updates: Partial<EventTask>) => void
  deleteTask: (eventId: string, taskId: string) => void
  updateTaskStatus: (eventId: string, taskId: string, status: TaskStatus) => void

  // Archive actions
  addBudgetItem: (eventId: string, item: Omit<BudgetItem, 'id' | 'eventId' | 'createdAt'>) => void
  updateBudgetItem: (eventId: string, itemId: string, updates: Partial<BudgetItem>) => void
  deleteBudgetItem: (eventId: string, itemId: string) => void
  addMaterialItem: (eventId: string, item: Omit<MaterialItem, 'id' | 'eventId' | 'createdAt'>) => void
  updateMaterialItem: (eventId: string, itemId: string, updates: Partial<MaterialItem>) => void
  deleteMaterialItem: (eventId: string, itemId: string) => void
  addGuestRecord: (eventId: string, item: Omit<GuestRecord, 'id' | 'eventId' | 'createdAt'>) => void
  updateGuestRecord: (eventId: string, itemId: string, updates: Partial<GuestRecord>) => void
  deleteGuestRecord: (eventId: string, itemId: string) => void
  addCopyRecord: (eventId: string, item: Omit<CopyRecord, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>) => void
  updateCopyRecord: (eventId: string, itemId: string, updates: Partial<CopyRecord>) => void
  deleteCopyRecord: (eventId: string, itemId: string) => void
  addAttachment: (eventId: string, item: Omit<EventAttachment, 'id' | 'eventId' | 'uploadedAt'>) => void
  updateAttachment: (eventId: string, itemId: string, updates: Partial<EventAttachment>) => void
  deleteAttachment: (eventId: string, itemId: string) => void
  
  // Member actions
  addMember: (member: Omit<TeamMember, 'id'> & { systemAdmin?: boolean; eventEditor?: boolean }) => void
  updateMember: (id: string, updates: Partial<TeamMember>) => void
  deleteMember: (id: string) => void
  
  // Config actions
  updateFeishuConfig: (config: Partial<FeishuConfig>) => void
  exportSnapshot: () => string
  importSnapshot: (raw: string, options?: ImportSnapshotOptions) => { success: boolean; error?: string }
  resetDemoData: () => void
}

// Demo data
const demoMembers: TeamMember[] = [
  { id: 'm1', name: '张三', role: '项目负责人', feishuId: 'zhangsan@company.com', email: 'zhangsan@company.com' },
  { id: 'm2', name: '李四', role: '行政', feishuId: 'lisi@company.com', email: 'lisi@company.com' },
  { id: 'm3', name: '王五', role: '设计师', feishuId: 'wangwu@company.com', email: 'wangwu@company.com' },
  { id: 'm4', name: '赵六', role: '运营', feishuId: 'zhaoliu@company.com', email: 'zhaoliu@company.com' },
  { id: 'm5', name: '钱七', role: '技术支持', feishuId: 'qianqi@company.com', email: 'qianqi@company.com' },
]

const demoEvents: Event[] = [
  {
    id: 'e1',
    title: '2026年Q2全员大会',
    type: 'meetup',
    theme: '聚力前行·共创未来',
    description: '公司Q2季度全员大会，回顾上季度成果，发布下季度战略方向',
    startDate: '2026-05-15',
    endDate: '2026-05-15',
    location: '公司三楼大会议室',
    tasks: [
      { id: 't1', eventId: 'e1', title: '确定会议议程', description: '拟定会议主题、议程安排和时间分配', assigneeId: 'm1', status: 'completed', priority: 'high', dueDate: '2026-04-15', daysBeforeEvent: 30, reminderSent: true, createdAt: '2026-04-01T00:00:00Z' },
      { id: 't2', eventId: 'e1', title: '预订会议场地', description: '确认场地可用性、容量、设备支持', assigneeId: 'm2', status: 'completed', priority: 'high', dueDate: '2026-04-17', daysBeforeEvent: 28, reminderSent: true, createdAt: '2026-04-01T00:00:00Z' },
      { id: 't3', eventId: 'e1', title: '发送参会邀请', description: '准备邀请函并发送给所有参会者', assigneeId: 'm2', status: 'in_progress', priority: 'high', dueDate: '2026-04-24', daysBeforeEvent: 21, reminderSent: false, createdAt: '2026-04-01T00:00:00Z' },
      { id: 't4', eventId: 'e1', title: '准备演示材料', description: '制作PPT、演示文稿等会议材料', assigneeId: 'm1', status: 'pending', priority: 'medium', dueDate: '2026-05-01', daysBeforeEvent: 14, reminderSent: false, createdAt: '2026-04-01T00:00:00Z' },
      { id: 't5', eventId: 'e1', title: '确认参会人数', description: '收集回执，确认最终参会人数', assigneeId: 'm2', status: 'pending', priority: 'medium', dueDate: '2026-05-05', daysBeforeEvent: 10, reminderSent: false, createdAt: '2026-04-01T00:00:00Z' },
      { id: 't6', eventId: 'e1', title: '安排茶歇餐饮', description: '根据人数预订茶歇和午餐', assigneeId: 'm2', status: 'pending', priority: 'medium', dueDate: '2026-05-08', daysBeforeEvent: 7, reminderSent: false, createdAt: '2026-04-01T00:00:00Z' },
      { id: 't7', eventId: 'e1', title: '测试设备', description: '提前测试投影、音响、视频会议等设备', assigneeId: 'm5', status: 'pending', priority: 'high', dueDate: '2026-05-12', daysBeforeEvent: 3, reminderSent: false, createdAt: '2026-04-01T00:00:00Z' },
      { id: 't8', eventId: 'e1', title: '现场布置', description: '桌椅摆放、指引标识、签到台准备', assigneeId: 'm2', status: 'pending', priority: 'high', dueDate: '2026-05-14', daysBeforeEvent: 1, reminderSent: false, createdAt: '2026-04-01T00:00:00Z' },
    ],
    budgets: [
      { id: 'b1', eventId: 'e1', title: '茶歇餐饮', category: '餐饮', estimatedAmount: 3000, actualAmount: 0, ownerId: 'm2', note: '按 80 人估算，待确认人数后更新', createdAt: '2026-04-01T00:00:00Z' },
      { id: 'b2', eventId: 'e1', title: '视觉物料', category: '物料', estimatedAmount: 1200, actualAmount: 800, ownerId: 'm3', note: '背景板、签到台桌牌', createdAt: '2026-04-01T00:00:00Z' },
    ],
    materials: [
      { id: 'mat1', eventId: 'e1', name: '签到二维码桌牌', quantity: '2 套', ownerId: 'm2', status: 'ready', note: '放在前台和会场入口', createdAt: '2026-04-01T00:00:00Z' },
    ],
    guests: [
      { id: 'g1', eventId: 'e1', name: '业务负责人', organization: '增长团队', role: '分享嘉宾', contact: '飞书', status: '已确认', note: '需要提前收 PPT', createdAt: '2026-04-01T00:00:00Z' },
    ],
    copyDocs: [
      { id: 'c1', eventId: 'e1', title: '会前提醒文案', channel: '飞书群公告', content: '各位同事好，Q2 全员大会将于 5 月 15 日举行，请提前安排时间参会。', ownerId: 'm4', createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
    ],
    attachments: [],
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'e2',
    title: '技术分享 Meetup · AI应用专场',
    type: 'meetup',
    theme: 'AI赋能业务创新',
    description: '邀请行业专家分享AI在业务场景中的实际落地经验',
    startDate: '2026-06-20',
    endDate: '2026-06-20',
    location: '创新中心B1层路演厅',
    tasks: [
      { id: 't9', eventId: 'e2', title: '确定分享主题和嘉宾', description: '邀请嘉宾并确认分享主题', assigneeId: 'm1', status: 'in_progress', priority: 'high', dueDate: '2026-05-06', daysBeforeEvent: 45, reminderSent: false, createdAt: '2026-04-10T00:00:00Z' },
      { id: 't10', eventId: 'e2', title: '设计宣传海报', description: '制作活动海报，准备宣传文案', assigneeId: 'm3', status: 'pending', priority: 'medium', dueDate: '2026-05-21', daysBeforeEvent: 30, reminderSent: false, createdAt: '2026-04-10T00:00:00Z' },
      { id: 't11', eventId: 'e2', title: '开放报名通道', description: '发布活动信息，开放报名链接', assigneeId: 'm4', status: 'pending', priority: 'high', dueDate: '2026-05-23', daysBeforeEvent: 28, reminderSent: false, createdAt: '2026-04-10T00:00:00Z' },
      { id: 't12', eventId: 'e2', title: '预订场地', description: '确认场地、确认桌椅和设备需求', assigneeId: 'm2', status: 'pending', priority: 'high', dueDate: '2026-05-30', daysBeforeEvent: 21, reminderSent: false, createdAt: '2026-04-10T00:00:00Z' },
    ],
    budgets: [],
    materials: [],
    guests: [],
    copyDocs: [],
    attachments: [],
    createdAt: '2026-04-10T00:00:00Z',
  },
]

const demoEventAccess: EventAccess[] = [
  { id: 'ea1', eventId: 'e1', memberId: 'm1', role: 'owner', active: true, createdAt: '2026-04-01T00:00:00Z' },
  { id: 'ea2', eventId: 'e1', memberId: 'm2', role: 'member', active: true, createdAt: '2026-04-01T00:00:00Z' },
  { id: 'ea3', eventId: 'e1', memberId: 'm3', role: 'member', active: true, createdAt: '2026-04-01T00:00:00Z' },
  { id: 'ea4', eventId: 'e1', memberId: 'm4', role: 'member', active: true, createdAt: '2026-04-01T00:00:00Z' },
  { id: 'ea5', eventId: 'e1', memberId: 'm5', role: 'member', active: true, createdAt: '2026-04-01T00:00:00Z' },
  { id: 'ea6', eventId: 'e2', memberId: 'm1', role: 'owner', active: true, createdAt: '2026-04-10T00:00:00Z' },
  { id: 'ea7', eventId: 'e2', memberId: 'm2', role: 'member', active: true, createdAt: '2026-04-10T00:00:00Z' },
  { id: 'ea8', eventId: 'e2', memberId: 'm3', role: 'member', active: true, createdAt: '2026-04-10T00:00:00Z' },
  { id: 'ea9', eventId: 'e2', memberId: 'm4', role: 'member', active: true, createdAt: '2026-04-10T00:00:00Z' },
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      events: demoEvents,
      members: demoMembers,
      eventAccess: demoEventAccess,
      eventTemplates: EVENT_TEMPLATES,
      taskLibrary: TASK_LIBRARY,
      adminMemberIds: ['m1'],
      eventEditorMemberIds: ['m1'],
      feishuConfig: {
        webhookUrl: '',
        appId: '',
        enabled: false,
        reminderPolicy: {
          firstReminderDaysBefore: 3,
          beforeDueTimes: ['09:00'],
          dueDateTimes: ['09:00', '15:00'],
          overdueTimes: ['09:00', '12:00', '15:00', '18:00'],
          timezone: 'Asia/Shanghai',
        },
      },
      viewerMode: 'console',
      currentMemberId: 'm1',
      currentPage: 'dashboard',
      selectedEventId: null,

      // Navigation
      setCurrentPage: (page) => set({ currentPage: page }),
      setSelectedEventId: (id) => set({ selectedEventId: id }),
      setViewerMode: (mode) => set({ viewerMode: mode }),
      setCurrentMemberId: (id) => set({ currentMemberId: id }),
      setSystemAdmin: (memberId, active) => set((state) => {
        const exists = state.adminMemberIds.includes(memberId)
        if (active && !exists) return { adminMemberIds: [...state.adminMemberIds, memberId] }
        if (!active && exists) return { adminMemberIds: state.adminMemberIds.filter((id) => id !== memberId) }
        return { adminMemberIds: state.adminMemberIds }
      }),
      setEventEditor: (memberId, active) => set((state) => {
        const exists = state.eventEditorMemberIds.includes(memberId)
        if (active && !exists) return { eventEditorMemberIds: [...state.eventEditorMemberIds, memberId] }
        if (!active && exists) return { eventEditorMemberIds: state.eventEditorMemberIds.filter((id) => id !== memberId) }
        return { eventEditorMemberIds: state.eventEditorMemberIds }
      }),

      // Event actions
      addEvent: (eventData, customTasks) => {
        const id = generateId()
        
        let tasks: EventTask[]
        
        if (customTasks && customTasks.length > 0) {
          // 使用用户提供的自定义任务列表
          tasks = customTasks.map((t) => ({
            ...t,
            eventId: id,
            id: generateId(),
            createdAt: new Date().toISOString(),
          }))
        } else {
          // 从当前可编辑模板自动生成任务
          const template = get().eventTemplates.find((item) => item.id === eventData.type)
          const startDate = new Date(eventData.startDate)
          const generatedTasks = (template?.taskIds || [])
            .map((taskId) => get().taskLibrary.find((task) => task.id === taskId))
            .filter((task): task is TaskLibraryItem => Boolean(task))
          tasks = generatedTasks.map((task) => {
            const dueDate = new Date(startDate)
            dueDate.setDate(dueDate.getDate() - task.defaultDaysBeforeEvent)

            return {
              eventId: id,
              title: task.title,
              description: task.description,
              assigneeId: '',
              status: 'pending' as const,
              priority: task.defaultPriority,
              dueDate: dueDate.toISOString().split('T')[0],
              daysBeforeEvent: task.defaultDaysBeforeEvent,
              reminderSent: false,
              id: generateId(),
              createdAt: nowIso(),
            }
          })
        }
        
        const newEvent: Event = {
          ...eventData,
          id,
          tasks,
          budgets: [],
          materials: [],
          guests: [],
          copyDocs: [],
          attachments: [],
          createdAt: nowIso(),
        }
        set((state) => ({
          events: [...state.events, newEvent],
          eventAccess: state.currentMemberId
            ? [...state.eventAccess, { id: generateId(), eventId: id, memberId: state.currentMemberId, role: 'owner', active: true, createdAt: nowIso() }]
            : state.eventAccess,
        }))
      },

      updateEvent: (id, updates) => set((state) => ({
        events: state.events.map((e) => e.id === id ? { ...e, ...updates } : e),
      })),

      deleteEvent: (id) => set((state) => ({
        events: state.events.filter((e) => e.id !== id),
        eventAccess: state.eventAccess.filter((access) => access.eventId !== id),
      })),

      setEventAccess: (eventId, memberId, active) => set((state) => {
        const existing = state.eventAccess.find((access) => access.eventId === eventId && access.memberId === memberId)
        if (existing) {
          return {
            eventAccess: state.eventAccess.map((access) =>
              access.id === existing.id ? { ...access, active } : access
            ),
          }
        }

        return {
          eventAccess: [
            ...state.eventAccess,
            { id: generateId(), eventId, memberId, role: 'member', active, createdAt: nowIso() },
          ],
        }
      }),

      addEventTemplate: (template) => set((state) => {
        const id = generateId()
        return {
          eventTemplates: [
            ...state.eventTemplates,
            {
              ...template,
              id,
              taskIds: template.taskIds || [],
            },
          ],
        }
      }),

      deleteEventTemplate: (id) => set((state) => ({
        eventTemplates: state.eventTemplates.filter((template) => template.id !== id),
      })),

      updateEventTemplate: (id, updates) => set((state) => ({
        eventTemplates: state.eventTemplates.map((template) =>
          template.id === id ? { ...template, ...updates } : template
        ),
      })),

      toggleTemplateTask: (templateId, taskId, active) => set((state) => ({
        eventTemplates: state.eventTemplates.map((template) => {
          if (template.id !== templateId) return template
          const exists = template.taskIds.includes(taskId)
          if (active && !exists) {
            return { ...template, taskIds: [...template.taskIds, taskId] }
          }
          if (!active && exists) {
            return { ...template, taskIds: template.taskIds.filter((id) => id !== taskId) }
          }
          return template
        }),
      })),

      resetEventTemplates: () => set({ eventTemplates: EVENT_TEMPLATES }),

      addTaskLibraryItem: (item) => set((state) => ({
        taskLibrary: [
          ...state.taskLibrary,
          {
            ...item,
            id: generateId(),
            defaultPriority: 'medium',
            suggestedRole: '',
          },
        ],
      })),

      updateTaskLibraryItem: (id, updates) => set((state) => ({
        taskLibrary: state.taskLibrary.map((task) => task.id === id ? { ...task, ...updates } : task),
      })),

      deleteTaskLibraryItem: (id) => set((state) => ({
        taskLibrary: state.taskLibrary.filter((task) => task.id !== id),
        eventTemplates: state.eventTemplates.map((template) => ({
          ...template,
          taskIds: template.taskIds.filter((taskId) => taskId !== id),
        })),
      })),

      resetTaskLibrary: () => set({ taskLibrary: TASK_LIBRARY }),

      // Task actions
      addTask: (eventId, taskData) => set((state) => ({
        events: state.events.map((e) => {
          if (e.id !== eventId) return e
          const newTask: EventTask = {
            ...taskData,
            id: generateId(),
            createdAt: new Date().toISOString(),
          }
          return { ...e, tasks: [...e.tasks, newTask] }
        }),
      })),

      updateTask: (eventId, taskId, updates) => set((state) => ({
        events: state.events.map((e) => {
          if (e.id !== eventId) return e
          return {
            ...e,
            tasks: e.tasks.map((t) => t.id === taskId ? { ...t, ...updates } : t),
          }
        }),
      })),

      deleteTask: (eventId, taskId) => set((state) => ({
        events: state.events.map((e) => {
          if (e.id !== eventId) return e
          return { ...e, tasks: e.tasks.filter((t) => t.id !== taskId) }
        }),
      })),

      updateTaskStatus: (eventId, taskId, status) => set((state) => ({
        events: state.events.map((e) => {
          if (e.id !== eventId) return e
          return {
            ...e,
            tasks: e.tasks.map((t) => t.id === taskId ? { ...t, status } : t),
          }
        }),
      })),

      // Archive actions
      addBudgetItem: (eventId, item) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, budgets: [...(e.budgets || []), { ...item, id: generateId(), eventId, createdAt: nowIso() }] }
          : e
        ),
      })),

      updateBudgetItem: (eventId, itemId, updates) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, budgets: (e.budgets || []).map((item) => item.id === itemId ? { ...item, ...updates } : item) }
          : e
        ),
      })),

      deleteBudgetItem: (eventId, itemId) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, budgets: (e.budgets || []).filter((item) => item.id !== itemId) }
          : e
        ),
      })),

      addMaterialItem: (eventId, item) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, materials: [...(e.materials || []), { ...item, id: generateId(), eventId, createdAt: nowIso() }] }
          : e
        ),
      })),

      updateMaterialItem: (eventId, itemId, updates) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, materials: (e.materials || []).map((item) => item.id === itemId ? { ...item, ...updates } : item) }
          : e
        ),
      })),

      deleteMaterialItem: (eventId, itemId) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, materials: (e.materials || []).filter((item) => item.id !== itemId) }
          : e
        ),
      })),

      addGuestRecord: (eventId, item) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, guests: [...(e.guests || []), { ...item, id: generateId(), eventId, createdAt: nowIso() }] }
          : e
        ),
      })),

      updateGuestRecord: (eventId, itemId, updates) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, guests: (e.guests || []).map((item) => item.id === itemId ? { ...item, ...updates } : item) }
          : e
        ),
      })),

      deleteGuestRecord: (eventId, itemId) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, guests: (e.guests || []).filter((item) => item.id !== itemId) }
          : e
        ),
      })),

      addCopyRecord: (eventId, item) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, copyDocs: [...(e.copyDocs || []), { ...item, id: generateId(), eventId, createdAt: nowIso(), updatedAt: nowIso() }] }
          : e
        ),
      })),

      updateCopyRecord: (eventId, itemId, updates) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, copyDocs: (e.copyDocs || []).map((item) => item.id === itemId ? { ...item, ...updates, updatedAt: nowIso() } : item) }
          : e
        ),
      })),

      deleteCopyRecord: (eventId, itemId) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, copyDocs: (e.copyDocs || []).filter((item) => item.id !== itemId) }
          : e
        ),
      })),

      addAttachment: (eventId, item) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, attachments: [...(e.attachments || []), { ...item, id: generateId(), eventId, uploadedAt: nowIso() }] }
          : e
        ),
      })),

      updateAttachment: (eventId, itemId, updates) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, attachments: (e.attachments || []).map((item) => item.id === itemId ? { ...item, ...updates } : item) }
          : e
        ),
      })),

      deleteAttachment: (eventId, itemId) => set((state) => ({
        events: state.events.map((e) => e.id === eventId
          ? { ...e, attachments: (e.attachments || []).filter((item) => item.id !== itemId) }
          : e
        ),
      })),

      // Member actions
      addMember: (memberData) => set((state) => {
        const id = generateId()
        const { systemAdmin, eventEditor, ...member } = memberData
        return {
          members: [...state.members, { ...member, id }],
          adminMemberIds: systemAdmin ? [...state.adminMemberIds, id] : state.adminMemberIds,
          eventEditorMemberIds: eventEditor || systemAdmin ? [...state.eventEditorMemberIds, id] : state.eventEditorMemberIds,
        }
      }),

      updateMember: (id, updates) => set((state) => ({
        members: state.members.map((m) => m.id === id ? { ...m, ...updates } : m),
      })),

      deleteMember: (id) => set((state) => ({
        members: state.members.filter((m) => m.id !== id),
        adminMemberIds: state.adminMemberIds.filter((memberId) => memberId !== id),
        eventEditorMemberIds: state.eventEditorMemberIds.filter((memberId) => memberId !== id),
      })),

      // Config actions
      updateFeishuConfig: (config) => set((state) => ({
        feishuConfig: { ...state.feishuConfig, ...config },
      })),

      exportSnapshot: () => {
        const state = get()
        const snapshot: AppSnapshot = {
          version: 1,
          exportedAt: nowIso(),
          events: state.events,
          members: state.members,
          eventAccess: state.eventAccess,
          eventTemplates: state.eventTemplates,
          taskLibrary: state.taskLibrary,
          adminMemberIds: state.adminMemberIds,
          eventEditorMemberIds: state.eventEditorMemberIds,
          feishuConfig: state.feishuConfig,
          viewerMode: state.viewerMode,
          currentMemberId: state.currentMemberId,
        }
        return JSON.stringify(snapshot, null, 2)
      },

      importSnapshot: (raw, options) => {
        try {
          const parsed = JSON.parse(raw)
          if (!isSnapshot(parsed)) {
            return { success: false, error: '备份文件结构不正确' }
          }

          const currentState = get()
          const preserveSession = options?.preserveSession
          const preservedMemberId = preserveSession && parsed.members.some((member) => member.id === currentState.currentMemberId)
            ? currentState.currentMemberId
            : parsed.currentMemberId || parsed.members[0]?.id || ''
          const preservedEventId = preserveSession && parsed.events.some((event) => event.id === currentState.selectedEventId)
            ? currentState.selectedEventId
            : null

          set({
            events: parsed.events,
            members: parsed.members,
            eventAccess: parsed.eventAccess,
            eventTemplates: parsed.eventTemplates,
            taskLibrary: parsed.taskLibrary || TASK_LIBRARY,
            adminMemberIds: parsed.adminMemberIds || [parsed.currentMemberId || parsed.members[0]?.id || ''].filter(Boolean),
            eventEditorMemberIds: parsed.eventEditorMemberIds || parsed.adminMemberIds || [parsed.currentMemberId || parsed.members[0]?.id || ''].filter(Boolean),
            feishuConfig: parsed.feishuConfig,
            viewerMode: preserveSession ? currentState.viewerMode : parsed.viewerMode || 'console',
            currentMemberId: preservedMemberId,
            selectedEventId: preservedEventId,
            currentPage: preserveSession ? currentState.currentPage : 'dashboard',
          })
          return { success: true }
        } catch {
          return { success: false, error: '无法解析 JSON 备份内容' }
        }
      },

      resetDemoData: () => set({
        events: demoEvents,
        members: demoMembers,
        eventAccess: demoEventAccess,
        eventTemplates: EVENT_TEMPLATES,
        taskLibrary: TASK_LIBRARY,
        adminMemberIds: ['m1'],
        eventEditorMemberIds: ['m1'],
        viewerMode: 'console',
        currentMemberId: 'm1',
        currentPage: 'dashboard',
        selectedEventId: null,
      }),
    }),
    {
      name: 'qoder-event-storage',
    }
  )
)
