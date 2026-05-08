import { Event, EventTask, ReminderPolicy, TeamMember } from '@/types'

export interface ReminderCandidate {
  event: Event
  task: EventTask
  member: TeamMember
  daysUntilDue: number
  phase: 'before_due' | 'due_today' | 'overdue'
}

export const DEFAULT_REMINDER_POLICY: ReminderPolicy = {
  firstReminderDaysBefore: 3,
  beforeDueTimes: ['09:00'],
  dueDateTimes: ['09:00', '15:00'],
  overdueTimes: ['09:00', '12:00', '15:00', '18:00'],
  timezone: 'Asia/Shanghai',
}

export function getLocalDateKey(date = new Date()): string {
  return date.toISOString().split('T')[0]
}

export function getLocalTimeKey(date = new Date()): string {
  return date.toTimeString().slice(0, 5)
}

export function getDaysUntilDue(dueDate: string, today = new Date()): number {
  const todayDate = new Date(getLocalDateKey(today))
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
}

export function getReminderTimesForDay(daysUntilDue: number, policy: ReminderPolicy): string[] {
  if (daysUntilDue < 0) return policy.overdueTimes
  if (daysUntilDue === 0) return policy.dueDateTimes
  if (daysUntilDue <= policy.firstReminderDaysBefore) return policy.beforeDueTimes
  return []
}

export function getReminderPhase(daysUntilDue: number): ReminderCandidate['phase'] {
  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue === 0) return 'due_today'
  return 'before_due'
}

export function getReminderCandidates(
  events: Event[],
  members: TeamMember[],
  policy: ReminderPolicy,
  now = new Date()
): ReminderCandidate[] {
  const currentTime = getLocalTimeKey(now)

  return events.flatMap((event) =>
    event.tasks.flatMap((task) => {
      if (task.status === 'completed' || !task.assigneeId) return []

      const member = members.find((item) => item.id === task.assigneeId)
      if (!member) return []

      const daysUntilDue = getDaysUntilDue(task.dueDate, now)
      const reminderTimes = getReminderTimesForDay(daysUntilDue, policy)
      if (!reminderTimes.includes(currentTime)) return []

      return [{
        event,
        task,
        member,
        daysUntilDue,
        phase: getReminderPhase(daysUntilDue),
      }]
    })
  )
}
