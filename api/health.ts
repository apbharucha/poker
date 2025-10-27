import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  let eventsTable = false;
  if (supabase) {
    try {
      const { error } = await supabase.from('events').select('id').limit(1);
      eventsTable = !error;
    } catch {}
  }
  res.status(200).json({ ok: true, supabase: !!supabase, eventsTable });
}
