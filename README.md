# Poker AI Assistant — Supabase + Vercel Setup

This doc covers environment variables, Supabase schema, Vercel API route, and local dev.

## 1) Environment variables
Copy .env.example to your local env and set values (also add these in Vercel Project Settings):

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (server-only)
- SUPABASE_ANON_KEY (optional if you add client usage later)

## 2) Supabase schema
Use db/schema.sql in the Supabase SQL editor to create the tables:
- public.events (generic event sink)
- Optional: public.hands, public.ai_recommendations, public.player_actions

RLS: events table is enabled with a permissive insert policy in the script. Tighten policies as needed.

## 3) API route on Vercel
- api/track.ts receives POSTs from the browser and inserts into public.events.
- Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured in Vercel.

Request format from the client (already wired):
- { type: string; payload?: any }

## 4) Local development
- npm install
- npm run dev
- Interact with the app and verify events are written in Supabase.

## 5) Notes
- storage.ts keeps localStorage as the primary store and mirrors events to /api/track fire-and-forget.
- For structured analytics, emit explicit inserts to hands/player_actions/ai_recommendations in api routes as a follow-up.
