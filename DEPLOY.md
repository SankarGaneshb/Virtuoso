# Deploying Virtuoso 🎻

Since Virtuoso uses **SQLite** (a local database file), you need a hosting provider that supports **Persistent Storage (Volumes)**. If you use a standard "ephemeral" host (like Heroku or Vercel), your database will reset every time the server restarts.

## 🟢 Easiest Option: Replit (Recommended)
**Replit** is a beginner-friendly platform that lets you run the project directly in your browser. It handles the database automatically.

1.  **Sign Up**: Go to [replit.com](https://replit.com) and create an account.
2.  **Import**: Click **"Create Repl"** -> **"Import from GitHub"**.
3.  **Paste URL**: Paste your repository URL: `https://github.com/SankarGaneshb/Virtuoso`.
4.  **Run**: Click the big green **"Run"** button. 
    - Replit will automatically install the tools and start the server.
    - A "Webview" window will appear showing your running app title `Virtuoso`.
5.  **Secrets**: To make GitHub tracking work, go to the **"Secrets"** (Lock icon) tab on the left and add `GITHUB_TOKEN`.

---

## Other Options (Advanced)

### 1. Railway (Easiest & Best Performance)
Railway supports persistent volumes specifically for apps like this.
1.  Sign up at [railway.app](https://railway.app).
2.  Click "New Project" -> "Deploy from GitHub repo".
3.  Select `SankarGaneshb/Virtuoso`.
4.  Add a **Volume** in settings and mount it to `/app/data` (if you modify the code to save DB there, otherwise standard matching works but volume is safer).
5.  Set Environment Variables (`GITHUB_TOKEN`, etc.).

### 2. Glitch (Community Favorite)
Glitch handles SQLite natively and is perfect for community apps.
1.  Go to [glitch.com](https://glitch.com).
2.  "Import from GitHub" -> `SankarGaneshb/Virtuoso`.
3.  It just works! (But it sleeps after inactivity on free tier).

### 3. Render / Fly.io (Professional)
Both support Docker (which I just added support for!).
- **Render**: Create a "Web Service". You'll need a "Disk" (paid feature) to keep the DB safe.
- **Fly.io**: Use `fly launch`. It will detect the Dockerfile. You'll need to mount a volume for the DB to persist.

### 4. Google Cloud Platform (GCP)
Yes, you can deploy to **Cloud Run** using the Dockerfile!

1.  **Build**: `gcloud builds submit --tag gcr.io/PROJECT-ID/virtuoso`
2.  **Deploy**: `gcloud run deploy virtuoso --image gcr.io/PROJECT-ID/virtuoso --platform managed`
3.  **⚠️ Critical Note on Persistence**: 
    By default, Cloud Run is "stateless" (your DB will reset on restart). To fix this, you must **mount a volume**:
    - Go to "Edit & Deploy New Revision" -> "Volumes".
    - Add a trusted volume (or use a Cloud Storage bucket mount) mapped to `/app/data`.
    - *Simpler Alternative*: Use **Google Compute Engine** (a standard VM) where files just stay there.

## Docker Support
I have added a `Dockerfile` to your repository. This means you can deploy Virtuoso to **any** cloud provider that supports containers (AWS, Azure, DigitalOcean, etc.).
