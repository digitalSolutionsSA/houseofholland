import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Receives RevenueCat webhook events and keeps profiles.membership_plan in
// sync with the customer's actual entitlement state. Configure this URL in
// RevenueCat → Project settings → Integrations → Webhooks, and set the same
// secret there (Authorization header) as REVENUECAT_WEBHOOK_SECRET below.
//
// We configure RevenueCat client-side with appUserID = the Supabase auth
// user id (see src/lib/purchases.ts), so event.app_user_id maps directly to
// profiles.id — no separate id-mapping table needed.

const ENTITLEMENT_TO_TIER: Record<string, 'premium' | 'black-card'> = {
  premium: 'premium',
  black_card: 'black-card',
}
const TIER_RANK: Record<'free' | 'premium' | 'black-card', number> = {
  free: 0, premium: 1, 'black-card': 2,
}

type RevenueCatEvent = {
  type: string
  app_user_id: string
  entitlement_ids?: string[] | null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const expectedSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
  if (expectedSecret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const body = await req.json()
    const event = body?.event as RevenueCatEvent | undefined
    if (!event?.app_user_id || !event?.type) {
      return new Response(JSON.stringify({ error: 'Malformed event' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const userId = event.app_user_id

    // Events that mean "no longer entitled" — downgrade to free.
    const DOWNGRADE_EVENTS = ['EXPIRATION', 'CANCELLATION']
    // Events that mean "entitlement is (still) active" — resolve the highest tier.
    const UPGRADE_EVENTS = [
      'INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE',
      'UNCANCELLATION', 'NON_RENEWING_PURCHASE',
    ]

    let newTier: 'free' | 'premium' | 'black-card' | null = null

    if (UPGRADE_EVENTS.includes(event.type)) {
      const tiers = (event.entitlement_ids ?? [])
        .map(id => ENTITLEMENT_TO_TIER[id])
        .filter(Boolean) as ('premium' | 'black-card')[]
      newTier = tiers.sort((a, b) => TIER_RANK[b] - TIER_RANK[a])[0] ?? null
    } else if (DOWNGRADE_EVENTS.includes(event.type)) {
      newTier = 'free'
    }

    if (!newTier) {
      // Event we don't act on (e.g. BILLING_ISSUE, TRANSFER) — acknowledge and no-op.
      return new Response(JSON.stringify({ ok: true, skipped: event.type }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    const { error } = await adminClient
      .from('profiles')
      .update({
        membership_plan: newTier,
        subscribed_at: newTier === 'free' ? null : new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, tier: newTier }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
