import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Simple online update of a logistic model for bluff success based on imported hands and events
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Fetch recent bluff attempts/results
    const { data: ev, error: evErr } = await supabase
      .from('events')
      .select('type, payload')
      .in('type', ['bluff_attempt', 'bluff_result'])
      .order('created_at', { ascending: false })
      .limit(5000);
    if (evErr) return res.status(500).json({ error: evErr.message });

    // Naive features: board_threat, aggression_proxy, street; labels: success
    // Placeholder: compute aggregate rates per street for demonstration
    const agg: Record<string, { succ: number; total: number }> = {};
    for (const row of ev || []) {
      if ((row as any).type !== 'bluff_result') continue;
      const p = (row as any).payload || {};
      const k = p.street || 'unknown';
      if (!agg[k]) agg[k] = { succ: 0, total: 0 };
      agg[k].total += 1;
      if (p.success === true) agg[k].succ += 1;
    }

    const params = { bluff_success_rates: agg, updated_at: new Date().toISOString() };
    const { error: insErr } = await supabase.from('model_params').insert({ name: 'bluff_regression_v1', params });
    if (insErr) return res.status(500).json({ error: insErr.message });

    return res.status(200).json({ ok: true, saved: params });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'train failed' });
  }
}
