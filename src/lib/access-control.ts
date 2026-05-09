import { Event, EventAccess, ViewerMode } from '@/types'

export function canManageSystem(
  adminMemberIds: string[],
  viewerMode: ViewerMode,
  currentMemberId: string
): boolean {
  if (viewerMode === 'public') return false
  if (viewerMode === 'console') return true
  return adminMemberIds.includes(currentMemberId)
}

export function canEditActivities(
  eventEditorMemberIds: string[],
  adminMemberIds: string[],
  viewerMode: ViewerMode,
  currentMemberId: string
): boolean {
  if (viewerMode === 'public') return false
  if (canManageSystem(adminMemberIds, viewerMode, currentMemberId)) return true
  return eventEditorMemberIds.includes(currentMemberId)
}

export function eventHasDirectAssignment(event: Event, memberId: string): boolean {
  if (!memberId) return false

  return (
    event.tasks.some((task) => task.assigneeId === memberId) ||
    (event.budgets || []).some((item) => item.ownerId === memberId) ||
    (event.materials || []).some((item) => item.ownerId === memberId) ||
    (event.copyDocs || []).some((item) => item.ownerId === memberId)
  )
}

export function canReadEvent(
  event: Event,
  eventAccess: EventAccess[],
  viewerMode: ViewerMode,
  currentMemberId: string
): boolean {
  if (viewerMode === 'console') return true
  if (viewerMode === 'public') return false

  const hasAccessAssignment = eventAccess.some((access) =>
    access.active &&
    access.eventId === event.id &&
    access.memberId === currentMemberId
  )

  return hasAccessAssignment || eventHasDirectAssignment(event, currentMemberId)
}

export function filterReadableEvents(
  events: Event[],
  eventAccess: EventAccess[],
  viewerMode: ViewerMode,
  currentMemberId: string
): Event[] {
  return events.filter((event) => canReadEvent(event, eventAccess, viewerMode, currentMemberId))
}
