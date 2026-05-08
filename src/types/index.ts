export type EventType = 'meetup' | 'exhibition' | 'workshop' | 'private'
export type EventTemplateId = EventType | string

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'

export type TaskPriority = 'high' | 'medium' | 'low'

export type ViewerMode = 'public' | 'member' | 'console'

// 任务库中的基础任务定义
export interface TaskLibraryItem {
  id: string
  title: string
  description: string
  defaultDaysBeforeEvent: number
  defaultPriority: TaskPriority
  suggestedRole: string
  category: string // 分类标签，如 "场地", "宣传", "嘉宾", "物料", "流程" 等
}

// 活动模板
export interface EventTemplate {
  id: EventTemplateId
  name: string        // 如 "Meetup", "Workshop"
  icon: string        // lucide 图标名
  description: string
  taskIds: string[]   // 引用任务库中的任务 ID（有序）
}

export interface TeamMember {
  id: string
  name: string
  role: string
  feishuId: string
  feishuOpenId?: string
  feishuUserId?: string
  email?: string
  avatar?: string
}

export interface EventTask {
  id: string
  eventId: string
  title: string
  description: string
  assigneeId: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  daysBeforeEvent: number
  reminderSent: boolean
  createdAt: string
}

export interface Event {
  id: string
  title: string
  type: EventTemplateId
  theme: string
  description: string
  startDate: string
  endDate: string
  location: string
  tasks: EventTask[]
  budgets?: BudgetItem[]
  materials?: MaterialItem[]
  guests?: GuestRecord[]
  copyDocs?: CopyRecord[]
  attachments?: EventAttachment[]
  createdAt: string
}

export interface FeishuConfig {
  webhookUrl: string
  appId?: string
  enabled: boolean
  reminderPolicy: ReminderPolicy
  reminderRules?: ReminderRule[]
}

export interface ReminderRule {
  id: string
  daysBeforeEvent: number
  timeOfDay: string
  message: string
}

export interface ReminderPolicy {
  firstReminderDaysBefore: number
  beforeDueTimes: string[]
  dueDateTimes: string[]
  overdueTimes: string[]
  timezone: string
}

export interface BudgetItem {
  id: string
  eventId: string
  title: string
  category: string
  estimatedAmount: number
  actualAmount: number
  ownerId: string
  note: string
  createdAt: string
}

export type MaterialStatus = 'needed' | 'ordered' | 'ready' | 'used'

export interface MaterialItem {
  id: string
  eventId: string
  name: string
  quantity: string
  ownerId: string
  status: MaterialStatus
  note: string
  createdAt: string
}

export interface GuestRecord {
  id: string
  eventId: string
  name: string
  organization: string
  role: string
  contact: string
  status: string
  note: string
  createdAt: string
}

export interface CopyRecord {
  id: string
  eventId: string
  title: string
  channel: string
  content: string
  ownerId: string
  updatedAt: string
  createdAt: string
}

export interface EventAttachment {
  id: string
  eventId: string
  name: string
  url: string
  fileType: string
  sizeBytes: number
  note: string
  uploadedAt: string
}

export interface EventAccess {
  id: string
  eventId: string
  memberId: string
  role: 'owner' | 'member' | 'viewer'
  active: boolean
  createdAt: string
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  meetup: 'Meetup',
  exhibition: '展览',
  workshop: 'Workshop',
  private: '超音速闭门活动',
}

export function getEventTypeLabel(type: EventTemplateId): string {
  return EVENT_TYPE_LABELS[type as EventType] || '自定义活动'
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  overdue: '已逾期',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: '紧急',
  medium: '重要',
  low: '一般',
}

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  needed: '待准备',
  ordered: '采购中',
  ready: '已就绪',
  used: '已使用',
}
