import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const FEISHU_SESSION_STORAGE_KEY = 'qoder-feishu-session'
const FEISHU_LOGIN_STATE_STORAGE_KEY = 'qoder-feishu-login-state'

type AuthResponse = {
  appId?: string
  sessionToken?: string
  memberId?: string
  memberName?: string
  error?: string
}

function assertSupabaseReady() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 还没有配置，请先设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
  }
}

function randomState(): string {
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function getFeishuSessionToken(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(FEISHU_SESSION_STORAGE_KEY) || ''
}

export function hasFeishuSessionToken(): boolean {
  return Boolean(getFeishuSessionToken())
}

export function saveFeishuSessionToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FEISHU_SESSION_STORAGE_KEY, token)
}

export function clearFeishuSessionToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(FEISHU_SESSION_STORAGE_KEY)
}

export async function getFeishuAuthConfig(): Promise<{ appId: string }> {
  assertSupabaseReady()
  const { data, error } = await supabase!.functions.invoke<AuthResponse>('feishu-auth', {
    body: { action: 'config' },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  if (!data?.appId) throw new Error('飞书应用 ID 还没有配置')
  return { appId: data.appId }
}

export async function startFeishuLogin() {
  const { appId } = await getFeishuAuthConfig()
  const state = randomState()
  window.localStorage.setItem(FEISHU_LOGIN_STATE_STORAGE_KEY, state)

  const redirectUri = `${window.location.origin}${window.location.pathname}`
  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    state,
  })
  window.location.href = `https://accounts.feishu.cn/open-apis/authen/v1/index?${params.toString()}`
}

export async function exchangeFeishuCode(code: string, state: string | null): Promise<AuthResponse> {
  assertSupabaseReady()
  const expectedState = window.localStorage.getItem(FEISHU_LOGIN_STATE_STORAGE_KEY)
  if (expectedState && state !== expectedState) {
    throw new Error('飞书登录状态校验失败，请重新登录')
  }

  const redirectUri = `${window.location.origin}${window.location.pathname}`
  const { data, error } = await supabase!.functions.invoke<AuthResponse>('feishu-auth', {
    body: { action: 'login', code, redirectUri },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  if (!data?.sessionToken || !data.memberId) throw new Error('飞书登录没有返回有效会话')

  saveFeishuSessionToken(data.sessionToken)
  window.localStorage.removeItem(FEISHU_LOGIN_STATE_STORAGE_KEY)
  return data
}

export async function verifyFeishuSession(): Promise<AuthResponse> {
  assertSupabaseReady()
  const token = getFeishuSessionToken()
  if (!token) throw new Error('还没有飞书登录会话')

  const { data, error } = await supabase!.functions.invoke<AuthResponse>('feishu-auth', {
    body: { action: 'verify' },
    headers: { 'x-feishu-session': token },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  if (!data?.memberId) throw new Error('飞书会话无效')
  return data
}
