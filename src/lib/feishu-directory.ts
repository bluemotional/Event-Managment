import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { TeamMember } from '@/types'

export type FeishuResolveResult = {
  localId: string
  name: string
  email?: string
  mobile?: string
  found: boolean
  feishuOpenId?: string
  feishuName?: string
}

type ResolveResponse = {
  results?: FeishuResolveResult[]
  errors?: string[]
  error?: string
}

function splitContact(member: TeamMember) {
  const raw = (member.email || member.feishuId || '').trim()
  if (raw.includes('@')) {
    return { email: raw }
  }
  return { mobile: raw }
}

export async function resolveFeishuMembers(members: TeamMember[], syncToken: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase 还没有配置，请先设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
  }
  if (!syncToken.trim()) {
    throw new Error('请输入云端同步密钥')
  }

  const payload = members.map((member) => ({
    localId: member.id,
    name: member.name,
    ...splitContact(member),
  }))

  const { data, error } = await supabase.functions.invoke<ResolveResponse>('resolve-feishu-users', {
    body: { members: payload },
    headers: { 'x-sync-token': syncToken.trim() },
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return {
    results: data?.results || [],
    errors: data?.errors || [],
  }
}
