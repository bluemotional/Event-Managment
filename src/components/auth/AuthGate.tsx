import { ReactNode, useEffect, useState } from 'react'
import { AlertCircle, Loader2, LogIn, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { clearFeishuSessionToken, exchangeFeishuCode, getFeishuSessionToken, startFeishuLogin, verifyFeishuSession } from '@/lib/feishu-auth'
import { getSavedSyncToken } from '@/lib/cloud-sync'
import { useAppStore } from '@/store'

type AuthState = 'checking' | 'login' | 'ready' | 'error'

export function AuthGate({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [message, setMessage] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const { setCurrentMemberId, setViewerMode } = useAppStore()

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')

      try {
        if (code) {
          const result = await exchangeFeishuCode(code, state)
          setCurrentMemberId(result.memberId!)
          setViewerMode('member')
          window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}#/dashboard`)
          setAuthState('ready')
          return
        }

        if (getFeishuSessionToken()) {
          const result = await verifyFeishuSession()
          setCurrentMemberId(result.memberId!)
          setViewerMode('member')
          setAuthState('ready')
          return
        }

        if (getSavedSyncToken().trim()) {
          setAuthState('ready')
          return
        }

        setAuthState('login')
      } catch (error) {
        clearFeishuSessionToken()
        setMessage(error instanceof Error ? error.message : '飞书登录失败')
        setAuthState('error')
      }
    }

    void run()
  }, [setCurrentMemberId, setViewerMode])

  const handleLogin = async () => {
    setLoggingIn(true)
    setMessage('')
    try {
      await startFeishuLogin()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法打开飞书登录')
      setLoggingIn(false)
      setAuthState('error')
    }
  }

  if (authState === 'ready') return <>{children}</>

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-primary-glow">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">活动管家</h1>
            <p className="text-xs text-muted-foreground">飞书组织登录</p>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-5 p-6">
            {authState === 'checking' && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                正在检查登录状态
              </div>
            )}

            {authState === 'login' && (
              <>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-secondary p-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">使用飞书登录</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      登录后会按成员权限显示活动，并自动保存你的修改。
                    </p>
                  </div>
                </div>
                <Button className="w-full" onClick={handleLogin} disabled={loggingIn}>
                  {loggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  飞书登录
                </Button>
              </>
            )}

            {authState === 'error' && (
              <>
                <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-urgent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">登录没有完成</p>
                    <p className="mt-1 text-sm text-muted-foreground">{message}</p>
                  </div>
                </div>
                <Button className="w-full" onClick={handleLogin} disabled={loggingIn}>
                  {loggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  重新使用飞书登录
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
