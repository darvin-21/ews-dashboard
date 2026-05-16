# Deploy this dashboard to a free public URL (10 minutes)

We're going to use **Render**. Free, no credit card, you'll end up with two URLs:

- `https://ews-frontend-xxxx.onrender.com` ← what you share
- `https://ews-backend-xxxx.onrender.com` ← the API (you usually won't touch it)

You will need a **free GitHub account** and a **free Render account**.

---

## Step 1 — Unzip the project

Open the `ews-dashboard.tar.gz` you downloaded.

- **Mac:** double-click it. You'll get a folder called `ews`.
- **Windows:** right-click → 7-Zip or WinRAR → "Extract here", twice (once for the `.gz`, once for the `.tar`). You'll get a folder called `ews`.
- **Linux:** `tar -xzf ews-dashboard.tar.gz`

You should see this inside:

```
ews/
├── backend/
├── frontend/
├── render.yaml           ← this is the magic file
├── README.md
└── ...
```

---

## Step 2 — Put it on GitHub

1. Go to **https://github.com/new**
2. Repository name: `ews-dashboard` (or anything)
3. Set it **Private** if you prefer. Render reads private repos fine.
4. Don't tick any of the "Add a README / .gitignore / license" boxes — the project already has them.
5. Click **Create repository**.

Now you need to push the unzipped folder up. The page you just created shows the commands — use the "push an existing repository" block. It looks like this:

```bash
cd ews                                            # the folder you unzipped
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ews-dashboard.git
git push -u origin main
```

If you've never used git: install **GitHub Desktop** (https://desktop.github.com) instead. It's the same thing with a UI — choose "Add an existing repository from your hard drive", point at the `ews` folder, then "Publish repository". That's it.

---

## Step 3 — Deploy on Render

1. Go to **https://render.com** and sign up (use GitHub login — fastest).
2. Once logged in, click the **New +** button → **Blueprint**.
3. Connect your GitHub account if prompted, then pick the `ews-dashboard` repository.
4. Render reads `render.yaml` from the repo and shows you two services it's about to create:
   - `ews-backend` (Docker, free)
   - `ews-frontend` (Docker, free)
5. Click **Apply**.

That's it. Render starts building both. Watch the logs — first build takes about **5–8 minutes** because it's installing Python + Node from scratch. You'll see green checkmarks when each service is live.

---

## Step 4 — Open the dashboard

In the Render dashboard:

1. Click `ews-frontend`
2. At the top, you'll see a URL like `https://ews-frontend-abcd.onrender.com` — click it.
3. The dashboard opens.

**First time it loads, the backend's database is empty.** You'll see "Data unavailable" everywhere for ~2 minutes while it pulls World Bank + IMF data in the background. Refresh the page after a couple of minutes — the numbers fill in.

You can also force a refresh by clicking the **"Refresh data now"** button in the sidebar.

---

## Step 5 — Share it

Just send anyone the `ews-frontend-xxxx.onrender.com` URL. They don't need an account, login, anything.

---

## Important free-tier quirks

1. **The first visit after 15 minutes of inactivity takes ~30 seconds to wake up.** Render spins down free services to save power. The first page load will hang for half a minute, then everything works normally for the next 15 minutes.

2. **The SQLite database resets if you push code changes** (free tier disks aren't fully persistent across deploys). The data refetches automatically — just wait a minute after a deploy.

3. **FRED indicators stay "Data unavailable" by default.** This is fine for the prototype. If you want them populated:
   - Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html (takes 1 minute)
   - In Render: open the `ews-backend` service → Environment → add `FRED_API_KEY` = your key → Save (it auto-redeploys)

---

## If something fails

**Build fails on the frontend with `vite: not found`:** make sure `frontend/package.json` was committed. Run `git status` in the project folder — if you see `package.json` listed under "Untracked files", run `git add . && git commit -m "fix" && git push`.

**Frontend loads but every panel says "Data unavailable":** the backend is still doing its first refresh. Wait 2 minutes, hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R).

**Frontend shows blank page, browser console says "CORS" or "Failed to fetch":** the frontend wasn't built with the backend URL. In Render, click `ews-frontend` → Manual Deploy → "Clear build cache & deploy". This re-runs the build with the env var injected correctly.

**You see a 404 on a route like `/api/risk/assess`:** the backend service crashed. Check `ews-backend` → Logs. Most common cause is hitting the free-tier 512 MB RAM ceiling during the initial fetch — the service auto-restarts; just wait a minute.

---

## Alternative free hosts

If Render doesn't work for you, the same files deploy to:

- **Railway** (https://railway.app) — read `render.yaml`'s structure and create two services manually, same Dockerfiles.
- **Fly.io** (https://fly.io) — `fly launch` in each of `backend/` and `frontend/`, then `fly deploy`.
- **Replit** — import the GitHub repo as a Repl; uses the Dockerfiles automatically.

All three offer free tiers with similar cold-start trade-offs.
