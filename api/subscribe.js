// api/subscribe.js
// Saves or deletes a Web Push subscription in Vercel KV.
// POST /api/subscribe  { subscription: PushSubscription }  → stores it
// DELETE /api/subscribe                                     → removes it

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const KV_URL   = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  if (!KV_URL || !KV_TOKEN) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const kvSet = async (key, value) => {
    const res = await fetch(`${KV_URL}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    })
    return res.ok
  }

  const kvDel = async (key) => {
    const res = await fetch(`${KV_URL}/del/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    })
    return res.ok
  }

  if (req.method === 'POST') {
    const body = await req.json()
    if (!body?.subscription) {
      return new Response(JSON.stringify({ error: 'Missing subscription' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }
    await kvSet('wearnext_push_subscription', JSON.stringify(body.subscription))
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'DELETE') {
    await kvDel('wearnext_push_subscription')
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Method not allowed', { status: 405 })
}
