# Verona — End of session checklist

*Run through this before you close your laptop. Every time.*

---

## 1. What's on my laptop

Open the **Source Control panel** in VS Code (the branching icon on the left sidebar).

- Is the "Changes" list empty?
  - **Yes** → good, everything saved is committed. Skip to step 2.
  - **No** → I have uncommitted work.
    - Read each changed file. Is this work I want to keep?
    - If yes: type a short commit message (e.g. "added inviter_name to admin") and click the tick. Then click the "…" menu → Push.
    - If no: right-click the file → Discard Changes.

## 2. What's on GitHub

Go to **github.com → your Verona repo**.

- Does the top of the page show my most recent commit message?
  - **Yes** → GitHub is in sync with my laptop.
  - **No** → I haven't pushed. Go back to VS Code, click "…" → Push.

## 3. What Vercel is running

Go to **vercel.com → your Verona project**.

- Is the most recent deployment green (Ready)?
  - **Yes** → the live site matches GitHub.
  - **Building** → wait 60 seconds and refresh.
  - **Error/Failed** → click the deployment, read the build log. The error is almost always in the last 20 lines. Copy it and ask Claude.
  - **No new deployment for my latest commit** → something's wrong with the GitHub-Vercel connection. Rare. Ask Claude.

## 4. What Supabase looks like

This is the one that bites. If I ran any SQL today, ask:

- Did I run it on **both** dev and production Supabase?
  - **Yes** → fine.
  - **Only dev** → production will break the moment someone uses the new feature. Run the SQL on production now, or revert the related code push.
  - **Only production** → unusual but okay for now.

- Is the SQL saved somewhere in my repo (e.g. `supabase/005_something.sql`)?
  - **Yes** → future me can reproduce this.
  - **No** → copy the SQL from the Supabase SQL editor into a numbered file in `supabase/` and commit it. The schema has to live in the repo too, or it doesn't exist.

## 5. The final sanity check

Open the live site (**verona-ai.app** or wherever your domain is) in an incognito window. Click around for 30 seconds.

- Does it load?
- Does the admin page load?
- Can I start a conversation?

If all three: write the dev diary entry and close the laptop.

If any one breaks: do not close the laptop. Open Vercel, find the last good deployment, and use the "Promote to Production" or "Rollback" option. Then diagnose in the morning.

---

## If I'm panicking

The *site is already broken* and I don't know what I did:

1. Vercel → Deployments → find the last deployment that was green before I started today.
2. Click the "…" menu on that deployment → "Promote to Production."
3. Site is back. Breathe.
4. Now figure out what broke, without time pressure.

Rollback is free. Use it. It's the single most underused button in this stack.
