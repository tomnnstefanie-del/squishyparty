// Finds your Telegram chat ID after you've messaged your new bot.
// Usage: TELEGRAM_BOT_TOKEN=123:abc node dev/get-chat-id.mjs
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error('Set TELEGRAM_BOT_TOKEN first.'); process.exit(1); }
const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const j = await r.json();
if (!j.ok) { console.error('Telegram said:', j.description); process.exit(1); }
const chats = new Map();
for (const u of j.result) { const c = (u.message || u.channel_post || u.my_chat_member)?.chat; if (c) chats.set(c.id, c.title || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username); }
if (!chats.size) console.log('No messages yet. Open your bot in Telegram, press Start or send "hi", then run this again.');
for (const [id, name] of chats) console.log(`TELEGRAM_CHAT_ID=${id}   (${name})`);
