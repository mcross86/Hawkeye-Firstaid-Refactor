# Hawkeye — Production deploy (hawkeyefas.com)

GoDaddy VPS with cPanel + Apache + PM2. This guide is for **UI and API updates** you want visible at **[https://hawkeyefas.com](https://hawkeyefas.com)**.

---

## How production is wired


| Piece                     | Where it lives                             | How users reach it                                                  |
| ------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| **Web UI** (React/Vite)   | Built files in `~/public_html/`            | Browser → `https://hawkeyefas.com`                                  |
| **API** (Express, SQLite) | PM2 process `hawkeye-api` on port **3001** | Browser → `https://hawkeyefas.com/api/...` (Apache proxies to Node) |
| **Source code**           | Git repo on server                         | Not served directly                                                 |


**Important:** Committing on your PC does **not** update the live site until you **push**, then **pull on the server**, **rebuild the web app**, and **copy `dist` into `public_html`**. Restarting PM2 alone only reloads the API.

---

## Quick checklist (correct order)

### On your PC (Cursor)

1. Make and save your changes in Cursor.
2. **Commit** (`git commit`).
3. **Push** to GitHub (`git push`) — **required** before the server can `git pull`.

### On the VPS (SSH as `hawkeyefas`)

1. SSH into the server (see below).
2. `cd` to the repo folder.
3. `git pull`
4. `npm install` — only if `package.json` / `package-lock.json` changed.
5. `**npm run build:web`** — builds `apps/web/dist/`
6. **Sync `dist` → `public_html`** — this is what updates the UI in the browser.
7. `**pm2 restart hawkeye-api**` — when you changed **API**, migrations, or server logic (skip for **UI-only** changes).
8. Hard-refresh the browser (`Ctrl+Shift+R`) on [https://hawkeyefas.com](https://hawkeyefas.com)

---

## Step-by-step

### 1–3. Local: edit, commit, push

```powershell
cd "c:\Users\Mcros\Documents\Ross Product Management\Hawkeye Firstaid Refactor"

git status
git add -A
git commit -m "Describe your change"
git push
```

If `git push` fails, fix that before SSH — the server only sees what is on `origin/main`.

---

### 4. SSH into Hawkeyefas

From **PowerShell** on your PC:

```powershell
ssh hawkeyefas@160.153.181.66
```


| Item          | Value                                     |
| ------------- | ----------------------------------------- |
| **Host / IP** | `160.153.181.66`                          |
| **Username**  | `hawkeyefas` (not `root`, not `snipzs`)   |
| **Password**  | Your cPanel/VPS password for this account |


**Success:** prompt looks like `[hawkeyefas@66 ~]$`

Run PM2 and deploy commands **as `hawkeyefas`**, not root.

---

### 5. Go to the repo folder

```bash
cd ~/repositories/Hawkeye-Firstaid-Refactor
```

Exact path on server:

```text
/home/hawkeyefas/repositories/Hawkeye-Firstaid-Refactor
```

**Do not** run `git pull` from `~` (home) — that folder is not a git repo.

---

### 6. Pull latest code

```bash
git pull
```

Confirm you see your commit (or “Already up to date” after a recent push).

Optional sanity check for a known file:

```bash
git log -1 --oneline
```

---

### 7. Install dependencies (if needed)

Run when you added/updated npm packages:

```bash
npm install
```

Skip if you only changed `.jsx`, `.js`, CSS, or copy — no lockfile change.

---

### 8. Build the web app

```bash
npm run build:web
```

**Output directory:** `apps/web/dist/` (inside the repo).

Build must finish with `✓ built` and no errors before the next step.

---

### 9. Publish UI to `public_html`

Apache serves `**~/public_html/`** as the website. Copy the **contents** of `dist` there.

From the repo root:

```bash
rsync -av --delete apps/web/dist/ ~/public_html/
```

```bash
cp -r apps/web/dist/* ~/public_html/
```

**Common mistake:** running `rsync` from `~` instead of the repo — path must be `apps/web/dist/` relative to `Hawkeye-Firstaid-Refactor`.

Verify:

```bash
ls -la ~/public_html/index.html
grep -r "Firstaid and Safety" ~/public_html/assets/ 2>/dev/null | head -1
```

(Replace the grep string with something from your latest UI if testing.)

---

### 10. Restart the API (when backend changed)

```bash
pm2 restart hawkeye-api
```


| Restart? | When                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| **Yes**  | API routes, `apps/api/`, new SQL **migrations**, `.env` for API, seed, SQLite logic |
| **No**   | **UI-only** changes (React pages, styles) after pull + build + `public_html` sync   |


Check API:

```bash
curl -sS http://127.0.0.1:3001/api/health
```

Expect: `{"ok":true,"service":"hawkeye-api"}`

List processes:

```bash
pm2 list
```

App name is `**hawkeye-api**` (not `hawkeyefas`).

Migrations run automatically when the API starts (`initDb` applies new files under `apps/api/migrations/`).

---

### 11. Browser

Open **[https://hawkeyefas.com](https://hawkeyefas.com)** and hard-refresh:

- Windows: `Ctrl+Shift+R`
- Or use a private/incognito window

---

## What you had vs correct order

Your list had **sync before build** — that publishes an **old** build. Always:

1. `git pull`
2. `npm run build:web`
3. sync `apps/web/dist/` → `public_html`
4. `pm2 restart hawkeye-api` (if API changed)

You also missed `**git push`** on your PC before SSH.

---

## Deploy scenarios

### UI-only (most common)

```bash
cd ~/repositories/Hawkeye-Firstaid-Refactor
git pull
npm run build:web
rsync -av --delete apps/web/dist/ ~/public_html/
```

Then hard-refresh the browser. No PM2 restart.

### API / database only (no UI)

```bash
cd ~/repositories/Hawkeye-Firstaid-Refactor
git pull
npm install   # if dependencies changed
pm2 restart hawkeye-api
```

Test: `curl -sS http://127.0.0.1:3001/api/health`

### Full deploy (UI + API)

Do both sections: build + `rsync`, then `pm2 restart hawkeye-api`.

---

## Production paths (reference)


| Item             | Path                                                      |
| ---------------- | --------------------------------------------------------- |
| Repo             | `/home/hawkeyefas/repositories/Hawkeye-Firstaid-Refactor` |
| Web build output | `.../apps/web/dist/`                                      |
| Live website     | `/home/hawkeyefas/public_html/`                           |
| API env          | `.../apps/api/.env`                                       |
| SQLite DB        | `/home/hawkeyefas/data/hawkeye-driver-flow.db`            |
| PM2 app name     | `hawkeye-api`                                             |
| API port (local) | `3001`                                                    |
| Public API URL   | `https://hawkeyefas.com/api/...`                          |


---

## Troubleshooting


| Problem                        | Likely cause                                | Fix                                                                                    |
| ------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| UI change not visible          | Old files in `public_html` or browser cache | Re-run build + `rsync`; hard-refresh                                                   |
| `git pull` does nothing        | Forgot `git push` on PC                     | Push locally, then pull again                                                          |
| `rsync: apps/web/dist failed`  | Wrong working directory                     | `cd ~/repositories/Hawkeye-Firstaid-Refactor` first                                    |
| API behavior unchanged         | Did not restart PM2                         | `pm2 restart hawkeye-api`                                                              |
| `/api/...` 404 HTML            | Apache proxy issue                          | Separate from deploy — see Snipz `deploy/vps/README.md` userdata pattern for port 3001 |
| `pm2 restart hawkeyefas` fails | Wrong process name                          | Use `hawkeye-api`                                                                      |


---

## Related

- Snipz on same VPS (port **3002**, domain **snipzs.com**): `Snipz Refactor/deploy/vps/README.md`
- Do **not** add a global Apache `ProxyPass /api/` → 3001; use per-domain proxy for `hawkeyefas.com` only.

---

*Last updated: May 2026 — hawkeyefas.com @ 160.153.181.66*