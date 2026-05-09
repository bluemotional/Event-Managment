import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, CloudOff, RefreshCw, UploadCloud } from 'lucide-react'
import { downloadCloudSnapshot, hasCloudCredentials, uploadCloudSnapshot, CLOUD_SYNC_TOKEN_CHANGED_EVENT } from '@/lib/cloud-sync'
import { isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { canEditActivities } from '@/lib/access-control'

type CloudSyncState = 'disabled' | 'pulling' | 'pending' | 'saving' | 'synced' | 'error'

const AUTO_UPLOAD_DELAY_MS = 1600
const REMOTE_PULL_INTERVAL_MS = 60000

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

function getSharedDataFingerprint(state: ReturnType<typeof useAppStore.getState>): string {
  return JSON.stringify({
    events: state.events,
    members: state.members,
    eventAccess: state.eventAccess,
    eventTemplates: state.eventTemplates,
    taskLibrary: state.taskLibrary,
    adminMemberIds: state.adminMemberIds,
    eventEditorMemberIds: state.eventEditorMemberIds,
    feishuConfig: state.feishuConfig,
  })
}

export function CloudAutoSync() {
  const [syncState, setSyncState] = useState<CloudSyncState>(() => {
    if (!isSupabaseConfigured || !hasCloudCredentials()) return 'disabled'
    return 'pulling'
  })
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [message, setMessage] = useState('')

  const lastSyncedFingerprintRef = useRef('')
  const uploadTimerRef = useRef<number | null>(null)
  const applyingRemoteRef = useRef(false)
  const uploadingRef = useRef(false)
  const pendingLocalChangeRef = useRef(false)

  useEffect(() => {
    lastSyncedFingerprintRef.current = getSharedDataFingerprint(useAppStore.getState())

    const clearUploadTimer = () => {
      if (uploadTimerRef.current) {
        window.clearTimeout(uploadTimerRef.current)
        uploadTimerRef.current = null
      }
    }

    const markSynced = () => {
      lastSyncedFingerprintRef.current = getSharedDataFingerprint(useAppStore.getState())
      pendingLocalChangeRef.current = false
      setLastSyncedAt(new Date())
      setMessage('')
      setSyncState('synced')
    }

    const pullCloud = async () => {
      if (!isSupabaseConfigured || !hasCloudCredentials()) {
        setSyncState('disabled')
        return
      }
      if (pendingLocalChangeRef.current || uploadingRef.current) return

      setSyncState('pulling')
      setMessage('')
      try {
        const raw = await downloadCloudSnapshot()
        const currentFingerprint = getSharedDataFingerprint(useAppStore.getState())

        applyingRemoteRef.current = true
        const result = useAppStore.getState().importSnapshot(raw, { preserveSession: true })
        applyingRemoteRef.current = false

        if (!result.success) {
          throw new Error(result.error || '云端数据导入失败')
        }

        const nextFingerprint = getSharedDataFingerprint(useAppStore.getState())
        if (nextFingerprint === currentFingerprint) {
          markSynced()
          return
        }

        markSynced()
      } catch (error) {
        applyingRemoteRef.current = false
        setSyncState('error')
        setMessage(error instanceof Error ? error.message : '自动拉取失败')
      }
    }

    const scheduleUpload = () => {
      if (!isSupabaseConfigured || !hasCloudCredentials()) {
        setSyncState('disabled')
        return
      }
      if (applyingRemoteRef.current) return
      const state = useAppStore.getState()
      if (!canEditActivities(state.eventEditorMemberIds, state.adminMemberIds, state.viewerMode, state.currentMemberId)) return

      const fingerprint = getSharedDataFingerprint(state)
      if (fingerprint === lastSyncedFingerprintRef.current) return

      pendingLocalChangeRef.current = true
      setSyncState('pending')
      setMessage('即将自动保存')
      clearUploadTimer()
      uploadTimerRef.current = window.setTimeout(async () => {
        uploadingRef.current = true
        setSyncState('saving')
        setMessage('')
        try {
          await uploadCloudSnapshot(useAppStore.getState().exportSnapshot())
          markSynced()
        } catch (error) {
          setSyncState('error')
          setMessage(error instanceof Error ? error.message : '自动上传失败')
        } finally {
          uploadingRef.current = false
          uploadTimerRef.current = null
        }
      }, AUTO_UPLOAD_DELAY_MS)
    }

    const unsubscribe = useAppStore.subscribe(scheduleUpload)
    const handleFocus = () => void pullCloud()
    const handleTokenChange = () => scheduleUpload()
    const interval = window.setInterval(() => void pullCloud(), REMOTE_PULL_INTERVAL_MS)

    window.addEventListener('focus', handleFocus)
    window.addEventListener(CLOUD_SYNC_TOKEN_CHANGED_EVENT, handleTokenChange)
    void pullCloud()

    return () => {
      clearUploadTimer()
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener(CLOUD_SYNC_TOKEN_CHANGED_EVENT, handleTokenChange)
      unsubscribe()
    }
  }, [])

  const status = (() => {
    if (!isSupabaseConfigured) {
      return {
        icon: CloudOff,
        label: '云端未配置',
        tone: 'muted',
      }
    }
    if (syncState === 'disabled') {
      return {
        icon: CloudOff,
        label: '自动同步未开启',
        detail: '在系统设置填写云端同步密钥',
        tone: 'muted',
      }
    }
    if (syncState === 'pulling') {
      return { icon: RefreshCw, label: '正在拉取云端', tone: 'working' }
    }
    if (syncState === 'pending') {
      return { icon: UploadCloud, label: '等待自动保存', detail: message, tone: 'working' }
    }
    if (syncState === 'saving') {
      return { icon: RefreshCw, label: '正在保存云端', tone: 'working' }
    }
    if (syncState === 'error') {
      return { icon: AlertCircle, label: '自动同步失败', detail: message, tone: 'error' }
    }
    return {
      icon: CheckCircle2,
      label: '已自动同步',
      detail: lastSyncedAt ? formatClock(lastSyncedAt) : '',
      tone: 'success',
    }
  })()

  const Icon = status.icon

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={cn(
          'flex min-w-52 items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-lg',
          status.tone === 'success' && 'border-success/30',
          status.tone === 'working' && 'border-primary/30',
          status.tone === 'error' && 'border-urgent/30',
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            status.tone === 'success' && 'text-success',
            status.tone === 'working' && 'text-primary animate-spin',
            status.tone === 'error' && 'text-urgent',
            status.tone === 'muted' && 'text-muted-foreground',
          )}
        />
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">{status.label}</p>
          {status.detail && <p className="mt-0.5 max-w-56 truncate text-xs text-muted-foreground">{status.detail}</p>}
        </div>
      </div>
    </div>
  )
}
