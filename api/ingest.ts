import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchText(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.text();
}

function parseUCIPokerCSV(csv: string) {
  // UCI Poker Hand dataset: 10 input features + label per row (not full HH)
  const lines = csv.trim().split(/\r?\n/);
  const rows = lines.map(l => l.split(',').map(s => s.trim()));
  return rows.map(cols => ({
    hand: { uci_features: cols.slice(0, 10).map(Number), label: Number(cols[10]) },
    normalized: { kind: 'uci_poker_hand' },
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = (req.query.url as string) || (req.body && (req.body as any).url);
    const kind = (req.query.kind as string) || (req.body && (req.body as any).kind) || 'csv';
    if (!url) return res.status(400).json({ error: 'missing url' });

    // Register or find source
    const { data: srcUpsert, error: srcErr } = await supabase
      .from('external_sources')
      .upsert({ url, kind }, { onConflict: 'url' })
      .select()
      .single();
    if (srcErr) return res.status(500).json({ error: srcErr.message });

    const text = await fetchText(url);
    let records: { hand: any; normalized: any }[] = [];

    if (kind === 'csv' && url.includes('uci') || text.includes('\n') && text.includes(',')) {
      records = parseUCIPokerCSV(text);
    } else {
      // fallback store raw
      records = [{ hand: { raw: text }, normalized: { kind: 'raw' } }];
    }

    const payload = records.map(r => ({ source_id: srcUpsert.id, hand: r.hand, normalized: r.normalized }));
    const { error: insErr } = await supabase.from('imported_hands').insert(payload);
    if (insErr) return res.status(500).json({ error: insErr.message });

    await supabase.from('external_sources').update({ last_ingested_at: new Date().toISOString() }).eq('id', srcUpsert.id);

    return res.status(200).json({ ok: true, inserted: payload.length });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'ingest failed' });
  }
}
