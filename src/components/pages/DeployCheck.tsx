import { useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { checkEdgeFunctions, FunctionHealth } from '@/lib/deployment-health'
import { isSupabaseConfigured, supabaseEnv } from '@/lib/supabase'
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  KeyRound,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Timer,
  WalletCards,
} from 'lucide-react'

type CheckState = 'ready' | 'warning' | 'missing'

type CheckItem = {
  title: string
  description: string
  state: CheckState
}

function statusBadge(state: CheckState) {
  if (state === 'ready') return <Badge variant="success">已就绪</Badge>
  if (state === 'warning') return <Badge variant="warning">待确认</Badge>
  return <Badge variant="urgent">未完成</Badge>
}

function statusIcon(state: CheckState) {
  if (state === 'ready') return <CheckCircle2 className="w-4 h-4 text-success" />
  if (state === 'warning') return <AlertCircle className="w-4 h-4 text-warning" />
  return <AlertCircle className="w-4 h-4 text-urgent" />
}

export function DeployCheckPage() {
  const { members, events, feishuConfig } = useAppStore()
  const [syncToken, setSyncToken] = useState('')
  const [checking, setChecking] = useState(false)
  const [functionHealth, setFunctionHealth] = useState<FunctionHealth[] | null>(null)
  const [healthError, setHealthError] = useState('')

  const checks = useMemo<CheckItem[]>(() => {
    const unfinishedTasks = events.flatMap((event) => event.tasks.filter((task) => task.status !== 'completed'))
    const assignedTasks = unfinishedTasks.filter((task) => task.assigneeId)
    const openIdCount = members.filter((member) => member.feishuOpenId).length
    const hasReminderTimes = feishuConfig.reminderPolicy.beforeDueTimes.length > 0
      && feishuConfig.reminderPolicy.dueDateTimes.length > 0
      && feishuConfig.reminderPolicy.overdueTimes.length > 0

    return [
      {
        title: 'Supabase 前端变量',
        description: isSupabaseConfigured ? `已连接 ${supabaseEnv.url}` : '需要 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY',
        state: isSupabaseConfigured ? 'ready' : 'missing',
      },
      {
        title: '云端同步密钥',
        description: syncToken ? '本页检查会用它访问管理类 Edge Functions' : '请输入 QODER_SYNC_TOKEN 后再检查云端函数',
        state: syncToken ? 'ready' : 'missing',
      },
      {
        title: '成员飞书 open_id',
        description: openIdCount === members.length
          ? '所有成员都已绑定 open_id'
          : `已绑定 ${openIdCount} / ${members.length} 人；提醒只能发给已绑定成员`,
        state: members.length > 0 && openIdCount === members.length ? 'ready' : openIdCount > 0 ? 'warning' : 'missing',
      },
      {
        title: '任务负责人',
        description: unfinishedTasks.length === 0
          ? '当前没有未完成任务'
          : `未完成任务 ${unfinishedTasks.length} 个，已分配 ${assignedTasks.length} 个`,
        state: unfinishedTasks.length === 0 || assignedTasks.length === unfinishedTasks.length ? 'ready' : assignedTasks.length > 0 ? 'warning' : 'missing',
      },
      {
        title: '提醒时间策略',
        description: hasReminderTimes
          ? `提前 ${feishuConfig.reminderPolicy.firstReminderDaysBefore} 天开始，时区 ${feishuConfig.reminderPolicy.timezone}`
          : '需要设置到期前、当天、逾期后的提醒时间',
        state: hasReminderTimes ? 'ready' : 'missing',
      },
      {
        title: '免费优先部署',
        description: '当前设计只依赖 Supabase Free/Hobby 类免费层和 Vercel 前端部署；暂不需要付费服务',
        state: 'ready',
      },
    ]
  }, [events, feishuConfig.reminderPolicy, members, syncToken])

  const readyCount = checks.filter((check) => check.state === 'ready').length
  const functionReadyCount = functionHealth?.filter((item) => item.ok).length || 0

  const handleCheckFunctions = async () => {
    setChecking(true)
    setHealthError('')
    setFunctionHealth(null)
    try {
      const results = await checkEdgeFunctions(syncToken)
      setFunctionHealth(results)
    } catch (error) {
      setHealthError(error instanceof Error ? error.message : '检查失败')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">部署检查</h1>
          <p className="text-muted-foreground mt-1">上线前把数据库、飞书、提醒和免费层限制逐项过一遍</p>
        </div>
        <Badge variant={readyCount === checks.length ? 'success' : 'warning'}>
          {readyCount} / {checks.length} 项就绪
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <WalletCards className="w-4 h-4" />
                免费优先
              </div>
              <h2 className="mt-3 text-xl font-semibold text-foreground">先用免费云服务跑通真实流程</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                当前路线是 Vercel 托管前端、Supabase 承担数据库和 Edge Functions。等活动数据量、团队规模或提醒频率真的超出免费层，再决定是否升级。
              </p>
            </div>
            <div className="border-t bg-secondary/50 p-6 md:border-l md:border-t-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-card p-4">
                  <p className="text-xs text-muted-foreground">本地入口</p>
                  <p className="mt-1 text-sm font-medium text-foreground">5174</p>
                </div>
              <div className="rounded-lg bg-card p-4">
                <p className="text-xs text-muted-foreground">云端函数</p>
                <p className="mt-1 text-sm font-medium text-foreground">{functionHealth ? `${functionReadyCount} / 4` : '待检查'}</p>
              </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {checks.map((check) => (
          <Card key={check.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{statusIcon(check.state)}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{check.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{check.description}</p>
                  </div>
                </div>
                {statusBadge(check.state)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Edge Functions 检查
          </CardTitle>
          <CardDescription>
            部署 Supabase Functions 后，用同步密钥检查 4 个云端入口是否能响应。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              type="password"
              value={syncToken}
              onChange={(event) => setSyncToken(event.target.value)}
              placeholder="QODER_SYNC_TOKEN"
            />
            <Button onClick={handleCheckFunctions} disabled={checking || !isSupabaseConfigured}>
              <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              {checking ? '检查中' : '检查云端函数'}
            </Button>
          </div>

          {healthError && (
            <div className="rounded-lg border border-urgent/30 bg-urgent/10 p-4 text-sm text-urgent">
              {healthError}
            </div>
          )}

          {functionHealth && (
            <div className="grid gap-3 md:grid-cols-3">
              {functionHealth.map((item) => (
                <div key={item.name} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <Badge variant={item.ok ? 'success' : 'urgent'}>{item.ok ? '通过' : '失败'}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="w-4 h-4 text-primary" />
              先做
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Supabase 建项目，执行 `supabase/schema.sql`。</p>
            <p>2. 部署 `feishu-auth`、`sync-snapshot`、`resolve-feishu-users`、`send-reminders`。</p>
            <p>3. 在 Vercel 只配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="w-4 h-4 text-primary" />
              别泄露
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>`SUPABASE_SERVICE_ROLE_KEY` 是 Supabase 内置变量，不要手动设置。</p>
            <p>`FEISHU_APP_SECRET` 只放 Supabase secrets。</p>
            <p>`QODER_SYNC_TOKEN` 当成管理密码保存。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="w-4 h-4 text-primary" />
              最后开
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>先确认成员 open_id 都绑定。</p>
            <p>手动测试 `send-reminders` 能发单人消息。</p>
            <p>最后再启用 Supabase Cron。</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <ShieldCheck className="mt-0.5 w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">权限提醒</p>
            <p className="mt-1 text-sm text-muted-foreground">
              现在的检查页是部署辅助，不替代正式登录权限。对外展示前，下一阶段要把飞书登录或 Supabase Auth 接上，再做数据库 RLS 隔离。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
