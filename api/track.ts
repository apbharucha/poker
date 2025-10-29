import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const { type, payload } = req.body || {};
    if (!type) {
      return res.status(400).json({ error: 'Missing event type' });
    }

    const { error } = await supabase
      .from('events')
      .insert({ type, payload });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Auto-train when each batch of 10 hands is recorded
    if (type === 'hand_stored') {
      try {
        const { count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'hand_stored');
        if ((count || 0) > 0 && (count as number) % 10 === 0) {
          // fire-and-forget training job
          fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/api/train`).catch(() => {});
        }
      } catch {}
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
}
