import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token',
}

type ReminderPolicy = {
  firstReminderDaysBefore: number
  beforeDueTimes: string[]
  dueDateTimes: string[]
  overdueTimes: string[]
  timezone: string
}

type SnapshotMember = {
  id: string
  name: string
  feishuOpenId?: string
}

type SnapshotTask = {
  id: string
  title: string
  dueDate: string
  priority: string
  status: string
  assigneeId: string
}

type SnapshotEvent = {
  id: string
  title: string
  startDate: string
  tasks: SnapshotTask[]
}

type AppSnapshot = {
  events?: SnapshotEvent[]
  members?: SnapshotMember[]
  feishuConfig?: {
    enabled?: boolean
    reminderPolicy?: ReminderPolicy
  }
}

type ReminderCandidate = {
  task: SnapshotTask
  event: SnapshotEvent
  member: SnapshotMember
  days: number
  phase: 'overdue' | 'due_today' | 'before_due'
}

const defaultPolicy: ReminderPolicy = {
  firstReminderDaysBefore: 3,
  beforeDueTimes: ['09:00'],
  dueDateTimes: ['09:00', '15:00'],
  overdueTimes: ['09:00', '12:00', '15:00', '18:00'],
  timezone: 'Asia/Shanghai',
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function formatInZone(date: Date, timezone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const value = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  }
}

function daysUntilDue(dueDate: string, todayKey: string): number {
  const today = new Date(todayKey)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function timesForDay(days: number, settings: ReminderPolicy): string[] {
  if (days < 0) return settings.overdueTimes
  if (days === 0) return settings.dueDateTimes
  if (days <= settings.firstReminderDaysBefore) return settings.beforeDueTimes
  return []
}

function phaseForDay(days: number): ReminderCandidate['phase'] {
  if (days < 0) return 'overdue'
  if (days === 0) return 'due_today'
  return 'before_due'
}

async function getTenantAccessToken(): Promise<string> {
  const appId = Deno.env.get('FEISHU_APP_ID')
  const appSecret = Deno.env.get('FEISHU_APP_SECRET')
  if (!appId || !appSecret) throw new Error('Missing FEISHU_APP_ID or FEISHU_APP_SECRET')

  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  })
  const data = await response.json()
  if (data.code !== 0) throw new Error(data.msg || 'Failed to get Feishu token')
  return data.tenant_access_token
}

async function sendFeishuDirectMessage(token: string, receiveId: string, candidate: ReminderCandidate) {
  const { task, event, days, phase } = candidate
  const phaseText = phase === 'overdue' ? `已逾期 ${Math.abs(days)} 天` : phase === 'due_today' ? '今天到期' : `${days} 天后到期`
  const text = [
    `活动任务提醒：${task.title}`,
    `状态：${phaseText}`,
    `活动：${event.title}`,
    `截止日期：${task.dueDate}`,
    `优先级：${task.priority}`,
  ].join('\n')

  const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receive_id: receiveId,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    }),
  })
  const data = await response.json()
  if (data.code !== 0) throw new Error(data.msg || 'Failed to send Feishu message')
}

function collectCandidates(snapshot: AppSnapshot, policy: ReminderPolicy, now: Date, manual: boolean): ReminderCandidate[] {
  const zonedNow = formatInZone(now, policy.timezone)
  const currentTime = zonedNow.time
  const members = snapshot.members || []
  const events = snapshot.events || []
  const candidates: ReminderCandidate[] = []

  for (const event of events) {
    for (const task of event.tasks || []) {
      if (task.status === 'completed' || !task.assigneeId) continue
      const member = members.find((item) => item.id === task.assigneeId)
      if (!member?.feishuOpenId) continue

      const days = daysUntilDue(task.dueDate, zonedNow.date)
      const phase = phaseForDay(days)
      const scheduledNow = timesForDay(days, policy).includes(currentTime)
      const manualMatch = manual && days <= 0
      if (!scheduledNow && !manualMatch) continue

      candidates.push({ task, event, member, days, phase })
    }
  }

  return candidates
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await request.clone().json().catch(() => ({}))
    if (body?.action === 'health') {
      return json({
        ok: true,
        hasServiceRole: Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),
        hasFeishuSecrets: Boolean(Deno.env.get('FEISHU_APP_ID') && Deno.env.get('FEISHU_APP_SECRET')),
      })
    }

    const manual = body?.action === 'manual'
    if (manual) {
      const expectedToken = Deno.env.get('QODER_SYNC_TOKEN')
      const providedToken = request.headers.get('x-sync-token')
      if (!expectedToken || providedToken !== expectedToken) {
        return json({ error: 'Invalid sync token' }, 401)
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: snapshotRow, error: snapshotError } = await supabase
      .from('app_snapshots')
      .select('payload')
      .eq('id', 'default')
      .maybeSingle()
    if (snapshotError) throw snapshotError
    if (!snapshotRow?.payload) return json({ sent: 0, skipped: 'no_snapshot' })

    const snapshot = snapshotRow.payload as AppSnapshot
    const policy = snapshot.feishuConfig?.reminderPolicy || defaultPolicy
    const candidates = collectCandidates(snapshot, policy, new Date(), manual)
    if (candidates.length === 0) {
      return json({ sent: 0, candidates: 0, skipped: manual ? 'no_due_or_overdue_tasks' : 'no_scheduled_tasks_now' })
    }

    const token = await getTenantAccessToken()
    let sent = 0
    const errors: string[] = []

    for (const candidate of candidates) {
      try {
        await sendFeishuDirectMessage(token, candidate.member.feishuOpenId!, candidate)
        sent += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${candidate.member.name}/${candidate.task.title}: ${message}`)
      }
    }

    return json({
      sent,
      candidates: candidates.length,
      errors,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
})
