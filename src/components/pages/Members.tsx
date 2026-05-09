import { useState } from 'react'
import { useAppStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { resolveFeishuMembers, FeishuResolveResult } from '@/lib/feishu-directory'
import { saveSyncToken, uploadCloudSnapshot } from '@/lib/cloud-sync'
import { isSupabaseConfigured } from '@/lib/supabase'
import { canEditActivities, canManageSystem } from '@/lib/access-control'
import { AlertCircle, Check, Cloud, Pencil, RefreshCw, Trash2, UserPlus, X } from 'lucide-react'

export function Members() {
  const { members, addMember, updateMember, deleteMember, events, adminMemberIds, eventEditorMemberIds, viewerMode, currentMemberId, setSystemAdmin, setEventEditor, exportSnapshot } = useAppStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', role: '', feishuId: '', systemAdmin: false, eventEditor: false })
  const [syncToken, setSyncToken] = useState('')
  const [resolveBusy, setResolveBusy] = useState(false)
  const [resolveResult, setResolveResult] = useState<{ type: 'success' | 'error'; message: string; details?: FeishuResolveResult[] } | null>(null)
  const canManageSystemSettings = canManageSystem(adminMemberIds, viewerMode, currentMemberId)
  const canEditActivitySettings = canEditActivities(eventEditorMemberIds, adminMemberIds, viewerMode, currentMemberId)

  const handleAdd = () => {
    if (!form.name || !form.feishuId) return
    addMember({
      name: form.name,
      role: form.role,
      feishuId: form.feishuId,
      email: form.feishuId.includes('@') ? form.feishuId : undefined,
      systemAdmin: form.systemAdmin,
      eventEditor: form.eventEditor,
    })
    setForm({ name: '', role: '', feishuId: '', systemAdmin: false, eventEditor: false })
    setShowAdd(false)
  }

  const handleEdit = (id: string) => {
    updateMember(id, {
      name: form.name,
      role: form.role,
      feishuId: form.feishuId,
      email: form.feishuId.includes('@') ? form.feishuId : undefined,
    })
    setSystemAdmin(id, form.systemAdmin)
    setEventEditor(id, form.eventEditor || form.systemAdmin)
    setEditingId(null)
    setForm({ name: '', role: '', feishuId: '', systemAdmin: false, eventEditor: false })
  }

  const startEdit = (member: typeof members[0]) => {
    setEditingId(member.id)
    setForm({
      name: member.name,
      role: member.role,
      feishuId: member.feishuId,
      systemAdmin: adminMemberIds.includes(member.id),
      eventEditor: eventEditorMemberIds.includes(member.id) || adminMemberIds.includes(member.id),
    })
  }

  const handleResolveFeishuIds = async () => {
    setResolveBusy(true)
    setResolveResult(null)
    try {
      saveSyncToken(syncToken)
      const response = await resolveFeishuMembers(members, syncToken)
      const found = response.results.filter((item) => item.found && item.feishuOpenId)
      found.forEach((item) => {
        updateMember(item.localId, {
          feishuOpenId: item.feishuOpenId,
        })
      })

      if (found.length > 0) {
        await uploadCloudSnapshot(exportSnapshot(), syncToken)
      }

      const missing = response.results.filter((item) => !item.found)
      setResolveResult({
        type: missing.length === 0 ? 'success' : 'error',
        message: `已绑定 ${found.length} 人并同步到云端${missing.length > 0 ? `，${missing.length} 人未找到` : ''}`,
        details: response.results,
      })
    } catch (error) {
      setResolveResult({ type: 'error', message: error instanceof Error ? error.message : '飞书成员绑定失败' })
    } finally {
      setResolveBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">团队成员</h1>
          <p className="text-muted-foreground mt-1">管理团队成员和飞书通知配置</p>
        </div>
        {canEditActivitySettings && (
        <Button onClick={() => setShowAdd(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          添加成员
        </Button>
        )}
      </div>

      {canManageSystemSettings && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            飞书 open_id 绑定
          </CardTitle>
          <CardDescription>
            使用成员邮箱或手机号向飞书通讯录查询 open_id；App Secret 只在 Supabase Edge Function 里使用。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              type="password"
              value={syncToken}
              onChange={(event) => setSyncToken(event.target.value)}
              placeholder="云端同步密钥 QODER_SYNC_TOKEN"
            />
            <Button onClick={handleResolveFeishuIds} disabled={resolveBusy || members.length === 0}>
              <RefreshCw className={`w-4 h-4 mr-2 ${resolveBusy ? 'animate-spin' : ''}`} />
              {resolveBusy ? '绑定中' : '批量绑定'}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">Supabase</p>
              <p className="mt-1 text-sm text-foreground">{isSupabaseConfigured ? '已配置' : '未配置前端环境变量'}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">已绑定</p>
              <p className="mt-1 text-sm text-foreground">{members.filter((member) => member.feishuOpenId).length} / {members.length}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">查询字段</p>
              <p className="mt-1 text-sm text-foreground">邮箱优先，非邮箱按手机号</p>
            </div>
          </div>

          {resolveResult && (
            <div className={`rounded-lg border p-4 text-sm ${resolveResult.type === 'success' ? 'border-success/30 bg-success/10 text-success' : 'border-urgent/30 bg-urgent/10 text-urgent'}`}>
              <div className="flex items-center gap-2">
                {resolveResult.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {resolveResult.message}
              </div>
              {resolveResult.details && (
                <div className="mt-3 grid gap-2 text-xs text-foreground md:grid-cols-2">
                  {resolveResult.details.map((item) => (
                    <div key={item.localId} className="rounded-md bg-card/80 px-3 py-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {item.found ? item.feishuOpenId : '未找到'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Add member form */}
      {showAdd && (
        <Card className="border-primary/30">
          <CardContent className="p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">姓名</label>
                <Input
                  placeholder="张三"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">角色</label>
                <Input
                  placeholder="项目负责人"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">飞书 ID / 邮箱</label>
                <Input
                  placeholder="手机号或 name@company.com"
                  value={form.feishuId}
                  onChange={(e) => setForm({ ...form, feishuId: e.target.value })}
                />
              </div>
              {canManageSystemSettings && (
                <label className="flex items-center gap-2 pt-7 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.systemAdmin}
                    onChange={(e) => setForm({ ...form, systemAdmin: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  系统管理员
                </label>
              )}
              {canEditActivitySettings && (
                <label className="flex items-center gap-2 pt-7 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.eventEditor || form.systemAdmin}
                    disabled={form.systemAdmin}
                    onChange={(e) => setForm({ ...form, eventEditor: e.target.checked })}
                    className="h-4 w-4 accent-primary disabled:opacity-40"
                  />
                  活动编辑者
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>取消</Button>
              <Button size="sm" onClick={handleAdd}>确认添加</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <div className="space-y-3">
        {members.map((member) => {
          const memberTasks = events.flatMap((e) =>
            e.tasks.filter((t) => t.assigneeId === member.id)
          )
          const pendingCount = memberTasks.filter((t) => t.status !== 'completed').length
          const completedCount = memberTasks.filter((t) => t.status === 'completed').length
          const isEditing = editingId === member.id

          return (
            <Card key={member.id}>
              <CardContent className="p-5">
                {isEditing ? (
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto_auto] md:items-center">
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="flex-1"
                      placeholder="姓名"
                    />
                    <Input
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="flex-1"
                      placeholder="角色"
                    />
                    <Input
                      value={form.feishuId}
                      onChange={(e) => setForm({ ...form, feishuId: e.target.value })}
                      className="flex-1"
                      placeholder="飞书 ID"
                    />
                    {canManageSystemSettings && (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={form.systemAdmin}
                          onChange={(e) => setForm({ ...form, systemAdmin: e.target.checked })}
                          className="h-4 w-4 accent-primary"
                        />
                        管理员
                      </label>
                    )}
                    {canEditActivitySettings && (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={form.eventEditor || form.systemAdmin}
                          disabled={form.systemAdmin}
                          onChange={(e) => setForm({ ...form, eventEditor: e.target.checked })}
                          className="h-4 w-4 accent-primary disabled:opacity-40"
                        />
                        活动编辑
                      </label>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(member.id)}>
                      <Check className="w-4 h-4 text-success" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-medium">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{member.name}</span>
                        <Badge variant="secondary">{member.role}</Badge>
                        {adminMemberIds.includes(member.id) && <Badge variant="success">系统管理员</Badge>}
                        {(eventEditorMemberIds.includes(member.id) || adminMemberIds.includes(member.id)) && <Badge variant="default">活动编辑者</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        飞书: {member.feishuId}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        open_id: {member.feishuOpenId || '未绑定'}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium text-foreground">{pendingCount}</p>
                        <p className="text-xs text-muted-foreground">待办</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-success">{completedCount}</p>
                        <p className="text-xs text-muted-foreground">已完成</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {canEditActivitySettings && (
                      <Button size="icon" variant="ghost" onClick={() => startEdit(member)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      )}
                      {canEditActivitySettings && (
                      <Button size="icon" variant="ghost" onClick={() => deleteMember(member.id)}>
                        <Trash2 className="w-4 h-4 text-urgent" />
                      </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
