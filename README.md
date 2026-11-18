# Master IPTV Player

Independent web panel and Android IPTV player project.

## Stack
- Next.js App Router
- Supabase Auth and PostgreSQL
- Vercel deployment connected to GitHub

## Local setup
1. Install Node.js 22 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL and publishable key from the Supabase Connect dialog.
5. Run `npm run dev`.

Never place a Supabase service-role or secret key in a `NEXT_PUBLIC_` variable or in client-side code.

## Current status
The first dashboard shell and initial database schema are in place. Authentication, customer workflows, secure source handling, device pairing, and the administrator panel are the next implementation stages.

This repository is independent from the older MasterCode TV app.
