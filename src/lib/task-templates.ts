import { EventType, EventTask, TaskLibraryItem, EventTemplate, TaskPriority } from '@/types'

// ============================================
// 统一任务库 - 所有活动任务的基础定义
// ============================================

export const TASK_LIBRARY: TaskLibraryItem[] = [
  // ==================== 流程类任务 ====================
  {
    id: 'agenda-planning',
    title: '确定会议议程',
    description: '拟定会议主题、议程安排和时间分配',
    defaultDaysBeforeEvent: 30,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '流程',
  },
  {
    id: 'flow-planning',
    title: '确定流程和节目单',
    description: '编排活动完整流程和节目单',
    defaultDaysBeforeEvent: 21,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '流程',
  },
  {
    id: 'rehearsal',
    title: '彩排',
    description: '节目彩排和流程走台',
    defaultDaysBeforeEvent: 3,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '流程',
  },
  {
    id: 'day-of-coordination',
    title: '活动当天统筹',
    description: '签到、引导、流程控制、应急处理',
    defaultDaysBeforeEvent: 0,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '流程',
  },
  {
    id: 'theme-design',
    title: '确定活动主题和形式',
    description: '活动创意策划、主题确定',
    defaultDaysBeforeEvent: 60,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '流程',
  },
  {
    id: 'guest-topic-confirm',
    title: '确定分享主题和嘉宾',
    description: '邀请嘉宾并确认分享主题',
    defaultDaysBeforeEvent: 45,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '流程',
  },
  {
    id: 'guest-slides-confirm',
    title: '确认嘉宾演示文件',
    description: '收集嘉宾PPT，确认演讲内容',
    defaultDaysBeforeEvent: 7,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '流程',
  },
  {
    id: 'exhibition-scale-confirm',
    title: '确定展览主题和规模',
    description: '明确展览定位、规模和目标观众',
    defaultDaysBeforeEvent: 60,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '流程',
  },
  {
    id: 'activity-plan-confirm',
    title: '确定活动方案',
    description: '选择活动形式（户外/室内/旅行等）',
    defaultDaysBeforeEvent: 14,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '流程',
  },
  {
    id: 'preference-survey',
    title: '调研团队偏好',
    description: '收集团队成员对活动类型的偏好',
    defaultDaysBeforeEvent: 21,
    defaultPriority: 'medium',
    suggestedRole: '项目负责人',
    category: '流程',
  },

  // ==================== 场地类任务 ====================
  {
    id: 'venue-booking',
    title: '预订会议场地',
    description: '确认场地可用性、容量、设备支持',
    defaultDaysBeforeEvent: 28,
    defaultPriority: 'high',
    suggestedRole: '行政',
    category: '场地',
  },
  {
    id: 'venue-site-selection',
    title: '场地选址和签约',
    description: '实地考察场地，确认合同',
    defaultDaysBeforeEvent: 45,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '场地',
  },
  {
    id: 'venue-confirm-equipment',
    title: '预订场地',
    description: '确认场地、确认桌椅和设备需求',
    defaultDaysBeforeEvent: 21,
    defaultPriority: 'high',
    suggestedRole: '行政',
    category: '场地',
  },
  {
    id: 'venue-select-hotel',
    title: '选定场地',
    description: '考察酒店/场地并签约',
    defaultDaysBeforeEvent: 45,
    defaultPriority: 'high',
    suggestedRole: '行政',
    category: '场地',
  },
  {
    id: 'venue-resources-booking',
    title: '预订场地/资源',
    description: '预订活动场地、车辆、物资等',
    defaultDaysBeforeEvent: 10,
    defaultPriority: 'high',
    suggestedRole: '行政',
    category: '场地',
  },
  {
    id: 'venue-booth-setup',
    title: '搭建布展',
    description: '展位搭建、展品摆放、灯光调试',
    defaultDaysBeforeEvent: 3,
    defaultPriority: 'high',
    suggestedRole: '行政',
    category: '场地',
  },
  {
    id: 'venue-opening-check',
    title: '开幕检查',
    description: '全面检查展区、安全、动线',
    defaultDaysBeforeEvent: 1,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '场地',
  },
  {
    id: 'venue-stage-setup',
    title: '舞台搭建',
    description: '舞台搭建、灯光音响、桌椅摆放',
    defaultDaysBeforeEvent: 1,
    defaultPriority: 'high',
    suggestedRole: '行政',
    category: '场地',
  },

  // ==================== 宣传类任务 ====================
  {
    id: 'promo-poster-design',
    title: '设计宣传海报',
    description: '制作活动海报，准备宣传文案',
    defaultDaysBeforeEvent: 30,
    defaultPriority: 'medium',
    suggestedRole: '设计师',
    category: '宣传',
  },
  {
    id: 'promo-registration-open',
    title: '开放报名通道',
    description: '发布活动信息，开放报名链接',
    defaultDaysBeforeEvent: 28,
    defaultPriority: 'high',
    suggestedRole: '运营',
    category: '宣传',
  },
  {
    id: 'promo-social-media',
    title: '社交媒体推广',
    description: '在各平台发布活动信息，扩大传播',
    defaultDaysBeforeEvent: 14,
    defaultPriority: 'medium',
    suggestedRole: '运营',
    category: '宣传',
  },
  {
    id: 'promo-send-reminder',
    title: '发送参会提醒',
    description: '提醒已报名者活动时间和地点',
    defaultDaysBeforeEvent: 3,
    defaultPriority: 'medium',
    suggestedRole: '运营',
    category: '宣传',
  },
  {
    id: 'promo-materials-print',
    title: '制作宣传物料',
    description: '海报、传单、邀请函设计印刷',
    defaultDaysBeforeEvent: 21,
    defaultPriority: 'medium',
    suggestedRole: '设计师',
    category: '宣传',
  },
  {
    id: 'promo-program-collection',
    title: '节目征集',
    description: '发布节目征集通知，收集报名',
    defaultDaysBeforeEvent: 35,
    defaultPriority: 'medium',
    suggestedRole: '运营',
    category: '宣传',
  },
  {
    id: 'promo-send-notification',
    title: '发送活动通知',
    description: '告知时间、地点、注意事项',
    defaultDaysBeforeEvent: 3,
    defaultPriority: 'high',
    suggestedRole: '运营',
    category: '宣传',
  },
  {
    id: 'promo-post-event',
    title: '活动复盘与分享',
    description: '整理活动照片、视频，发布回顾文章',
    defaultDaysBeforeEvent: -3,
    defaultPriority: 'low',
    suggestedRole: '运营',
    category: '宣传',
  },

  // ==================== 嘉宾类任务 ====================
  {
    id: 'guest-send-invitation',
    title: '发送参会邀请',
    description: '准备邀请函并发送给所有参会者',
    defaultDaysBeforeEvent: 21,
    defaultPriority: 'high',
    suggestedRole: '行政',
    category: '嘉宾',
  },
  {
    id: 'guest-count-confirm',
    title: '确认参会人数',
    description: '收集回执，确认最终参会人数',
    defaultDaysBeforeEvent: 10,
    defaultPriority: 'medium',
    suggestedRole: '行政',
    category: '嘉宾',
  },
  {
    id: 'guest-exhibitor-invite',
    title: '邀请参展商/艺术家',
    description: '联系参展方，确认展品和展位分配',
    defaultDaysBeforeEvent: 30,
    defaultPriority: 'high',
    suggestedRole: '运营',
    category: '嘉宾',
  },
  {
    id: 'guest-attendance-confirm',
    title: '确认出席人数',
    description: '统计最终参加人数',
    defaultDaysBeforeEvent: 2,
    defaultPriority: 'medium',
    suggestedRole: '行政',
    category: '嘉宾',
  },

  // ==================== 物料类任务 ====================
  {
    id: 'material-ppt-prepare',
    title: '准备演示材料',
    description: '制作PPT、演示文稿等会议材料',
    defaultDaysBeforeEvent: 14,
    defaultPriority: 'medium',
    suggestedRole: '内容负责人',
    category: '物料',
  },
  {
    id: 'material-booth-design',
    title: '展位设计',
    description: '设计展位布局、视觉风格、搭建方案',
    defaultDaysBeforeEvent: 35,
    defaultPriority: 'high',
    suggestedRole: '设计师',
    category: '物料',
  },
  {
    id: 'material-design-produce',
    title: '设计制作物料',
    description: '邀请函、背景板、席卡、奖杯等',
    defaultDaysBeforeEvent: 14,
    defaultPriority: 'medium',
    suggestedRole: '设计师',
    category: '物料',
  },
  {
    id: 'material-purchase',
    title: '购买物资',
    description: '准备活动道具、奖品、食物饮料等',
    defaultDaysBeforeEvent: 5,
    defaultPriority: 'medium',
    suggestedRole: '行政',
    category: '物料',
  },

  // ==================== 餐饮类任务 ====================
  {
    id: 'catering-tea-break',
    title: '安排茶歇餐饮',
    description: '根据人数预订茶歇和午餐',
    defaultDaysBeforeEvent: 7,
    defaultPriority: 'medium',
    suggestedRole: '行政',
    category: '餐饮',
  },
  {
    id: 'catering-accommodation-confirm',
    title: '确认餐饮和住宿',
    description: '最终确认用餐人数和住宿安排',
    defaultDaysBeforeEvent: 5,
    defaultPriority: 'high',
    suggestedRole: '行政',
    category: '餐饮',
  },

  // ==================== 技术类任务 ====================
  {
    id: 'tech-equipment-test',
    title: '测试设备',
    description: '提前测试投影、音响、视频会议等设备',
    defaultDaysBeforeEvent: 3,
    defaultPriority: 'high',
    suggestedRole: '技术支持',
    category: '技术',
  },

  // ==================== 行政类任务 ====================
  {
    id: 'admin-site-setup',
    title: '现场布置',
    description: '桌椅摆放、指引标识、签到台准备',
    defaultDaysBeforeEvent: 1,
    defaultPriority: 'high',
    suggestedRole: '行政',
    category: '行政',
  },
  {
    id: 'admin-site-prepare',
    title: '现场准备',
    description: '签到台、引导标识、摄影摄像安排',
    defaultDaysBeforeEvent: 1,
    defaultPriority: 'high',
    suggestedRole: '行政',
    category: '行政',
  },
  {
    id: 'admin-volunteer-training',
    title: '志愿者培训',
    description: '培训现场工作人员和志愿者',
    defaultDaysBeforeEvent: 2,
    defaultPriority: 'medium',
    suggestedRole: '项目负责人',
    category: '行政',
  },
  {
    id: 'admin-site-organize',
    title: '现场组织',
    description: '签到、分组、活动环节把控',
    defaultDaysBeforeEvent: 0,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '行政',
  },

  // ==================== 财务类任务 ====================
  {
    id: 'finance-budget-approval',
    title: '预算审批',
    description: '编制年会预算并提交审批',
    defaultDaysBeforeEvent: 55,
    defaultPriority: 'high',
    suggestedRole: '项目负责人',
    category: '财务',
  },
]

// ============================================
// 活动模板定义 - 引用任务库中的任务 ID
// ============================================

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'meetup',
    name: 'Meetup',
    icon: 'Users',
    description: '适合社区交流、主题分享、行业 Meetup 等轻量线下活动',
    taskIds: [
      'theme-design',
      'guest-topic-confirm',
      'guest-slides-confirm',
      'venue-confirm-equipment',
      'promo-registration-open',
      'promo-social-media',
      'promo-send-reminder',
      'promo-materials-print',
      'promo-post-event',
      'guest-send-invitation',
      'material-ppt-prepare',
      'material-design-produce',
      'material-purchase',
      'catering-tea-break',
      'tech-equipment-test',
      'admin-site-setup',
    ],
  },
  {
    id: 'exhibition',
    name: '展览',
    icon: 'Store',
    description: '适合艺术展览、产品展示、创意市集等展示类活动',
    taskIds: [
      'agenda-planning',
      'guest-topic-confirm',
      'guest-slides-confirm',
      'exhibition-scale-confirm',
      'activity-plan-confirm',
      'venue-confirm-equipment',
      'venue-booth-setup',
      'venue-opening-check',
      'venue-stage-setup',
      'promo-registration-open',
      'promo-social-media',
      'promo-send-reminder',
      'promo-materials-print',
      'promo-post-event',
      'guest-send-invitation',
      'material-ppt-prepare',
      'material-booth-design',
      'material-design-produce',
      'material-purchase',
      'catering-tea-break',
      'tech-equipment-test',
      'admin-site-setup',
      'admin-volunteer-training',
      'admin-site-organize',
    ],
  },
  {
    id: 'workshop',
    name: 'Workshop',
    icon: 'PanelsTopLeft',
    description: '适合共创工作坊、培训营、产品体验课等强互动活动',
    taskIds: [
      'theme-design',
      'guest-topic-confirm',
      'guest-slides-confirm',
      'activity-plan-confirm',
      'venue-confirm-equipment',
      'promo-registration-open',
      'promo-social-media',
      'promo-send-reminder',
      'promo-materials-print',
      'promo-post-event',
      'guest-send-invitation',
      'material-ppt-prepare',
      'material-design-produce',
      'material-purchase',
      'catering-tea-break',
      'tech-equipment-test',
      'admin-site-setup',
    ],
  },
  {
    id: 'private',
    name: '超音速闭门活动',
    icon: 'LockKeyhole',
    description: '适合邀请制闭门会、小范围深度交流和高保密筹备活动',
    taskIds: [
      'theme-design',
      'guest-topic-confirm',
      'guest-slides-confirm',
      'venue-confirm-equipment',
      'promo-registration-open',
      'promo-send-reminder',
      'promo-post-event',
      'guest-send-invitation',
      'material-ppt-prepare',
      'material-design-produce',
      'material-purchase',
      'catering-tea-break',
      'tech-equipment-test',
      'admin-site-setup',
    ],
  },
]

// ============================================
// 辅助函数
// ============================================

/**
 * 获取完整的任务库
 */
export function getTaskLibrary(): TaskLibraryItem[] {
  return TASK_LIBRARY
}

/**
 * 根据 ID 列表获取任务库中的任务
 */
export function getTasksByIds(ids: string[]): TaskLibraryItem[] {
  return TASK_LIBRARY.filter((task) => ids.includes(task.id))
}

/**
 * 获取所有活动模板
 */
export function getTemplates(): EventTemplate[] {
  return EVENT_TEMPLATES
}

/**
 * 根据 ID 获取活动模板
 */
export function getTemplateById(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((template) => template.id === id)
}

/**
 * 获取所有任务分类（去重）
 */
export function getTaskCategories(): string[] {
  const categories = new Set(TASK_LIBRARY.map((task) => task.category))
  return Array.from(categories).sort()
}

// ============================================
// 核心函数 - 为活动生成任务列表（保持向后兼容）
// ============================================

export function generateTasksForEvent(
  eventId: string,
  eventType: EventType,
  eventStartDate: string
): Omit<EventTask, 'id'>[] {
  const template = EVENT_TEMPLATES.find((t) => t.id === eventType)
  if (!template || template.taskIds.length === 0) {
    return []
  }

  const tasks = getTasksByIds(template.taskIds)
  const startDate = new Date(eventStartDate)

  return tasks.map((task) => {
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() - task.defaultDaysBeforeEvent)

    return {
      eventId,
      title: task.title,
      description: task.description,
      assigneeId: '',
      status: 'pending' as const,
      priority: task.defaultPriority,
      dueDate: dueDate.toISOString().split('T')[0],
      daysBeforeEvent: task.defaultDaysBeforeEvent,
      reminderSent: false,
      createdAt: new Date().toISOString(),
    }
  })
}

// ============================================
// 向后兼容的辅助函数（已废弃，建议使用新函数）
// ============================================

interface LegacyTaskTemplate {
  title: string
  description: string
  daysBeforeEvent: number
  priority: TaskPriority
  suggestedRole: string
}

/**
 * @deprecated 建议使用 getTemplateById 和 getTasksByIds
 * 获取指定活动类型的任务模板列表（向后兼容）
 */
export function getTemplatesForType(eventType: EventType): LegacyTaskTemplate[] {
  const template = EVENT_TEMPLATES.find((t) => t.id === eventType)
  if (!template) return []

  const tasks = getTasksByIds(template.taskIds)
  return tasks.map((task) => ({
    title: task.title,
    description: task.description,
    daysBeforeEvent: task.defaultDaysBeforeEvent,
    priority: task.defaultPriority,
    suggestedRole: task.suggestedRole,
  }))
}
