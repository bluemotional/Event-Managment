import { isSupabaseConfigured, supabase } from '@/lib/supabase'

type SyncResponse = {
  payload?: unknown
  updated_at?: string
  error?: string
}

function assertReady(syncToken: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 还没有配置，请先设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
  }
  if (!syncToken.trim()) {
    throw new Error('请输入云端同步密钥')
  }
}

export async function uploadCloudSnapshot(snapshotJson: string, syncToken: string) {
  assertReady(syncToken)
  const payload = JSON.parse(snapshotJson)
  const { data, error } = await supabase!.functions.invoke<SyncResponse>('sync-snapshot', {
    body: { action: 'upload', payload },
    headers: { 'x-sync-token': syncToken.trim() },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

export async function downloadCloudSnapshot(syncToken: string) {
  assertReady(syncToken)
  const { data, error } = await supabase!.functions.invoke<SyncResponse>('sync-snapshot', {
    body: { action: 'download' },
    headers: { 'x-sync-token': syncToken.trim() },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  if (!data?.payload) throw new Error('云端还没有可拉取的数据')
  return JSON.stringify(data.payload, null, 2)
}
