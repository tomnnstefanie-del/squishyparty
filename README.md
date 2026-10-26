# Squishy Party: party planner, email check and Telegram alerts

How a request works:

1. **The customer plans the party** (number of participants, Squishy DIY, add-ons) and, on the last step, verifies their email with a 6-digit code (free, sent from your Gmail).
2. **They press Send my request.** The server re-prices the order and sends you a Telegram message with everything: contact details (email marked ✅ verified), date and time, address and exact location, number of participants, the Squishy Party lines, add-ons, total and notes. A **WhatsApp the customer** button opens a chat with a greeting typed.
3. **The customer gets an email:** "Your request is currently being verified by our team, and we'll reach out to you on WhatsApp", with their details and "Nothing to pay now".
4. You confirm availability on WhatsApp and send one quotation. Nothing is paid on the website. Company bookings get a quotation and invoice.

**Companies:** the home page "For companies" section has three reasons to book, a rate card (read from the same price list as the planner) and a **Plan your company event** button. It opens the same planner with "A company" already chosen in the Request step, so companies verify their email and get the confirmation email like everyone else.

```
src/                   EDIT HERE: markup.html, styles.css, app.js, base*.html, img/
dev/build.mjs          npm run build -> public/index.html (never edit that file by hand)
public/index.html      the whole website (one file, generated)
api/request.js         sends the request (Vercel serverless function)
api/otp.js             emails and checks the 6-digit code
lib/pricing.js         server-side prices (browser totals are never trusted)
lib/catalogue.js       price list, generated from public/index.html
lib/validate.js        checks every field before anything is sent
lib/telegram.js        builds and sends the Telegram message
lib/otp.js             signed codes and tokens (no database needed)
lib/mail.js, emails.js sends the code and confirmation emails
dev/                   local server, mock Telegram, chat-ID helper
tests/                 npm test (unit + full browser end-to-end)
```

## Making changes

1. Edit files in `src/` (and `public/img/` for photos).
2. Run `npm run check`: build, price catalogue, unit + end-to-end tests, browser click-through.
3. Push to a branch, check Vercel's preview link, then merge to `main` to go live.

See `CLAUDE.md` for the full rules.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | What it is | Needed for |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather | Requests |
| `TELEGRAM_CHAT_ID` | Your group's chat ID (starts with `-`) | Requests |
| `SMTP_USER` | The Gmail address that sends emails, e.g. `squishyparty.sg@gmail.com` | Email codes + confirmation |
| `SMTP_PASS` | A Gmail **app password** (16 letters, not your normal password) | Email codes + confirmation |
| `MAIL_FROM` *(optional)* | Sender shown to parents, e.g. `Squishy Party <squishyparty.sg@gmail.com>` | |
| `MAIL_REPLY_TO` *(optional)* | Where parents' replies go, if not the sending Gmail | |
| `SMTP_HOST`, `SMTP_PORT` *(optional)* | Only if you don't use Gmail (defaults `smtp.gmail.com`, `465`) | |

After adding or changing variables, go to **Deployments → ⋯ → Redeploy**.

- **Without the Telegram or email variables,** the site refuses requests with "Requests are not switched on yet". It never pretends a request was sent.
- `PAYNOW_UEN`, `PAYNOW_MOBILE` and `PAYNOW_NAME` are no longer used (there's no online deposit). You can delete them from Vercel.

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
3. Deploy. Then send yourself a test request from the live site: you should get the code by email, the Telegram message and the confirmation email.

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
   `planner_opened` → `step_viewed` (step = 2) → `step_viewed` (step = 3) → `step_viewed` (step = 4, Request) → `request_submitted` → `request_sent`.
   It shows the % who leave at each step.

PostHog runs **without cookies** (`persistence: 'memory'`) with session recording **off**, because parents type personal details. No names, phone numbers, emails or addresses are ever sent as events. To check events on the live site, open the browser console and run `__squishyAnalytics.log`.

| Event | Sent when | Properties |
|---|---|---|
| `planner_opened` | "I want a party" is pressed | none |
| `step_viewed` | a planner step is shown | `step` (1–4; 5 = the "Get ready" page), `step_name` |
| `planner_exited` | they leave the planner | `at_step`, `step_name` |
| `home_tab_viewed` | a home tab is opened (How it works, On the day, Safety, FAQ) | `tab` |
| `experience_selected` | Jelly / Crunchy / Duo is chosen | `experience` |
| `wax_toggled` | Wax Cracking is switched | `on`, `experience` |
| `addon_added` / `addon_removed` | an add-on changes | `id`, `category`, `vendor` |
| `company_planner_opened` | "Plan your company event" is pressed | none |
| `invite_design_selected` / `invitation_saved` / `invitation_shared` / `caption_copied` / `whatsapp_opened` | invitation actions | `design` |
| `request_submitted` / `request_invalid` / `request_sent` / `request_failed` | the request step | `fields`, `experience`, `participants`, `wax`, `addons`, `total_sgd`, `reason` |

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
- **Payment terms:** nothing is paid on the website. Put your payment and cancellation terms in the quotation you send.
