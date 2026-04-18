# How to install — 5 steps

This folder mirrors the structure of your Verona project. Every file is already named and placed correctly. You do not need to rename anything.

---

## Step 1 — Extract the zip

Unzip it anywhere — Desktop, Downloads, wherever. You'll end up with a folder called `verona-files`.

## Step 2 — Merge into your project

Open **two** File Explorer windows side by side:

- **Left window:** the unzipped `verona-files` folder
- **Right window:** `C:\Projects\Verona\verona-demo`

In the left window, select the `app` folder and the `supabase` folder (two items — use Ctrl+click to select both).

Drag them onto the right window.

Windows will ask: "There are already files with these names. Do you want to replace them?" → Click **"Replace the files in the destination."**

That's it. All the new files are now in the right place, and existing files have been overwritten where needed.

> Don't worry — no existing files will be deleted that shouldn't be. The only files that get overwritten are ones you're deliberately updating.

## Step 3 — Run the SQL

Open `verona-demo/supabase/001_add_inviter_name.sql` in VS Code. Copy its contents.

Go to **supabase.com → your Verona project → SQL Editor → New query**. Paste. Click **Run**.

(If you've already set up the dev Supabase from the ops guide, run it there first. If not, just run it on your current Supabase.)

## Step 4 — Test locally

In VS Code, open a terminal (View → Terminal, or Ctrl+`):

```
npm run dev
```

Then in your browser go to `http://localhost:3000/admin`.

Log in. Click Invites tab. You should see **two** input fields — "Who's being invited" and "Who's introducing them." Create a test invite with both names. Copy the link.

Open an incognito window. Paste the link. Click "Start talking to Angelica."

You should see two messages appear immediately:

> Hi [Name], I'm Angelica. Nice to meet you. I am glad [Inviter] introduced us.
>
> How has your week been?

If you see those, it works.

## Step 5 — Ship it

In VS Code's Source Control panel (left sidebar, the branching icon):

1. You'll see a list of changed files.
2. Type a commit message like "scripted first message" in the box at the top.
3. Click the checkmark (or press Ctrl+Enter) to commit.
4. Click the "..." menu → Push.

Vercel auto-deploys. Then **go to production Supabase and run the same SQL there** before anyone uses the new feature. Otherwise production will crash because the column doesn't exist yet.

---

## If something breaks

- **White screen on localhost:** check the VS Code terminal for a red error. Usually says exactly which file has a problem. Send me the error text.
- **"Cannot find module" error:** a file landed in the wrong folder. Check that the paths in this folder exactly match the paths in your project.
- **Opening message doesn't appear:** check that you ran the SQL, and that `app/api/messages/route.js` exists (it's a new folder and file, and easy to miss).
- **Admin tab is blank:** hard-refresh the browser (Ctrl+Shift+R). Cached old JavaScript is usually the culprit.

Anything else, paste the error and I'll diagnose in 30 seconds.
