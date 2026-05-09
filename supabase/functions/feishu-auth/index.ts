import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-feishu-session',
}

type AuthBody = {
  action?: 'config' | 'login' | 'verify' | 'health'
  code?: string
  redirectUri?: string
}

type SnapshotMember = {
  id: string
  name: string
  email?: string
  feishuId?: string
  feishuOpenId?: string
  feishuUserId?: string
}

type AppSnapshot = {
  members?: SnapshotMember[]
  adminMemberIds?: string[]
  eventEditorMemberIds?: string[]
}

type FeishuProfile = {
  open_id?: string
  user_id?: string
  union_id?: string
  email?: string
  mobile?: string
  name?: string
  en_name?: string
}

type SessionPayload = {
  memberId: string
  openId?: string
  userId?: string
  exp: number
}

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

async function signSession(payload: SessionPayload): Promise<string> {
  const secret = Deno.env.get('QODER_SYNC_TOKEN')
  if (!secret) throw new Error('Missing QODER_SYNC_TOKEN')

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${header}.${body}`
  const signature = await hmac(signingInput, secret)
  return `${signingInput}.${signature}`
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

async function getAppAccessToken(): Promise<string> {
  const appId = Deno.env.get('FEISHU_APP_ID')
  const appSecret = Deno.env.get('FEISHU_APP_SECRET')
  if (!appId || !appSecret) throw new Error('Missing FEISHU_APP_ID or FEISHU_APP_SECRET')

  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  })
  const data = await response.json()
  if (data.code !== 0) throw new Error(data.msg || 'Failed to get Feishu app token')
  return data.app_access_token
}

async function getFeishuProfile(code: string, redirectUri: string): Promise<FeishuProfile> {
  const appToken = await getAppAccessToken()
  const tokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })
  const tokenData = await tokenResponse.json()
  if (tokenData.code !== 0) throw new Error(tokenData.msg || 'Failed to exchange Feishu login code')

  const accessToken = tokenData.data?.access_token
  if (!accessToken) {
    return tokenData.data as FeishuProfile
  }

  const userResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const userData = await userResponse.json()
  if (userData.code !== 0) throw new Error(userData.msg || 'Failed to get Feishu user info')
  return userData.data as FeishuProfile
}

async function getSnapshot(): Promise<AppSnapshot> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)
  const { data, error } = await supabase
    .from('app_snapshots')
    .select('payload')
    .eq('id', 'default')
    .maybeSingle()

  if (error) throw error
  if (!data?.payload) throw new Error('Cloud snapshot is not ready')
  return data.payload as AppSnapshot
}

function findMember(snapshot: AppSnapshot, profile: FeishuProfile): SnapshotMember | undefined {
  const members = snapshot.members || []
  const profileOpenId = profile.open_id?.trim()
  const profileUserId = profile.user_id?.trim()
  const profileEmail = profile.email?.toLowerCase()
  const profileMobile = profile.mobile?.replace(/\D/g, '')

  return members.find((member) => {
    const memberOpenId = member.feishuOpenId?.trim()
    const memberUserId = member.feishuUserId?.trim()
    const memberFeishuId = member.feishuId?.trim()
    const memberEmail = member.email?.toLowerCase()
    const memberFeishuIdLower = memberFeishuId?.toLowerCase()
    const memberPhone = memberFeishuId?.replace(/\D/g, '')

    return (
      Boolean(profileOpenId && (
        memberOpenId === profileOpenId ||
        memberUserId === profileOpenId ||
        memberFeishuId === profileOpenId
      )) ||
      Boolean(profileUserId && (
        memberUserId === profileUserId ||
        memberOpenId === profileUserId ||
        memberFeishuId === profileUserId
      )) ||
      Boolean(profileEmail && (
        memberEmail === profileEmail ||
        memberFeishuIdLower === profileEmail
      )) ||
      Boolean(profileMobile && memberPhone === profileMobile)
    )
  })
}

function memberRole(snapshot: AppSnapshot, memberId: string): 'admin' | 'editor' | 'member' {
  if ((snapshot.adminMemberIds || []).includes(memberId)) return 'admin'
  if ((snapshot.eventEditorMemberIds || []).includes(memberId)) return 'editor'
  return 'member'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as AuthBody
    const appId = Deno.env.get('FEISHU_APP_ID')

    if (body.action === 'health') {
      return json({
        ok: true,
        hasFeishuSecrets: Boolean(appId && Deno.env.get('FEISHU_APP_SECRET')),
        hasSessionSecret: Boolean(Deno.env.get('QODER_SYNC_TOKEN')),
      })
    }

    if (body.action === 'config') {
      if (!appId) return json({ error: 'Missing FEISHU_APP_ID' }, 500)
      return json({ appId })
    }

    if (body.action === 'verify') {
      const token = request.headers.get('x-feishu-session') || ''
      const session = await verifySession(token)
      const snapshot = await getSnapshot()
      const member = (snapshot.members || []).find((item) => item.id === session.memberId)
      if (!member) return json({ error: 'Member no longer exists' }, 403)
      return json({
        ok: true,
        memberId: member.id,
        memberName: member.name,
        role: memberRole(snapshot, member.id),
      })
    }

    if (body.action === 'login') {
      if (!body.code || !body.redirectUri) {
        return json({ error: 'Missing Feishu login code or redirectUri' }, 400)
      }

      const profile = await getFeishuProfile(body.code, body.redirectUri)
      const snapshot = await getSnapshot()
      const member = findMember(snapshot, profile)
      if (!member) {
        return json({
          error: '你的飞书账号还没有匹配到系统成员。请联系管理员确认：成员资料已同步到云端，并且成员里填写的是邮箱、手机号、open_id 或 user_id 中的一种。',
        }, 403)
      }

      const sessionToken = await signSession({
        memberId: member.id,
        openId: profile.open_id,
        userId: profile.user_id,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      })

      return json({
        ok: true,
        sessionToken,
        memberId: member.id,
        memberName: member.name,
        role: memberRole(snapshot, member.id),
      })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
})
