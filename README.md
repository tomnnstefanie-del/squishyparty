# Squishy Party: party planner, email check, PayNow deposit and Telegram alerts

How a request works:

1. **Parent plans the party** and, on the last step, verifies their email with a 6-digit code (free, sent from your Gmail).
2. **They press Send my request.** The server re-prices the order and sends you a Telegram message with everything: contact details (email marked ✅ verified), date and time, address and exact location, guests, the Squishy Party lines, the 10% holding deposit, add-ons, total, budget and notes. A **WhatsApp the customer** button opens a chat with a greeting typed.
3. **The parent gets an email:** "Your request is currently being verified by our team, and we'll reach out to you on WhatsApp", with their details and the PayNow QR.
4. **The page shows a PayNow QR** for the 10% holding deposit. Their banking app fills in the exact amount and the reference (e.g. `SP-261121-AB12`). When they tap **I've paid the deposit**, you get a second Telegram message: "Deposit marked as paid… check your bank for reference SP-…".
5. You check the payment in your bank app (search the reference), then WhatsApp them to confirm.

Fine print shown on the page, in the FAQ and in the email: the 10% holding deposit is refunded in full if you're unable to attend on their date, deducted from the full amount if they go ahead with the package, and non-refundable if they cancel.

```
public/index.html      the whole website (one file)
api/request.js         sends the request (Vercel serverless function)
api/otp.js             emails and checks the 6-digit code
api/paid.js            "I've paid" -> Telegram note
lib/pricing.js         server-side prices (browser totals are never trusted)
lib/catalogue.js       price list, generated from public/index.html
lib/validate.js        checks every field before anything is sent
lib/telegram.js        builds and sends the Telegram message
lib/otp.js             signed codes and tokens (no database needed)
lib/mail.js, emails.js sends the code and confirmation emails
lib/paynow.js          PayNow QR with amount + reference (SGQR format)
dev/                   local server, mock Telegram, chat-ID helper
tests/                 npm test (unit + full browser end-to-end)
```

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | What it is | Needed for |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather | Requests |
| `TELEGRAM_CHAT_ID` | Your group's chat ID (starts with `-`) | Requests |
| `SMTP_USER` | The Gmail address that sends emails, e.g. `squishyparty.sg@gmail.com` | Email codes + confirmation |
| `SMTP_PASS` | A Gmail **app password** (16 letters, not your normal password) | Email codes + confirmation |
| `PAYNOW_UEN` *or* `PAYNOW_MOBILE` | Where deposits go: your business UEN (e.g. `53123456X`) or a PayNow mobile (`91234567`) | Deposit QR |
| `PAYNOW_NAME` | Name shown in the banking app, e.g. `Tom & Stefanie` | Deposit QR |
| `MAIL_FROM` *(optional)* | Sender shown to parents, e.g. `Squishy Party <squishyparty.sg@gmail.com>` | |
| `MAIL_REPLY_TO` *(optional)* | Where parents' replies go, if not the sending Gmail | |
| `SMTP_HOST`, `SMTP_PORT` *(optional)* | Only if you don't use Gmail (defaults `smtp.gmail.com`, `465`) | |

After adding or changing variables, go to **Deployments → ⋯ → Redeploy**.

- **Without the Telegram or email variables,** the site refuses requests with "Requests are not switched on yet". It never pretends a request was sent.
- **Without the PayNow variables,** requests still work, and the page says the PayNow details will come on WhatsApp.

### Gmail app password (for SMTP_PASS)
1. Use a Gmail account for the business (a new one like `squishyparty.sg@gmail.com` is best).
2. Turn on **2-Step Verification**: Google Account → Security.
3. Go to **myaccount.google.com/apppasswords**, create one named "Squishy Party", and copy the 16-letter password into `SMTP_PASS` (no spaces).
4. Gmail sends up to about 500 emails a day for free, which is plenty for codes and confirmations.

## 1. Create your Telegram bot (5 minutes)

1. In Telegram, open **@BotFather** → send `/newbot` → pick a name (e.g. *Squishy Party Requests*) and a username ending in `bot`.
2. BotFather replies with a **token** like `123456789:AA...`. Treat it like a password.
3. Open your new bot, press **Start** and send it any message (a bot can only message people who have started it).
4. Get your chat ID:
   ```bash
   TELEGRAM_BOT_TOKEN=123456789:AA... npm run chat-id
   ```
   It prints `TELEGRAM_CHAT_ID=...`.
   - **Team alerts:** to send alerts to a group instead, add the bot to the group, send a message there, and run it again. Group IDs start with `-`.

## 2. Deploy on Vercel

1. Put this folder in a **private** GitHub repo and import it in Vercel (Framework preset: **Other**, no build command).
2. Add the variables under **Project → Settings → Environment Variables**:
   - all the variables in the table above.
3. Deploy. Then send yourself a test request from the live site: you should get the code by email, the Telegram message, the confirmation email, and a working PayNow QR.

## 3. Analytics (page views, speed, and where parents drop off)

**Vercel Web Analytics + Speed Insights.** These are already wired in: the page loads `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` on the live site. To switch them on:

1. Open your project in Vercel and go to **Analytics** → **Enable**.
2. Go to **Speed Insights** → **Enable**.
3. Redeploy.

They don't use cookies.

**Funnels and drop-off (PostHog, free tier).**

1. Create a project at posthog.com (choose the EU or US region).
2. Copy the **Project API key** (starts with `phc_`). It's safe to put in the page: it can only send events.
3. At the bottom of `public/index.html`, set:
   ```js
   posthogKey: 'phc_...',
   posthogHost: 'https://us.i.posthog.com',   // or https://eu.i.posthog.com
   ```
   then redeploy.
4. In PostHog, go to **Product analytics** → **New insight** → **Funnel** and add these steps:
   `planner_opened` → `step_viewed` (step = 2) → `step_viewed` (step = 3) → `step_viewed` (step = 4) → `step_viewed` (step = 5) → `request_submitted` → `request_sent`.
   It shows the % who leave at each step.

PostHog runs **without cookies** (`persistence: 'memory'`) with session recording **off**, because parents type personal details. No names, phone numbers, emails or addresses are ever sent as events. To check events on the live site, open the browser console and run `__squishyAnalytics.log`.

| Event | Sent when | Properties |
|---|---|---|
| `planner_opened` | "I want a party" is pressed | none |
| `step_viewed` | a planner step is shown | `step` (1–5), `step_name` |
| `planner_exited` | they leave the planner | `at_step`, `step_name` |
| `home_tab_viewed` | a home tab is opened (How it works, On the day, Safety, FAQ) | `tab` |
| `budget_set` | a budget is entered | `mode` (total / per child) |
| `experience_selected` | Jelly / Crunchy / Duo is chosen | `experience` |
| `wax_toggled` | Wax Cracking is switched | `on`, `experience` |
| `addon_added` / `addon_removed` | an add-on changes | `id`, `category`, `vendor` |
| `suggestions_added` | "Add all suggestions" | `count` |
| `invite_design_selected` / `invitation_saved` / `invitation_shared` / `caption_copied` / `whatsapp_opened` | invitation actions | `design` |
| `request_submitted` / `request_invalid` / `request_sent` / `request_failed` | the request step | `fields`, `experience`, `children`, `wax`, `addons`, `total_sgd`, `reason` |

To also send these as Vercel custom events (on plans that include them), set `vercelCustomEvents: true`.

## 4. "How it works" photos and captions

Under the chosen option (Jelly, Crunchy or Duo) there's a 6-step card carousel. It has Prev/Next buttons, step dots, swipe, and keyboard arrows. Until you add photos, each card shows a labelled placeholder with the file path it expects (e.g. `img/how/jelly-2.jpg`). Put photos in `public/img/how/` using the names in `public/img/README.txt` and they appear automatically. Captions and paths live in `HOW_STEPS` in the page script.

## 5. Changing prices or vendors

- **Where prices live:** prices and vendors live in the script inside `public/index.html` (`var EXP`, `var P`, and the constants).
- **After editing:**
  ```bash
  npm run catalogue   # copies the price list into lib/catalogue.js for the server
  npm test
  ```
- **Why it matters:** the server always uses `lib/catalogue.js`. If you forget to run `npm run catalogue`, your Telegram message shows a ⚠️ line whenever the page total differs from the server total.

## Run it locally

```bash
cp .env.example .env.local   # add your real token + chat ID to test with your own Telegram
npm run dev                  # http://localhost:3000
npm test                     # needs Playwright: npm i -D playwright
```

## What's protected

- **Secrets:** the bot token and chat ID only exist on the server.
- **Server-side pricing and validation:**
  - every request is re-priced on the server from the catalogue;
  - unknown add-ons, past dates, bad phone numbers or postcodes, and missing consent are all rejected.
- **No fake confirmations:** if Telegram is down, the parent is told the request was **not** sent.
- **Spam:**
  - a hidden honeypot field catches bots;
  - each IP is limited to 5 requests per 10 minutes. This limit is best-effort, per server instance; add Vercel Firewall rate limiting if spam ever becomes a problem.
- **Logs:** they only contain the reference number, never names or phone numbers.

## Before going live

- **PDPA:** you're collecting names, phone numbers, emails and addresses. Add a short privacy notice (what you collect, why, how long you keep it, and who to contact), and delete old Telegram messages you no longer need.
- **Partner prices:** the food, styling and activity partners are still sample listings with demo prices, and cakes are "on quote". Replace them with your agreed vendors and rates.
- **Deposits:** the fine print covers the 10% holding deposit (refunded if you can't attend, deducted from the full amount, non-refundable if they cancel). Publish full terms for the rest of the payment.
