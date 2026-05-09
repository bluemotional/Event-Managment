# Feishu Login Sync Design

## Goal

Let teammates open the deployed app, sign in with Feishu, and use automatic cloud sync without knowing or entering `QODER_SYNC_TOKEN`.

## Authentication Flow

The browser calls the `feishu-auth` Supabase Edge Function to get the public Feishu App ID and starts Feishu OAuth. Feishu redirects back to the Vercel app with a login code. The browser sends that code to `feishu-auth`, which exchanges it with Feishu using the server-side app secret, finds the matching member in the current cloud snapshot, and returns a signed short-lived session token.

The session token is stored in the browser and sent to cloud sync calls as `x-feishu-session`. The raw Feishu app secret and `QODER_SYNC_TOKEN` are never sent to normal teammates.

## Permission Model

The source of truth is still the current cloud snapshot.

- System admins can manage system pages and upload full snapshots.
- Activity editors can create/edit activities, templates, members, and upload full snapshots.
- Normal members can log in and download only events where they are explicitly authorized or directly assigned.
- Normal members cannot upload cloud snapshots.

## Sync Model

The existing automatic snapshot sync remains in place. It now accepts either the admin sync token or a Feishu session. The server enforces upload permission against the latest cloud snapshot, not the browser-submitted payload.

## Feishu Setup Required

After deployment, the Feishu app must allow the Vercel production URL as a redirect URI. Members should have either `feishuOpenId`, `feishuUserId`, email, or phone stored in the app so the login profile can be matched to a member.

## Non-Goals

- No full relational collaboration rewrite in this step.
- No paid service dependency.
- No exposure of `QODER_SYNC_TOKEN` in frontend code.
