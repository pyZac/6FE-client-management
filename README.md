# 6FE Client Management Bot (Telegram)

A production Telegram bot to **manage group membership based on subscription status**.  
It checks each member’s `telegram_id` against a MySQL `payment` table and **removes expired users** or **re-adds renewed users** via invite links.

---

## Features
- Auto-remove users whose `ExpDate` has passed or `status` != `active`.
- Auto-restore access after renewal (via the bot).
- Works with multiple groups (per package/language if needed).
- Cron-like loop using long polling; safe concurrency.
- Minimal DB footprint (read-only is enough for the core logic).

---

## Database schema (expected)
Your table (default: `payment`) must include at least:
```
id (PK, int/bigint)
telegram_id (varchar/bigint)
status (enum or varchar)     -- 'active' / 'inactive'
ExpDate (date/datetime)      -- ISO date is fine
updated_at (datetime)        -- optional
```
> الأعمدة قابلة للتعديل عبر متغيرات `.env`:
> `DB_TABLE, DB_COL_TELEGRAM, DB_COL_STATUS, DB_COL_EXP`.

---

## .env
Copy `.env.example` to `.env` and fill secrets.

```
BOT_TOKEN=123456:ABCDEF
DB_HOST=127.0.0.1
DB_USER=...
DB_PASS=...
DB_NAME=...
DB_TABLE=payment
DB_COL_TELEGRAM=telegram_id
DB_COL_STATUS=status
DB_COL_EXP=ExpDate
POLL_INTERVAL_MS=60000
LANG=ar
```

---

## Run locally
```bash
npm install
node bot.js
```

## Deploy with PM2
```bash
pm2 start ecosystem.config.js
# or
pm2 start bot.js --name 6fe-subscription-bot
pm2 logs 6fe-subscription-bot
```

---

## Files
- `bot.js` — bot’s main loop (checks DB, prunes/joins users).
- `fetch.js` — DB helpers/queries and Telegram group actions.
- `ecosystem.config.js` — PM2 process file (optional but recommended).

---

## Notes
- Avoid committing `node_modules` or any `.env`.  
- Grant DB user **read-only** if possible.  
- If you manage multiple groups, store their IDs + invite links in DB or a JSON map.

---

## License
MIT
