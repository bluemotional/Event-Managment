# Activity Access Console Design

## Context

The app may later be shown outside the team, but real event data is confidential. Until Feishu login is wired in, the local app needs a safe preview model that mirrors the future security shape.

## Goals

- A person can only read full event details when they are assigned to that event.
- Unassigned people see an empty/limited state instead of real activity data.
- A console view can manage which members can access which events.
- The local implementation remains compatible with future Supabase Row Level Security and Feishu identity.

## Access Model

The app has a current viewer context:

- `public`: no real member selected; show empty or demo-safe states.
- `member`: selected team member; show only events the member may access.
- `console`: owner/admin view; can see all data and manage access.

An event is readable when one of these is true:

- viewer is in `console` mode
- viewer has an active `event_access` assignment for the event
- viewer is directly assigned to a task, budget item, material item, or copy record inside the event

The direct-assignment fallback keeps existing demo data usable while the console model is introduced.

## UI Changes

- Sidebar gains a viewer selector and a `控制台` navigation item.
- Dashboard and task board use filtered events based on the current viewer.
- Direct event URLs protect details; if the viewer cannot access that event, show a restricted state.
- Console page lists events and members, with checkboxes to grant/revoke event access.

## Supabase Shape

Add `event_access` with `event_id`, `member_id`, `role`, `active`, timestamps. Later, Feishu login maps the logged-in user to `team_members.feishu_open_id`, and RLS can enforce access on all event child tables.

Initial RLS direction:

- `events`: readable when an active `event_access` row exists for the logged-in member.
- child tables: readable only through their parent `event_id`.
- `event_access`: editable only by console/admin users once admin identity exists.
- public visitors get no real rows; demo data should be separate seeded/sample content if needed.

## Non-goals For This Pass

- Real Feishu OAuth login.
- Hard production security in the browser-only local build.
- Audit logs.
- Per-field permissions.

## Verification

- TypeScript/Vite build must pass.
- Manual checks should cover public viewer, member viewer, and console mode.
