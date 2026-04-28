# Prolific Setup Pack — AI Dating Coach Study

A complete kit to recruit 10 testers (single, 25–50) for a 1-hour conversation with your AI dating coach. Everything you need to copy/paste into Prolific is below.

> **Note on sensitivity:** Dating is personal. The privacy story is a recruiting *advantage* here — your reviewers only see the coach's side of the conversation plus aggregate signals (engagement, response length, openness). Participants' own messages are not read by humans. Lead with that in your study description; it will dramatically improve fill rate and quality. Also let participants know they can stop at any time without losing the reward.

---

## 1. Quick overview

**Goal:** 10 participants × 60 min × $15 reward = ~$150 in incentives + ~$50 Prolific fee = **~$200 total**.

**Participant flow:**

1. Participant accepts study on Prolific → clicks the Prolific study link (works on phone or desktop, phone preferred).
2. The Prolific link points at a small **redirect endpoint** on your server (e.g. `https://yourapp.com/r?PROLIFIC_PID={{%PROLIFIC_PID%}}`). Prolific subs in their unique ID.
3. Your redirect endpoint looks up that Prolific ID in a pre-loaded mapping table and **302-redirects** them to their personal chat URL (e.g. `https://yourapp.com/chat/abc123`). If it's a brand-new PID, the endpoint claims the next unused URL from the queue and persists the mapping. **Store the PID alongside the chat session** so the comment ties back later.
4. They chat with the coach for ~50 minutes.
5. They land on a single-page form with an open-ended comments box (optional) and the completion code.
6. They paste the completion code into Prolific to get paid.

**Why a redirect server:** Prolific natively supports only one base URL per study (with parameter substitution). To give each participant a *different* URL — different bot variant, pre-provisioned session, A/B condition, etc. — the cleanest pattern is a 30-line redirect endpoint on your end. You don't need to know participant IDs in advance.

---

## 2. Study description (paste into Prolific)

**Title:**
> Chat for 60 minutes with a new AI dating coach (single people, 25–50)

**Short description (shown in study list):**
> Spend an hour on your phone chatting with a new AI dating coach about whatever's actually on your mind — confidence, app messaging, what you want, awkward situations. Your messages stay private; reviewers only see the coach's side. Optional comment at the end.

**Full description (shown after they accept):**

```
Thanks for considering this study!

You'll spend approximately 60 minutes chatting with a new AI dating
coach. The bot is built to help single people think through dating
life — confidence, dating-app messaging, recovering from a breakup,
figuring out what you actually want, awkward situations, anything
that's actually on your mind. There's no right or wrong way to use
it; we want to see how a real person engages with it.

What you'll do:
1. Click the study link. The chat opens in your browser (phone is
   fine — actually preferred).
2. Pick something real about your dating life and start chatting.
3. Stay engaged for at least 50 minutes. Push back, ask follow-ups,
   go deep on what matters to you.
4. When you're done, tap "Finish." You'll see a one-question comment
   box (optional) and your completion code.
5. Paste the completion code into Prolific to receive your reward.

Privacy — please read:
• YOUR messages are NOT read by our team. We only review the AI's
  responses plus anonymized signals like how engaged you were and
  how much you opened up. Your half of the conversation is private.
• You can stop at any time without losing the reward. If something
  feels off, just close the tab and message us through Prolific —
  we'll still pay you.
• Be honest — we want real reactions, including criticism of the bot.

Estimated time: 60 minutes.
Reward: $15.
```

---

## 3. Screening / prescreening filters

Set these in Prolific's "Prescreening" section when creating the study:

| Filter | Setting |
|---|---|
| **Age** | 25 to 50 |
| **Relationship status** | Single |
| **Country of residence** | US + UK + Canada + Australia (broaden if you want fastest fill; restrict to one country if you want consistency) |
| **Fluent languages** | English |
| **Approval rate** | ≥ 95% (Prolific's quality threshold) |
| **Minimum previous submissions** | ≥ 10 (filters out brand-new accounts) |

**Optional custom screener questions** (Prolific lets you add 1–2 free of charge if needed):

1. "In the past month, have you used an AI chatbot (e.g. ChatGPT, Claude, Gemini, Character.ai)?" — Yes / No / Not sure
2. "Is there something about your dating life right now that you'd genuinely value an outside perspective on?" — Yes / No

Don't auto-reject on Q1 — you want a mix of AI-experienced and AI-naive testers. Use it for segmentation later. Q2 is more important: a "no" likely means a low-engagement session, so consider auto-rejecting those for this round.

---

## 4. End-of-session comments page

Keep this minimal — one optional open-text field plus the completion code. Build it as a single-page Tally form (free, mobile-friendly) or even a static HTML page on your own site.

**Page content:**

```
Thanks for chatting with the dating coach.

If you'd like to share any thoughts about your experience —
what worked, what didn't, anything that surprised you, anything
you wish it had done differently — drop them here. This is
optional and totally open-ended.

[ large open-text box, optional ]

[ Submit ]
```

**Submit screen:**

```
Done — thank you!

Your completion code is: DATECOACH60
(replace with your real code — see step 4 of the walkthrough)

Paste this into Prolific to receive your $15.
```

That's it. The structured signals you actually care about (engagement, response length, openness) come from your server-side analysis of the conversation, not from a survey.

---

## 5. Step-by-step Prolific walkthrough

### Step 1 — Create your researcher account
- Go to https://www.prolific.com/ and sign up as a researcher (not a participant — different signup flow).
- Verify email, add a payment method. Prolific holds funds in a balance you top up; minimum top-up is usually around $50–$100.

### Step 2 — Set up your comments page + completion code
- Build the comments page in Tally (free, fastest, mobile-friendly) — one optional open-text question, one submit button.
- On the submit/thank-you screen, display a unique completion code, e.g. `DATECOACH60`. Make it specific to this study so you can spot copy-paste cheaters.
- Copy the **comments page URL** — you'll wire it up at the end of the chat session.

### Step 3 — Build the per-user URL queue and redirect endpoint

**3a. Pre-provision your 10 URLs.** Make a list of the 10 distinct chat URLs you want to hand out, one per tester. For example:

```
1.  https://yourapp.com/chat/variant-a/session-001
2.  https://yourapp.com/chat/variant-a/session-002
3.  https://yourapp.com/chat/variant-b/session-003
4.  https://yourapp.com/chat/variant-b/session-004
... (etc, 10 total)
```

These can differ in any way you like — bot variant, system prompt version, pre-seeded context, isolated session token. Whatever the reason for needing distinct URLs, this is the list you'll work from.

**3b. Add a redirect endpoint at `/r`.** Roughly 30 lines of code. Pseudocode:

```python
# Pre-load the queue (e.g. from a config file or DB table)
URL_QUEUE = [
    "https://yourapp.com/chat/variant-a/session-001",
    "https://yourapp.com/chat/variant-a/session-002",
    # ... 10 total
]
assignments = {}  # prolific_pid -> assigned_url, persisted in DB

@app.route("/r")
def redirect_participant():
    pid = request.args.get("PROLIFIC_PID")
    if not pid:
        return "Missing PROLIFIC_PID", 400

    if pid not in assignments:
        # First visit — claim the next unused URL
        used = set(assignments.values())
        next_url = next((u for u in URL_QUEUE if u not in used), None)
        if next_url is None:
            return "Study full", 410
        assignments[pid] = next_url  # persist to DB

    # Append PID so the chat page can store it with the session
    target = assignments[pid]
    sep = "&" if "?" in target else "?"
    return redirect(f"{target}{sep}PROLIFIC_PID={pid}")
```

Persist `assignments` in a real database — if your server restarts, you must not re-shuffle anyone's URL.

**3c. Wire the chat session to capture PID.** When the chat page loads, read `PROLIFIC_PID` from the URL and store it on the session record. This is how the optional comment ties back later.

**3d. Wire the "Finish" redirect.** When the user clicks "Finish" in chat, send them to the comments page with the PID as a hidden field:
```
https://tally.so/r/abc123?prolific_pid=PROLIFIC_PID_VALUE
```

**3e. Test on mobile.** Phone is the preferred device for this study. Test the full flow — Prolific link → `/r` redirect → chat → finish → comments page → completion code — on at least an iPhone and an Android.

### Step 4 — Create the study in Prolific
1. Click **+ New study** → choose **External study** (not Prolific's built-in survey tool).
2. Paste the study description from section 2 above.
3. Paste the **redirect endpoint URL** (not a direct chat URL) with the placeholder:
   ```
   https://yourapp.com/r?PROLIFIC_PID={{%PROLIFIC_PID%}}
   ```
   Prolific will substitute each participant's unique ID at click time, and your `/r` endpoint will assign them a personal chat URL from the queue.
4. Set the **completion code** to your unique code (`DATECOACH60`).
5. Choose **"Single completion code"** (since everyone gets the same one).
6. Set:
   - Estimated completion time: **65 minutes**
   - Reward: **$15.00** (this works out to ~$13.85/hour, well above the $8 minimum)
   - Total places: **10**
7. Open **Prescreening** → apply the filters from section 3.
8. Review the cost summary. Expect roughly:
   - $150 to participants
   - ~$50 Prolific service fee (33%)
   - **~$200 total** — you'll need at least this much in your balance to publish.

### Step 5 — Pilot first
- Before publishing all 10 places, run **1 pilot participant** first. Set "Total places" to 1, publish, wait for that one submission, check that:
  - The `/r` endpoint assigned them a URL from the queue and persisted the mapping.
  - That URL is now marked as used (so the next participant won't get the same one).
  - The Prolific ID landed in your session log on the chat page.
  - The comments page submission (if they left one) landed in Tally with the matching ID.
  - The completion code worked end-to-end.
  - The full flow looked right on mobile.
- Fix anything that broke. Then increase Total places to 10 and republish. Make sure your URL queue still has at least 9 unused entries left.

### Step 6 — Launch and monitor
- A 10-person study with these filters typically fills in **2–24 hours**.
- Approve submissions in the Prolific dashboard within 7 days (otherwise auto-approve kicks in). Reject only if someone clearly didn't engage — e.g. transcript shows 5 messages over 60 minutes. Be generous with approvals; rejections hurt your researcher reputation.
- For partial-effort but not-fraud cases, use **bonus payments** to reward good engagement rather than rejecting.
- Honor your "you can stop early and still get paid" promise. Approve early-finishers unless the engagement metrics show they didn't actually try.

---

## 6. Budget summary

| Item | Cost |
|---|---|
| 10 participants × $15 reward | $150.00 |
| Prolific service fee (~33%) | ~$50.00 |
| Tally / Google Forms (survey) | Free |
| **Total** | **~$200** |

Add ~$30 buffer for an extra pilot run or topping up bonuses.

---

## 7. Pre-launch checklist

- [ ] List of 10 distinct chat URLs prepared (`URL_QUEUE`)
- [ ] `/r` redirect endpoint deployed — claims next unused URL on first PID hit, persists assignment
- [ ] Assignment table backed by a real database (survives server restart)
- [ ] Chatbot accepts `PROLIFIC_PID` from URL params and stores it with the session
- [ ] Chat UI tested on iPhone and Android — typing, scrolling, "Finish" button all work cleanly
- [ ] "Finish" button redirects to comments page URL with PID passed through as hidden field
- [ ] Comments page built in Tally — one optional open-text question
- [ ] Comments page submit screen displays unique completion code (`DATECOACH60`)
- [ ] Server-side analytics in place to compute engagement / response length / openness per session
- [ ] Prolific researcher account created and funded ($230+)
- [ ] Study configured with `/r?PROLIFIC_PID={{%PROLIFIC_PID%}}` link, prescreening filters (single, 25–50), $15 reward, 60 min estimate
- [ ] Pilot run with 1 participant — full flow tested end-to-end on a phone, queue correctly decremented
- [ ] Increased to 10 places and republished

---

## 8. After the study — quick analysis tips

Since you're not running a survey, your signal comes from three places: the coach's outputs, the conversation-level metrics, and the optional comments. A few things to look for:

- **Stratify by openness.** Sort the 10 sessions by how open the participant got. Read the *coach's* messages from the highest-openness sessions and the lowest-openness ones side by side. Whatever the coach was doing differently is your earliest hypothesis about what's working.
- **Engagement curve over time.** For each session, plot response length and message frequency in 5-minute buckets. A natural drop-off after ~30 min is fine; a sharp cliff at 10 min means the bot is losing them early — usually a sign the opening 3–5 turns aren't doing their job.
- **Dead-end detection.** Scan the coach's responses for repetition or generic fallbacks. Anywhere the coach said something it had already said, or hit a "that's interesting, tell me more" pattern, mark it. These are your highest-priority prompt fixes.
- **Comments are gold but optional.** Maybe 4–6 of 10 will leave a comment. Read them, but weight them against the metrics — a participant who wrote "loved it" but had a 12-minute openness-zero session is telling you something different than the metrics are.

Good luck with the study.
