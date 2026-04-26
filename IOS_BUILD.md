# Verona iOS — Capacitor Build Guide

This wraps the live Verona web app (https://verona-demo.vercel.app) in a native iOS shell using Capacitor. The web app loads from Vercel; the native shell handles the splash screen, status bar, keyboard, and (later) push notifications.

## What's already done

- Capacitor packages added to `package.json`
- `capacitor.config.json` configured for `com.verona.app`, pointed at the live Vercel URL
- `www/index.html` placeholder (Capacitor needs a `webDir` even when using `server.url`)

## What you still need

1. **A Mac with Xcode** (Xcode 15 or later). Apple's iOS toolchain only runs on macOS.
   - If you don't own a Mac, options:
     - **MacinCloud** (~$30/month) — full remote Mac
     - **MacStadium** — pricier, better hardware
     - **Codemagic** or **Expo EAS Build** — CI services that build for you (you don't get an interactive Mac, just an `.ipa` artifact)
2. **Apple Developer Program membership** — $99/year, required to publish to TestFlight or the App Store. Sign up at https://developer.apple.com/programs/
3. **CocoaPods** installed on the Mac (`sudo gem install cocoapods`)
4. **Node.js 20+** on the Mac

## Step-by-step (run on the Mac)

```bash
# 1. Clone the repo onto the Mac (or sync via git, Dropbox, etc.)
git clone <your-repo-url> verona-demo
cd verona-demo

# 2. Install dependencies (Capacitor included)
npm install

# 3. Add the iOS platform — generates the ios/ Xcode project
npx cap add ios

# 4. Sync the config + web assets to iOS
npx cap sync ios

# 5. Open the project in Xcode
npx cap open ios
```

## Inside Xcode

1. Select the **App** target in the project navigator.
2. Under **Signing & Capabilities**:
   - Tick **Automatically manage signing**
   - Choose your Apple Developer **Team**
   - Confirm Bundle Identifier reads `com.verona.app` (change in `capacitor.config.json` and re-sync if needed)
3. Set the **Display Name** to `Verona` (defaults from config).
4. Set the **Deployment Target** to iOS 14.0 or higher.
5. Plug in an iPhone (or pick a simulator) and hit **Run** ▶ — the app should launch and show the live Verona chat.

## App icons & splash screen

Capacitor generates placeholder icons. Replace them with real Verona artwork:

```bash
# install once
npm install --save-dev @capacitor/assets

# put a 1024x1024 icon.png and a 2732x2732 splash.png in resources/
mkdir resources
# (drop your assets in)

npx capacitor-assets generate --ios
```

Use the cream brand colour `#FAF0EE` as the splash background (already set in `capacitor.config.json`).

## Test build → TestFlight

1. In Xcode: **Product → Archive**
2. When the Organizer opens: **Distribute App → App Store Connect → Upload**
3. Log in to https://appstoreconnect.apple.com, add a test build, invite your email as an internal tester.
4. Install **TestFlight** on your iPhone, accept the invite, install Verona.

## Things to handle before public App Store submission

These are **mandatory** for App Store review and most will trip you up if skipped:

- **Account deletion in-app.** Apple Guideline 5.1.1(v). Add a "Delete my account" flow (currently Verona has no account model — you'll need a route on the web side that wipes the user's row + messages).
- **Privacy policy URL.** Required in the App Store listing.
- **Privacy "nutrition label"** in App Store Connect — declare what data you collect (Anthropic API calls, Supabase storage of messages, IP via Vercel).
- **Age rating.** An AI companion with intimate conversational themes will likely need 17+.
- **Content moderation story.** Apple will ask how you prevent the AI from generating harmful content. Have an answer ready (system prompt safeguards, Anthropic's own content filters, abuse reporting flow).
- **Guideline 4.2 risk.** A pure web wrapper can be rejected as "minimum functionality." Mitigations: native splash, native status bar styling, native keyboard handling, push notifications. The current setup gives you the first three; push is the strongest signal for "this is a real native app."

## Adding push notifications later (recommended)

1. `npm install @capacitor/push-notifications`
2. Enable **Push Notifications** + **Background Modes (remote notifications)** in Xcode capabilities
3. Generate an APNs key in Apple Developer portal
4. Wire a server-side trigger (Supabase edge function or Vercel cron) that calls APNs
5. Handle token registration in the Capacitor JS layer and store device tokens in Supabase

That's a half-day of work once the app is otherwise building.

## Troubleshooting

- **`pod install` fails** — run `sudo gem install cocoapods` and retry `npx cap sync ios`.
- **WebView shows a blank screen** — open Safari → Develop → [your device] → inspect the WebView for console errors. Most often `localStorage` access denied, fixed by `limitsNavigationsToAppBoundDomains: false` (already set).
- **Invite links don't open the app** — universal links aren't configured yet. For v1 the user opens `verona-demo.vercel.app/?invite=xxx` in Safari which copies the token; better is configuring Associated Domains and an `apple-app-site-association` file on the Vercel side. Worth doing before App Store launch.
- **Apple rejects v1 as a thin wrapper** — add push notifications, plus a native settings screen, then resubmit.

## File summary

| File | Purpose |
|---|---|
| `capacitor.config.json` | Capacitor settings, points WebView at the live Vercel URL |
| `www/index.html` | Required placeholder (Capacitor needs a webDir) |
| `package.json` | Now includes `@capacitor/*` dependencies |
| `ios/` | Generated on the Mac by `npx cap add ios` — commit it to git |

## Next steps (priority order)

1. Get a Mac (or cloud Mac) and run the steps above to produce a TestFlight build.
2. Replace placeholder icons/splash with real artwork.
3. Implement account deletion on the web side.
4. Add push notifications.
5. Tighten Apple submission package: privacy policy, age rating, content-moderation explainer, screenshots.
