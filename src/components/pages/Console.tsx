import { useAppStore } from '@/store'
import { canManageSystem, eventHasDirectAssignment } from '@/lib/access-control'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldCheck, UserCheck } from 'lucide-react'

export function ConsolePage() {
  const {
    events,
    members,
    eventAccess,
    adminMemberIds,
    eventEditorMemberIds,
    currentMemberId,
    viewerMode,
    setViewerMode,
    setCurrentMemberId,
    setEventAccess,
    setSystemAdmin,
    setEventEditor,
  } = useAppStore()

  const currentMember = members.find((member) => member.id === currentMemberId)
  const currentCanManageSystem = canManageSystem(adminMemberIds, viewerMode, currentMemberId)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">控制台</h1>
        <p className="text-muted-foreground mt-1">管理展示模式、当前身份和活动阅读权限</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            当前视图
          </CardTitle>
          <CardDescription>
            这是一层本地预览权限。上线后会用飞书登录身份和 Supabase RLS 做真实隔离。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={viewerMode === 'console' ? 'default' : 'outline'} onClick={() => setViewerMode('console')}>
              控制台模式
            </Button>
            <Button variant={viewerMode === 'member' ? 'default' : 'outline'} onClick={() => setViewerMode('member')}>
              成员模式
            </Button>
            <Button variant={viewerMode === 'public' ? 'default' : 'outline'} onClick={() => setViewerMode('public')}>
              公开展示模式
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">当前成员</span>
            <select
              value={currentMemberId}
              onChange={(event) => setCurrentMemberId(event.target.value)}
              className="text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground"
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} · {member.role}
                </option>
              ))}
            </select>
            <Badge variant="secondary">{currentMember?.email || '未绑定邮箱'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            系统管理员
          </CardTitle>
          <CardDescription>
            只有系统管理员能看到控制台、部署检查、系统设置，以及团队成员页里的飞书 open_id 绑定入口。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => {
            const checked = adminMemberIds.includes(member.id)
            const isLastAdmin = checked && adminMemberIds.length <= 1
            return (
              <label key={member.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <span>
                  <span className="block text-sm font-medium text-foreground">{member.name}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{member.role || '未设置角色'} · {member.email || member.feishuId}</span>
                </span>
                <span className="flex items-center gap-3">
                  {member.id === currentMemberId && <Badge variant={currentCanManageSystem ? 'success' : 'warning'}>当前身份</Badge>}
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isLastAdmin}
                    onChange={(event) => setSystemAdmin(member.id, event.target.checked)}
                    className="h-4 w-4 accent-primary disabled:opacity-40"
                  />
                </span>
              </label>
            )
          })}
          <p className="text-xs text-muted-foreground">
            至少保留 1 位系统管理员，避免把自己锁在敏感页面之外。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            活动编辑权限
          </CardTitle>
          <CardDescription>
            活动编辑者可以创建活动、编辑活动任务、维护模板和成员协作信息，但看不到部署检查和系统设置。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => {
            const systemAdmin = adminMemberIds.includes(member.id)
            const checked = systemAdmin || eventEditorMemberIds.includes(member.id)
            return (
              <label key={member.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <span>
                  <span className="block text-sm font-medium text-foreground">{member.name}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{member.role || '未设置角色'} · {member.email || member.feishuId}</span>
                </span>
                <span className="flex items-center gap-3">
                  {systemAdmin && <Badge variant="success">系统管理员已包含</Badge>}
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={systemAdmin}
                    onChange={(event) => setEventEditor(member.id, event.target.checked)}
                    className="h-4 w-4 accent-primary disabled:opacity-40"
                  />
                </span>
              </label>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            活动阅读权限
          </CardTitle>
          <CardDescription>
            勾选后，该成员可以看到活动详情、任务、预算、物料、嘉宾、文案和附件。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">活动</th>
                  {members.map((member) => (
                    <th key={member.id} className="py-3 px-3 font-medium whitespace-nowrap">
                      {member.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.startDate} · {event.location || '地点待定'}</p>
                    </td>
                    {members.map((member) => {
                      const explicit = eventAccess.some((access) =>
                        access.active && access.eventId === event.id && access.memberId === member.id
                      )
                      const direct = eventHasDirectAssignment(event, member.id)

                      return (
                        <td key={member.id} className="py-4 px-3">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={explicit}
                              onChange={(changeEvent) => setEventAccess(event.id, member.id, changeEvent.target.checked)}
                              className="h-4 w-4 accent-primary"
                            />
                            <span className="text-xs text-muted-foreground">
                              {explicit ? '已授权' : direct ? '任务关联' : '无权限'}
                            </span>
                          </label>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
