const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token',
}

type ResolveMember = {
  localId: string
  name: string
  email?: string
  mobile?: string
}

type ResolveBody = {
  action?: 'health'
  members?: ResolveMember[]
}

type FeishuUser = {
  user_id: string
  name?: string
  email?: string
  mobile?: string
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function normalize(value?: string) {
  return (value || '').trim().toLowerCase()
}

async function getTenantAccessToken(): Promise<string> {
  const appId = Deno.env.get('FEISHU_APP_ID')
  const appSecret = Deno.env.get('FEISHU_APP_SECRET')
  if (!appId || !appSecret) throw new Error('Missing FEISHU_APP_ID or FEISHU_APP_SECRET')

  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  })
  const data = await response.json()
  if (data.code !== 0) throw new Error(data.msg || 'Failed to get Feishu token')
  return data.tenant_access_token
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const expectedToken = Deno.env.get('QODER_SYNC_TOKEN')
    const providedToken = request.headers.get('x-sync-token')
    if (!expectedToken || providedToken !== expectedToken) {
      return json({ error: 'Invalid sync token' }, 401)
    }

    const body = (await request.json()) as ResolveBody
    if (body.action === 'health') {
      return json({
        ok: true,
        hasFeishuSecrets: Boolean(Deno.env.get('FEISHU_APP_ID') && Deno.env.get('FEISHU_APP_SECRET')),
        hasSyncToken: Boolean(expectedToken),
      })
    }

    const members = (body.members || []).filter((member) => member.localId)
    if (members.length === 0) {
      return json({ results: [], errors: [] })
    }

    const emails = Array.from(new Set(members.map((member) => normalize(member.email)).filter(Boolean)))
    const mobiles = Array.from(new Set(members.map((member) => (member.mobile || '').trim()).filter(Boolean)))
    if (emails.length === 0 && mobiles.length === 0) {
      return json({ results: [], errors: ['没有可查询的邮箱或手机号'] }, 400)
    }

    const token = await getTenantAccessToken()
    const response = await fetch('https://open.feishu.cn/open-apis/contact/v3/users/batch_get_id?user_id_type=open_id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emails,
        mobiles,
        include_resigned: false,
      }),
    })

    const data = await response.json()
    if (data.code !== 0) {
      return json({ error: data.msg || 'Failed to resolve Feishu users' }, 500)
    }

    const userList = (data.data?.user_list || []) as FeishuUser[]
    const byEmail = new Map(userList.filter((user) => user.email).map((user) => [normalize(user.email), user]))
    const byMobile = new Map(userList.filter((user) => user.mobile).map((user) => [(user.mobile || '').trim(), user]))

    const results = members.map((member) => {
      const user = byEmail.get(normalize(member.email)) || byMobile.get((member.mobile || '').trim())
      return {
        localId: member.localId,
        name: member.name,
        email: member.email,
        mobile: member.mobile,
        found: Boolean(user),
        feishuOpenId: user?.user_id,
        feishuName: user?.name,
      }
    })

    return json({ results, errors: data.data?.not_exist_ids || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
})
