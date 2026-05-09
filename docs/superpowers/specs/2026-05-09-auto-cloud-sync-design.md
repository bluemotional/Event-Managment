# Auto Cloud Sync Design

## Goal

Make event data sync to Supabase automatically so teammates do not need to manually upload or download after every edit.

## Chosen Approach

Use the existing `sync-snapshot` Edge Function and keep the app-level JSON snapshot model for this version. On page load, the app tries to pull the latest cloud snapshot. After editable data changes, the app waits briefly and uploads the current snapshot automatically.

This keeps the current free Supabase setup, avoids a full relational collaboration rewrite, and preserves the existing reminder pipeline because `send-reminders` already reads the same cloud snapshot.

## Conflict Rule

For this first version, simultaneous edits use last-write-wins. If two people edit around the same time, the later successful upload becomes the cloud version. The UI should make this visible with a sync status and latest sync time, but it does not merge individual task fields yet.

## User Experience

- Load the online app and automatically pull the cloud snapshot when a sync token is available.
- Save local edits automatically after a short delay.
- Show status: sync disabled, pulling, saving, synced, or failed.
- Keep manual upload and download buttons as a fallback.
- Store the sync token locally in the browser so users do not re-enter it every visit.

## Non-Goals

- No full table-per-entity database rewrite in this step.
- No row-level conflict merging in this step.
- No paid cloud service dependency.
