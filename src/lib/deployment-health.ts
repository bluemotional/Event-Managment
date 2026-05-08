import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type FunctionHealth = {
  name: string
  label: string
  ok: boolean
  message: string
}

const functions = [
  { name: 'sync-snapshot', label: '云端快照同步' },
  { name: 'resolve-feishu-users', label: '飞书 open_id 绑定' },
  { name: 'send-reminders', label: '飞书定时提醒' },
]

export async function checkEdgeFunctions(syncToken: string): Promise<FunctionHealth[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 前端环境变量还没有配置')
  }
  const client = supabase

  const results = await Promise.all(functions.map(async (item) => {
    try {
      const { data, error } = await client.functions.invoke<Record<string, unknown>>(item.name, {
        body: { action: 'health' },
        headers: syncToken.trim() ? { 'x-sync-token': syncToken.trim() } : undefined,
      })

      if (error) {
        return {
          ...item,
          ok: false,
          message: error.message,
        }
      }

      return {
        ...item,
        ok: Boolean(data?.ok),
        message: data?.ok ? '已响应' : '未返回健康状态',
      }
    } catch (error) {
      return {
        ...item,
        ok: false,
        message: error instanceof Error ? error.message : '检查失败',
      }
    }
  }))

  return results
}
