import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { getFeishuSessionToken } from '@/lib/feishu-auth'

export const CLOUD_SYNC_TOKEN_STORAGE_KEY = 'qoder-event-sync-token'
export const CLOUD_SYNC_TOKEN_CHANGED_EVENT = 'qoder-cloud-sync-token-change'

type SyncResponse = {
  payload?: unknown
  updated_at?: string
  error?: string
}

type ReminderResponse = {
  sent?: number
  candidates?: number
  skipped?: string
  errors?: string[]
  error?: string
}

function getCloudAuthHeaders(syncToken?: string): Record<string, string> {
  const trimmedSyncToken = syncToken?.trim() || getSavedSyncToken().trim()
  if (trimmedSyncToken) return { 'x-sync-token': trimmedSyncToken }

  const sessionToken = getFeishuSessionToken()
  if (sessionToken) return { 'x-feishu-session': sessionToken }

  return {}
}

function assertReady(syncToken?: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 还没有配置，请先设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
  }
  if (Object.keys(getCloudAuthHeaders(syncToken)).length === 0) {
    throw new Error('请先使用飞书登录，或输入云端同步密钥')
  }
}

export function getSavedSyncToken(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(CLOUD_SYNC_TOKEN_STORAGE_KEY) || ''
}

export function saveSyncToken(syncToken: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CLOUD_SYNC_TOKEN_STORAGE_KEY, syncToken)
  window.dispatchEvent(new Event(CLOUD_SYNC_TOKEN_CHANGED_EVENT))
}

export function hasCloudCredentials(): boolean {
  return Object.keys(getCloudAuthHeaders()).length > 0
}

export async function uploadCloudSnapshot(snapshotJson: string, syncToken?: string) {
  assertReady(syncToken)
  const payload = JSON.parse(snapshotJson)
  const { data, error } = await supabase!.functions.invoke<SyncResponse>('sync-snapshot', {
    body: { action: 'upload', payload },
    headers: getCloudAuthHeaders(syncToken),
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

export async function downloadCloudSnapshot(syncToken?: string) {
  assertReady(syncToken)
  const { data, error } = await supabase!.functions.invoke<SyncResponse>('sync-snapshot', {
    body: { action: 'download' },
    headers: getCloudAuthHeaders(syncToken),
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  if (!data?.payload) throw new Error('云端还没有可拉取的数据')
  return JSON.stringify(data.payload, null, 2)
}

export async function sendManualReminders(options?: { syncToken?: string; now?: string }) {
  assertReady(options?.syncToken)
  const { data, error } = await supabase!.functions.invoke<ReminderResponse>('send-reminders', {
    body: {
      action: 'manual',
      now: options?.now,
    },
    headers: getCloudAuthHeaders(options?.syncToken),
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}
