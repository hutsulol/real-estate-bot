# real-estate-bot

## Run Telegram bot

Use one of these commands from the project root:

```bash
node telegram-bot.js
# or
npm run bot:telegram
# or
npm run start:bot
```

## If you see `Cannot find module ... telegram-bot.js`

1. Make sure you are in the same folder as `telegram-bot.js`:
   ```bash
   pwd
   # Windows PowerShell:
   Get-Location
   ```
2. Check the file exists:
   ```bash
   ls telegram-bot.js
   # Windows PowerShell:
   dir telegram-bot.js
   ```
3. If the file is missing, pull/copy the latest project files into that folder.
4. Install dependencies before first run:
   ```bash
   npm install
   ```

> Tip: your pasted command included `\\n` text. Run only a single clean command like `node telegram-bot.js`.
