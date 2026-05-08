# 数据库与部署说明

## 1. 本地环境变量

复制 `.env.example` 为 `.env.local`，填入：

```bash
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的 anon key

FEISHU_APP_ID=飞书自建应用 App ID
FEISHU_APP_SECRET=飞书自建应用 App Secret
QODER_SYNC_TOKEN=自己生成的一段长密钥
```

`VITE_` 开头的变量会进入浏览器；`FEISHU_APP_SECRET`、`QODER_SYNC_TOKEN` 只放 Supabase Edge Functions 的 secrets 里。`SUPABASE_SERVICE_ROLE_KEY` 是 Supabase Edge Functions 的内置保留变量，不需要也不能手动设置。

## 2. Supabase 数据库

在 Supabase 新建项目后，到 SQL Editor 执行：

```sql
-- 粘贴并执行 supabase/schema.sql
```

当前 schema 包含：

- 活动、任务、成员、权限、预算、物料、嘉宾、文案、附件表
- `reminder_settings` 和 `reminder_send_logs`
- `app_snapshots` 云端快照表，由 Edge Function 使用 service role 访问
- `event-attachments` 私有 Storage bucket，单文件 50MB

## 3. 部署 Edge Functions

安装并登录 Supabase CLI 后，在项目根目录执行：

```bash
supabase functions deploy sync-snapshot
supabase functions deploy send-reminders
supabase functions deploy resolve-feishu-users
supabase secrets set FEISHU_APP_ID=你的飞书 App ID
supabase secrets set FEISHU_APP_SECRET=你的飞书 App Secret
supabase secrets set QODER_SYNC_TOKEN=你的同步密钥
```

部署后，系统设置页可以用 `QODER_SYNC_TOKEN` 上传/拉取云端快照。

成员页可以用同一个 `QODER_SYNC_TOKEN` 批量查询飞书通讯录，把成员邮箱或手机号转换成 `open_id`。飞书应用需要开通通讯录读取相关权限，并发布/安装到你的企业组织。

## 4. 启用云端定时提醒

`send-reminders` 会按 `reminder_settings` 中的配置检查未完成任务：

- 到期前：提前 3 天开始，每天 09:00
- 到期当天：09:00、15:00
- 逾期后：09:00、12:00、15:00、18:00

函数部署完成后，再单独配置 Cron 调用。注意不要把 service role key 放进前端项目或公开页面。

为了避免第一次建表时复制 SQL 出错，`supabase/schema.sql` 里不再包含 Cron 示例。等前面都跑通后，再单独执行下面这段：

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'event-reminders-9-12-15-18',
  '0 9,12,15,18 * * *',
  $$
  select net.http_post(
    url := 'https://你的项目.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 你的 service_role key'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## 5. Vercel 部署

把代码推到 GitHub 后，在 Vercel 导入项目：

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

服务端密钥不要放 Vercel 前端环境变量里。

## 6. 当前阶段边界

现在已经不是纯本地：可以通过 Supabase Edge Function 把完整工作数据同步到云端，也有云端定时提醒函数和数据库表结构。

下一阶段要做真正多人协作时，需要接入飞书登录或 Supabase Auth，然后把前端从“快照同步”升级成按表实时读写，并补齐 RLS 策略。

## 7. 部署检查页

本地或线上打开 `#/deploy` 可以看到部署检查页。它会检查：

- Supabase 前端环境变量是否配置
- `QODER_SYNC_TOKEN` 是否填写
- `sync-snapshot`、`resolve-feishu-users`、`send-reminders` 是否能响应
- 成员是否绑定飞书 `open_id`
- 未完成任务是否已经分配负责人
- 提醒时间策略是否完整

这个页面是为了免费部署阶段排错用的。它不会要求付费服务；真正触达免费层限制时，再考虑是否升级。
