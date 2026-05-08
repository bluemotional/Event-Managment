import { useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { getLocalTimeKey, getReminderCandidates } from '@/lib/reminders'
import { downloadCloudSnapshot, uploadCloudSnapshot } from '@/lib/cloud-sync'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Cloud,
  DatabaseBackup,
  Download,
  RefreshCw,
  Settings2,
  Upload,
} from 'lucide-react'

function parseTimes(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinTimes(value: string[]): string {
  return value.join(', ')
}

export function SettingsPage() {
  const { feishuConfig, updateFeishuConfig, members, events, exportSnapshot, importSnapshot, resetDemoData } = useAppStore()
  const [appId, setAppId] = useState(feishuConfig.appId || '')
  const [firstReminderDaysBefore, setFirstReminderDaysBefore] = useState(String(feishuConfig.reminderPolicy.firstReminderDaysBefore))
  const [beforeDueTimes, setBeforeDueTimes] = useState(joinTimes(feishuConfig.reminderPolicy.beforeDueTimes))
  const [dueDateTimes, setDueDateTimes] = useState(joinTimes(feishuConfig.reminderPolicy.dueDateTimes))
  const [overdueTimes, setOverdueTimes] = useState(joinTimes(feishuConfig.reminderPolicy.overdueTimes))
  const [timezone, setTimezone] = useState(feishuConfig.reminderPolicy.timezone)
  const [saved, setSaved] = useState(false)
  const [manualNow, setManualNow] = useState(() => new Date().toISOString().slice(0, 16))
  const [importText, setImportText] = useState('')
  const [backupResult, setBackupResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [syncToken, setSyncToken] = useState('')
  const [cloudBusy, setCloudBusy] = useState<'upload' | 'download' | null>(null)
  const [cloudResult, setCloudResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const previewCandidates = useMemo(() => {
    const now = manualNow ? new Date(manualNow) : new Date()
    return getReminderCandidates(events, members, feishuConfig.reminderPolicy, now)
  }, [events, feishuConfig.reminderPolicy, manualNow, members])

  const saveSettings = () => {
    updateFeishuConfig({
      appId,
      enabled: true,
      reminderPolicy: {
        firstReminderDaysBefore: Number(firstReminderDaysBefore) || 3,
        beforeDueTimes: parseTimes(beforeDueTimes),
        dueDateTimes: parseTimes(dueDateTimes),
        overdueTimes: parseTimes(overdueTimes),
        timezone: timezone || 'Asia/Shanghai',
      },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleExport = () => {
    const json = exportSnapshot()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `qoder-event-backup-${date}.json`
    link.click()
    URL.revokeObjectURL(url)
    setBackupResult({ type: 'success', message: '备份文件已生成' })
  }

  const handleImport = () => {
    const result = importSnapshot(importText)
    if (result.success) {
      setImportText('')
      setBackupResult({ type: 'success', message: '备份已导入，已回到仪表盘' })
      window.location.hash = '/dashboard'
      return
    }
    setBackupResult({ type: 'error', message: result.error || '导入失败' })
  }

  const handleResetDemo = () => {
    if (!window.confirm('确定要恢复演示数据吗？当前本地活动、成员、模板和权限会被覆盖。')) return
    resetDemoData()
    setBackupResult({ type: 'success', message: '已恢复演示数据' })
    window.location.hash = '/dashboard'
  }

  const handleCloudUpload = async () => {
    setCloudBusy('upload')
    setCloudResult(null)
    try {
      await uploadCloudSnapshot(exportSnapshot(), syncToken)
      setCloudResult({ type: 'success', message: '已上传当前数据到 Supabase' })
    } catch (error) {
      setCloudResult({ type: 'error', message: error instanceof Error ? error.message : '云端上传失败' })
    } finally {
      setCloudBusy(null)
    }
  }

  const handleCloudDownload = async () => {
    setCloudBusy('download')
    setCloudResult(null)
    try {
      const raw = await downloadCloudSnapshot(syncToken)
      const result = importSnapshot(raw)
      if (!result.success) {
        throw new Error(result.error || '云端数据导入失败')
      }
      setCloudResult({ type: 'success', message: '已从 Supabase 拉取并导入数据' })
      window.location.hash = '/dashboard'
    } catch (error) {
      setCloudResult({ type: 'error', message: error instanceof Error ? error.message : '云端拉取失败' })
    } finally {
      setCloudBusy(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">系统设置</h1>
        <p className="text-muted-foreground mt-1">配置飞书单人通知、提醒策略和云端定时任务</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            飞书自建应用
          </CardTitle>
          <CardDescription>
            第一版用飞书应用机器人发单人消息；App Secret 只放在 Supabase Edge Function 环境变量里。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              placeholder="cli_xxxxxxxxxxxxxxxx"
              value={appId}
              onChange={(event) => setAppId(event.target.value)}
            />
            <Button onClick={saveSettings}>保存配置</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">成员绑定</p>
              <p className="mt-1 text-sm text-foreground">成员页录入邮箱，后续用飞书通讯录 API 查询 open_id</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">发送方式</p>
              <p className="mt-1 text-sm text-foreground">单人消息，不发群，也不需要 @</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">密钥位置</p>
              <p className="mt-1 text-sm text-foreground">`.env.example` 已列出 Supabase 和飞书变量</p>
            </div>
          </div>

          {saved && (
            <div className="flex items-center gap-2 text-sm text-success animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              设置已保存
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            默认提醒策略
          </CardTitle>
          <CardDescription>
            默认提前 3 天开始，每天一次；当天 09:00 和 15:00；逾期后每天 09:00、12:00、15:00、18:00。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">提前几天开始提醒</label>
              <Input
                type="number"
                min={0}
                value={firstReminderDaysBefore}
                onChange={(event) => setFirstReminderDaysBefore(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">时区</label>
              <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">到期前提醒时间</label>
              <Input value={beforeDueTimes} onChange={(event) => setBeforeDueTimes(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">到期当天提醒时间</label>
              <Input value={dueDateTimes} onChange={(event) => setDueDateTimes(event.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">逾期后提醒时间</label>
              <Input value={overdueTimes} onChange={(event) => setOverdueTimes(event.target.value)} />
            </div>
          </div>
          <Button onClick={saveSettings}>保存提醒策略</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            手动检查提醒
          </CardTitle>
          <CardDescription>
            本地阶段先用这个确认规则命中；上线后由 Supabase Cron 自动在云端执行。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[240px_1fr] md:items-center">
            <Input type="datetime-local" value={manualNow} onChange={(event) => setManualNow(event.target.value)} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              当前检查时间：{manualNow ? getLocalTimeKey(new Date(manualNow)) : '--:--'}
            </div>
          </div>

          {previewCandidates.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-4 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              这个时间点没有命中的提醒任务
            </div>
          ) : (
            <div className="space-y-2">
              {previewCandidates.map((candidate) => (
                <div key={`${candidate.event.id}-${candidate.task.id}`} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={candidate.phase === 'overdue' ? 'urgent' : candidate.phase === 'due_today' ? 'warning' : 'default'}>
                      {candidate.phase === 'overdue' ? '逾期' : candidate.phase === 'due_today' ? '今天到期' : '提前提醒'}
                    </Badge>
                    <p className="text-sm font-medium text-foreground">{candidate.task.title}</p>
                    <p className="text-xs text-muted-foreground">发给 {candidate.member.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {candidate.event.title} · 截止 {candidate.task.dueDate}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Supabase 云端同步
          </CardTitle>
          <CardDescription>
            第一版用 Edge Function 保存一份受同步密钥保护的 JSON 快照，后续再拆成完整协作数据库。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">连接状态</p>
              <p className="mt-1 text-sm text-foreground">{isSupabaseConfigured ? '已配置前端环境变量' : '未配置 Supabase 环境变量'}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">数据入口</p>
              <p className="mt-1 text-sm text-foreground">sync-snapshot Edge Function</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">提醒入口</p>
              <p className="mt-1 text-sm text-foreground">send-reminders Edge Function + Supabase Cron</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              type="password"
              value={syncToken}
              onChange={(event) => setSyncToken(event.target.value)}
              placeholder="云端同步密钥 QODER_SYNC_TOKEN"
            />
            <Button onClick={handleCloudUpload} disabled={cloudBusy !== null}>
              <Upload className="w-4 h-4 mr-2" />
              {cloudBusy === 'upload' ? '上传中' : '上传到云端'}
            </Button>
            <Button variant="outline" onClick={handleCloudDownload} disabled={cloudBusy !== null}>
              <Download className="w-4 h-4 mr-2" />
              {cloudBusy === 'download' ? '拉取中' : '从云端拉取'}
            </Button>
          </div>

          {cloudResult && (
            <div className={`flex items-center gap-2 text-sm ${cloudResult.type === 'success' ? 'text-success' : 'text-urgent'}`}>
              {cloudResult.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {cloudResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="w-5 h-5 text-primary" />
            本地数据备份
          </CardTitle>
          <CardDescription>
            当前数据保存在浏览器本地。正式接 Supabase 前，建议经常导出 JSON 备份。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              导出 JSON 备份
            </Button>
            <Button variant="outline" onClick={handleResetDemo}>
              <RefreshCw className="w-4 h-4 mr-2" />
              恢复演示数据
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">导入 JSON 备份</label>
            <Textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="把导出的 qoder-event-backup-xxxx-xx-xx.json 内容粘贴到这里"
              className="min-h-32 font-mono text-xs"
            />
            <Button variant="secondary" onClick={handleImport} disabled={!importText.trim()}>
              <Upload className="w-4 h-4 mr-2" />
              导入备份
            </Button>
          </div>

          {backupResult && (
            <div className={`flex items-center gap-2 text-sm ${backupResult.type === 'success' ? 'text-success' : 'text-urgent'}`}>
              {backupResult.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {backupResult.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
