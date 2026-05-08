import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token',
}

type SyncBody = {
  action?: 'upload' | 'download' | 'health'
  payload?: unknown
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)
    const body = (await request.json()) as SyncBody

    if (body.action === 'health') {
      return json({
        ok: true,
        hasServiceRole: Boolean(serviceKey),
        hasSyncToken: Boolean(expectedToken),
      })
    }

    if (body.action === 'upload') {
      if (!body.payload || typeof body.payload !== 'object') {
        return json({ error: 'Missing snapshot payload' }, 400)
      }

      const { data, error } = await supabase
        .from('app_snapshots')
        .upsert({
          id: 'default',
          payload: body.payload,
          updated_at: new Date().toISOString(),
        })
        .select('updated_at')
        .single()

      if (error) throw error
      return json({ updated_at: data.updated_at })
    }

    if (body.action === 'download') {
      const { data, error } = await supabase
        .from('app_snapshots')
        .select('payload,updated_at')
        .eq('id', 'default')
        .maybeSingle()

      if (error) throw error
      if (!data) return json({ error: 'No snapshot found' }, 404)
      return json(data)
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: message }, 500)
  }
})
