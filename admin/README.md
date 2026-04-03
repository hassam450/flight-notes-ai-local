# Flight Notes AI - Admin Panel

Next.js 16 admin dashboard for managing Flight Notes AI.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Copy `.env.local.example` or create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
REVENUECAT_WEBHOOK_SECRET=your_revenuecat_webhook_secret
```

## Deployment

Hosted on **Cloudflare Workers** using the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare).

- **Production URL**: https://admin.flightnotesai.com
- **Workers URL**: https://flight-notes-admin.flightnotesai.workers.dev

### Deploy

```bash
npm run deploy
```

This runs `opennextjs-cloudflare build` (builds the `.open-next/` output) followed by `opennextjs-cloudflare deploy` (deploys to Cloudflare Workers).

### Preview locally (Cloudflare environment)

```bash
npm run preview
```

### Prerequisites

- A `CLOUDFLARE_API_TOKEN` environment variable with permissions for the `Flightnotesai@gmail.com` Cloudflare account
- Environment variables must also be set in **Cloudflare Dashboard > Workers & Pages > flight-notes-admin > Settings > Variables & Secrets**

### Infrastructure

- **Domain registrar**: GoDaddy (`flightnotesai.com`)
- **DNS**: Cloudflare (nameservers pointed from GoDaddy to Cloudflare)
- **Hosting**: Cloudflare Workers (free tier)
- **SSL**: Auto-managed by Cloudflare
- **Account ID**: `43238a16356781c076c28802665548e9`
