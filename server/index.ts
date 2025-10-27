import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
// Fallback to .env.local if main .env is absent
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try { dotenv.config({ path: '.env.local' }); } catch {}
}

const app = express();
const PORT = process.env.BACKEND_PORT ? parseInt(process.env.BACKEND_PORT, 10) : 4000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Supabase client (optional)
const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

// In-memory fallback buffer when Supabase table is missing
const EVENT_BUFFER: Array<{ type: string; payload?: any; created_at: string }> = [];

app.get('/health', async (_req, res) => {
  let eventsTable = false;
  if (supabase) {
    try {
      const { error } = await supabase.from('events').select('id').limit(1);
      eventsTable = !error;
    } catch {}
  }
  res.json({ ok: true, service: 'poker-backend', supabase: !!supabase, eventsTable });
});

// Receive client-side events
app.post('/events', async (req, res) => {
  const { type, payload } = req.body || {};
  if (!type) return res.status(400).json({ error: 'Missing type' });

  // Always buffer locally
  EVENT_BUFFER.unshift({ type, payload, created_at: new Date().toISOString() });
  if (EVENT_BUFFER.length > 200) EVENT_BUFFER.pop();

  if (!supabase) {
    // Accept without persistence
    return res.json({ ok: true, stored: false, buffered: true });
  }

  const { error } = await supabase.from('events').insert({ type, payload });
  if (error) return res.status(200).json({ ok: true, stored: false, buffered: true, note: "Supabase insert failed; using buffer", error: error.message });
  res.json({ ok: true, stored: true });
});

// List recent events
app.get('/events', async (_req, res) => {
  if (!supabase) return res.json({ source: 'buffer', data: EVENT_BUFFER });
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    // Fall back to buffer if table missing
    return res.status(200).json({ source: 'buffer', data: EVENT_BUFFER, note: 'Supabase events table missing. Apply db/schema.sql in Supabase.' });
  }
  res.json(data);
});

// Bluff stats from events table
app.get('/bluff-stats', async (_req, res) => {
  if (!supabase) return res.json({ attempts: 0, successes: 0, failures: 0, source: 'buffer' });
  const { data, error } = await supabase
    .from('events')
    .select('type, payload')
    .in('type', ['bluff_attempt', 'bluff_result'])
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) {
    // Derive from buffer as fallback
    let attempts = 0, successes = 0, failures = 0;
    for (const row of EVENT_BUFFER) {
      if (row.type === 'bluff_attempt') attempts++;
      if (row.type === 'bluff_result') {
        const success = row.payload?.success === true;
        if (success) successes++; else failures++;
      }
    }
    return res.json({ attempts, successes, failures, source: 'buffer' });
  }
  let attempts = 0, successes = 0, failures = 0;
  for (const row of data || []) {
    if (row.type === 'bluff_attempt') attempts++;
    if (row.type === 'bluff_result') {
      const success = (row as any).payload?.success === true;
      if (success) successes++; else failures++;
    }
  }
  res.json({ attempts, successes, failures });
});

// Helpful message to create table
app.get('/how-to-create-events', (_req, res) => {
  res.json({
    message: 'Run db/schema.sql in Supabase SQL editor to create public.events and policies.',
    file: 'db/schema.sql',
  });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
