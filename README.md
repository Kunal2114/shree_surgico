# Shree Surgico Pharmaceuticals — Website Setup Guide

Complete pharmacy website with inventory management, storefront, checkout (Razorpay), and admin dashboard.

---

## Project Structure

```
shree-surgico/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Customer storefront / homepage
│   │   ├── checkout/page.tsx     ← Checkout (address → Rx → payment)
│   │   ├── orders/page.tsx       ← Customer order tracking
│   │   ├── admin/
│   │   │   ├── page.tsx          ← Inventory management dashboard
│   │   │   └── orders/page.tsx   ← Admin order management
│   │   └── api/
│   │       ├── products/route.ts ← GET/POST products
│   │       ├── orders/route.ts   ← GET/POST orders
│   │       ├── orders/[id]/route.ts ← PATCH/GET single order
│   │       ├── checkout/route.ts ← Razorpay create + verify
│   │       └── upload/route.ts   ← Prescription image upload
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── ProductCard.tsx
│   └── lib/
│       ├── supabase-client.ts    ← Browser Supabase client
│       ├── supabase-server.ts    ← Server Supabase client (API routes)
│       └── types.ts              ← TypeScript types
├── supabase-migrations.sql       ← Run this in Supabase SQL Editor
├── .env.local                    ← Your secret keys (never commit this)
├── .env.example                  ← Template (safe to commit)
└── .gitignore
```

---

## STEP 1 — Prerequisites

Install these on your computer before starting:

1. **Node.js 18+** — https://nodejs.org (download LTS version)
2. **Git** — https://git-scm.com/downloads
3. **VS Code** (recommended) — https://code.visualstudio.com

Verify installations:
```bash
node --version    # should show v18 or higher
git --version     # should show git version
```

---

## STEP 2 — Set up Supabase database

1. Go to **https://supabase.com** and sign up (free)
2. Click **"New project"**
   - Name: `shree-surgico`
   - Database password: create a strong password (save it!)
   - Region: **South Asia (ap-south-1)** — Mumbai
3. Wait ~2 minutes for the project to start
4. Go to **SQL Editor** (left sidebar) → click **"New query"**
5. Open `supabase-migrations.sql` from this project
6. **Copy the entire file** and paste it into the SQL Editor
7. Click **"Run"** — you'll see "Success" for each table
8. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdef.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
   - **service_role** key (keep this secret — only used server-side)

---

## STEP 3 — Set up Razorpay

1. Go to **https://razorpay.com** → Sign up (free)
2. Complete KYC with your pharmacy licence and GST details
3. Go to **Settings → API Keys** → Generate test keys
4. Copy:
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret**
5. When going live, generate live keys and replace `rzp_test_` with `rzp_live_`

---

## STEP 4 — Run locally on your computer

```bash
# 1. Open terminal / command prompt, go to this project folder
cd shree-surgico

# 2. Install all dependencies (takes 1-2 minutes first time)
npm install

# 3. Fill in your secret keys
# Open .env.local in VS Code and replace ALL placeholder values:
#   NEXT_PUBLIC_SUPABASE_URL       → your Supabase project URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY  → your Supabase anon key
#   SUPABASE_SERVICE_ROLE_KEY      → your Supabase service role key
#   RAZORPAY_KEY_ID                → your Razorpay Key ID
#   RAZORPAY_KEY_SECRET            → your Razorpay Key Secret
#   NEXT_PUBLIC_RAZORPAY_KEY_ID    → same as RAZORPAY_KEY_ID

# 4. Start the development server
npm run dev

# 5. Open your browser and go to:
#   http://localhost:3000          ← Customer storefront
#   http://localhost:3000/admin    ← Inventory dashboard
#   http://localhost:3000/orders   ← Order tracking
```

---

## STEP 5 — Push code to GitHub

```bash
# 1. Open terminal in the shree-surgico folder

# 2. Initialize git (only first time)
git init

# 3. Add all files
git add .

# 4. Create first commit
git commit -m "Initial commit — Shree Surgico Pharmaceuticals"

# 5. Go to https://github.com → Sign in → Click "New repository"
#    Name it: shree-surgico
#    Set to Private (recommended for business code)
#    Do NOT tick "Add README" (we already have code)
#    Click "Create repository"

# 6. GitHub will show you commands. Run these (replace YOUR_USERNAME):
git remote add origin https://github.com/YOUR_USERNAME/shree-surgico.git
git branch -M main
git push -u origin main
```

Your code is now on GitHub. ✅

---

## STEP 6 — Deploy to Vercel (free hosting)

1. Go to **https://vercel.com** → Sign up with your GitHub account
2. Click **"Add New Project"**
3. Click **"Import"** next to `shree-surgico` repository
4. Framework will auto-detect as **Next.js** ✅
5. **IMPORTANT — Add environment variables:**
   Click **"Environment Variables"** and add each one:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
   | `RAZORPAY_KEY_ID` | your Razorpay key ID |
   | `RAZORPAY_KEY_SECRET` | your Razorpay secret |
   | `NEXT_PUBLIC_RAZORPAY_KEY_ID` | your Razorpay key ID |
   | `NEXT_PUBLIC_APP_URL` | https://your-app.vercel.app |
   | `NEXT_PUBLIC_COMPANY_NAME` | Shree Surgico Pharmaceuticals |

6. Click **"Deploy"** — takes about 2 minutes
7. Your live website URL will be:
   `https://shree-surgico.vercel.app`

---

## STEP 7 — Auto-deploy on every code change

Once connected, **every time you push to GitHub, Vercel auto-deploys**:

```bash
# Make a change to any file, then:
git add .
git commit -m "Updated product page"
git push
# → Vercel automatically builds and deploys within 2 minutes
```

---

## STEP 8 — Connect a custom domain (optional)

1. Buy a domain: **shreesurigco.com** or **shreesurgico.in** from GoDaddy / Google Domains (~₹800/yr)
2. In Vercel → Your project → **Settings → Domains**
3. Add your domain and follow the DNS instructions
4. Vercel handles HTTPS/SSL automatically for free

---

## Pages overview

| URL | Who uses it | What it does |
|-----|-------------|--------------|
| `/` | Customers | Browse and search medicines |
| `/checkout` | Customers | Address → Prescription → Pay |
| `/orders` | Customers | Track order by phone number |
| `/admin` | You (pharmacist) | Add/edit/delete products, view stock |
| `/admin/orders` | You (pharmacist) | View orders, verify Rx, update status |

---

## Common issues

**"Cannot find module" error after npm install**
```bash
rm -rf node_modules .next
npm install
npm run dev
```

**Supabase connection error**
- Double-check `.env.local` — no extra spaces around `=`
- Make sure you ran the SQL migrations file

**Razorpay not opening**
- Check browser console for errors
- Ensure `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set (it needs the NEXT_PUBLIC prefix to work in browser)

**Vercel build fails**
- Go to Vercel → your project → **Deployments** → click the failed deploy → read the error log
- Most common cause: missing environment variables

---

## Monthly costs

| Service | Cost |
|---------|------|
| Supabase (database + storage) | **Free** up to 500MB |
| Vercel (hosting) | **Free** up to 100GB bandwidth |
| Razorpay | **2% per transaction** (no monthly fee) |
| SMS OTP via MSG91 | ~₹200/month |
| Domain (.in) | ~₹800/year |
| **Total to start** | **~₹0–500/month** |

---

## Support

Built for Shree Surgico Pharmaceuticals, Mumbai.
For pharmacy software queries, consult a licensed IT vendor familiar with Indian pharmacy regulations.
