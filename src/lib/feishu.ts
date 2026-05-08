import { Event, EventTask, TeamMember, FeishuConfig } from '@/types'
import { getReminderCandidates } from '@/lib/reminders'

interface FeishuMessage {
  msg_type: 'interactive'
  card: {
    header: {
      title: { tag: string; content: string }
      template: string
    }
    elements: Array<{
      tag: string
      text?: { tag: string; content: string }
      fields?: Array<{ is_short: boolean; text: { tag: string; content: string } }>
      actions?: Array<{ tag: string; text: { tag: string; content: string }; url: string; type: string }>
    }>
  }
}

/**
 * Build a Feishu card message for task reminder
 */
export function buildTaskReminderMessage(
  task: EventTask,
  event: Event,
  assignee: TeamMember,
  daysUntilDue: number
): FeishuMessage {
  const urgencyTemplate = daysUntilDue <= 1 ? 'red' : daysUntilDue <= 3 ? 'orange' : 'blue'
  const urgencyText = daysUntilDue <= 0 ? '⚠️ 已逾期' : daysUntilDue === 1 ? '⏰ 明天到期' : `📅 ${daysUntilDue} 天后到期`

  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: '📋 活动筹备提醒' },
        template: urgencyTemplate,
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `<at id=${assignee.feishuId}>${assignee.name}</at> 你有一个任务需要处理：`,
          },
        },
        {
          tag: 'div',
          fields: [
            { is_short: true, text: { tag: 'lark_md', content: `**📌 任务**\n${task.title}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**${urgencyText}**\n截止: ${task.dueDate}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**📎 所属活动**\n${event.title}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**🎯 优先级**\n${task.priority === 'high' ? '紧急' : task.priority === 'medium' ? '重要' : '一般'}` } },
          ],
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看详情' },
              url: `${window.location.origin}/#/event/${event.id}`,
              type: 'primary',
            },
          ],
        },
      ],
    },
  }
}

/**
 * Build a daily digest message for a team member
 */
export function buildDailyDigestMessage(
  member: TeamMember,
  tasks: Array<{ task: EventTask; event: Event; daysUntilDue: number }>
): FeishuMessage {
  const taskListContent = tasks
    .map((t) => `• **${t.task.title}** (${t.event.title}) - ${t.daysUntilDue <= 0 ? '已逾期' : `${t.daysUntilDue}天后到期`}`)
    .join('\n')

  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: `📬 ${member.name}的今日待办` },
        template: 'blue',
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `<at id=${member.feishuId}>${member.name}</at> 你今天有 **${tasks.length}** 个任务需要关注：\n\n${taskListContent}`,
          },
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看所有任务' },
              url: `${window.location.origin}/#/tasks`,
              type: 'primary',
            },
          ],
        },
      ],
    },
  }
}

/**
 * Send message to Feishu webhook
 */
export async function sendFeishuNotification(
  webhookUrl: string,
  message: FeishuMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const data = await response.json()
    if (data.code !== 0) {
      return { success: false, error: data.msg || '发送失败' }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '网络错误' }
  }
}

/**
 * Check all tasks and send reminders based on rules
 * This would normally be called by a cron job / backend service
 */
export function checkAndSendReminders(
  events: Event[],
  members: TeamMember[],
  config: FeishuConfig
) {
  if (!config.enabled) return []
  return getReminderCandidates(events, members, config.reminderPolicy)
}
