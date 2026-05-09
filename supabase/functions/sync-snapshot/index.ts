import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token, x-feishu-session',
}

type SyncBody = {
  action?: 'upload' | 'download' | 'health'
  payload?: unknown
}

type SnapshotTask = {
  assigneeId?: string
}

type SnapshotOwnedItem = {
  ownerId?: string
}

type SnapshotEvent = {
  id: string
  tasks?: SnapshotTask[]
  budgets?: SnapshotOwnedItem[]
  materials?: SnapshotOwnedItem[]
  copyDocs?: SnapshotOwnedItem[]
}

type SnapshotAccess = {
  eventId: string
  memberId: string
  active: boolean
}

type SnapshotMember = {
  id: string
  name: string
}

type AppSnapshot = {
  events?: SnapshotEvent[]
  members?: SnapshotMember[]
  eventAccess?: SnapshotAccess[]
  adminMemberIds?: string[]
  eventEditorMemberIds?: string[]
  currentMemberId?: string
  viewerMode?: string
}

type SessionPayload = {
  memberId: string
  exp: number
}

type AuthContext =
  | { kind: 'sync-token' }
  | { kind: 'feishu-session'; memberId: string }

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function textEncoder() {
  return new TextEncoder()
}

function base64UrlEncode(value: Uint8Array | string): string {
  const bytes = typeof value === 'string' ? textEncoder().encode(value) : value
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  return atob(padded)
}

async function hmac(input: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder().encode(input))
  return base64UrlEncode(new Uint8Array(signature))
}

async function verifySession(token: string): Promise<SessionPayload> {
  const secret = Deno.env.get('QODER_SYNC_TOKEN')
  if (!secret) throw new Error('Missing QODER_SYNC_TOKEN')
  const [header, body, signature] = token.split('.')
  if (!header || !body || !signature) throw new Error('Invalid Feishu session')
  const expected = await hmac(`${header}.${body}`, secret)
  if (signature !== expected) throw new Error('Invalid Feishu session')

  const payload = JSON.parse(base64UrlDecode(body)) as SessionPayload
  if (!payload.memberId || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Feishu session expired')
  }
  return payload
}

async function authenticate(request: Request): Promise<AuthContext> {
  const expectedToken = Deno.env.get('QODER_SYNC_TOKEN')
  const providedToken = request.headers.get('x-sync-token')
  if (expectedToken && providedToken === expectedToken) return { kind: 'sync-token' }

  const feishuSession = request.headers.get('x-feishu-session')
  if (feishuSession) {
    const payload = await verifySession(feishuSession)
    return { kind: 'feishu-session', memberId: payload.memberId }
  }

  throw new Error('Invalid sync token or Feishu session')
}

function canManage(snapshot: AppSnapshot, memberId: string): boolean {
  return (snapshot.adminMemberIds || []).includes(memberId)
}

function canEdit(snapshot: AppSnapshot, memberId: string): boolean {
  return canManage(snapshot, memberId) || (snapshot.eventEditorMemberIds || []).includes(memberId)
}

function canReadEvent(snapshot: AppSnapshot, event: SnapshotEvent, memberId: string): boolean {
  const hasAccess = (snapshot.eventAccess || []).some((access) =>
    access.active &&
    access.eventId === event.id &&
    access.memberId === memberId
  )
  const hasDirectAssignment = Boolean(
    (event.tasks || []).some((task) => task.assigneeId === memberId) ||
    (event.budgets || []).some((item) => item.ownerId === memberId) ||
    (event.materials || []).some((item) => item.ownerId === memberId) ||
    (event.copyDocs || []).some((item) => item.ownerId === memberId)
  )
  return hasAccess || hasDirectAssignment
}

function filterSnapshotForMember(snapshot: AppSnapshot, memberId: string): AppSnapshot {
  if (canEdit(snapshot, memberId)) {
    return { ...snapshot, currentMemberId: memberId, viewerMode: 'member' }
  }

  const readableEvents = (snapshot.events || []).filter((event) => canReadEvent(snapshot, event, memberId))
  const readableEventIds = new Set(readableEvents.map((event) => event.id))
  return {
    ...snapshot,
    events: readableEvents,
    eventAccess: (snapshot.eventAccess || []).filter((access) =>
      access.memberId === memberId ||
      readableEventIds.has(access.eventId)
    ),
    adminMemberIds: [],
    eventEditorMemberIds: [],
    currentMemberId: memberId,
    viewerMode: 'member',
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)
    const body = (await request.json()) as SyncBody

    if (body.action === 'health') {
      await authenticate(request)
      return json({
        ok: true,
        hasServiceRole: Boolean(serviceKey),
        hasSyncToken: Boolean(Deno.env.get('QODER_SYNC_TOKEN')),
      })
    }

    const auth = await authenticate(request)

    if (body.action === 'upload') {
      if (!body.payload || typeof body.payload !== 'object') {
        return json({ error: 'Missing snapshot payload' }, 400)
      }

      if (auth.kind === 'feishu-session') {
        const { data: currentSnapshot, error: currentError } = await supabase
          .from('app_snapshots')
          .select('payload')
          .eq('id', 'default')
          .maybeSingle()
        if (currentError) throw currentError
        if (!currentSnapshot?.payload || !canEdit(currentSnapshot.payload as AppSnapshot, auth.memberId)) {
          return json({ error: '当前飞书账号没有活动编辑权限，不能保存云端数据' }, 403)
        }
      }

      const { data, error } = await supabase
        .from('app_snapshots')
        .upsert({
          id: 'default',
          payload: body.payload,
          updated_at: new Date().toISOString(),
        })
        .select('updated_at')
        .single()

      if (error) throw error
      return json({ updated_at: data.updated_at })
    }

    if (body.action === 'download') {
      const { data, error } = await supabase
        .from('app_snapshots')
        .select('payload,updated_at')
        .eq('id', 'default')
        .maybeSingle()

      if (error) throw error
      if (!data) return json({ error: 'No snapshot found' }, 404)
      if (auth.kind === 'sync-token') return json(data)
      return json({
        ...data,
        payload: filterSnapshotForMember(data.payload as AppSnapshot, auth.memberId),
      })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message.includes('Invalid sync token') || message.includes('Feishu session') ? 401 : 500
    return json({ error: message }, status)
  }
})
