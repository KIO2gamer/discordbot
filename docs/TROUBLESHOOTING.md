# 🔧 Troubleshooting Guide

Solutions for common issues with Project Kiyo Discord bot.

## 📑 Quick Navigation

-   [Installation Issues](#installation-issues)
-   [Bot Connection Issues](#bot-connection-issues)
-   [Command Issues](#command-issues)
-   [Database Issues](#database-issues)
-   [API Integration Issues](#api-integration-issues)
-   [Auto-Moderation Issues](#auto-moderation-issues)
-   [Music Issues](#music-issues)
-   [Performance Issues](#performance-issues)
-   [Getting Help](#getting-help)

---

## Installation Issues

### ❌ "Cannot find module" Error

**Error Message:**

```
Error: Cannot find module 'discord.js'
Error: Cannot find module 'mongoose'
```

**Solution:**

```bash
# Reinstall all dependencies
rm package-lock.json
npm install

# Or for clean install
npm ci
```

**Prevention:**

-   Always use `npm ci` in production
-   Don't delete `node_modules` manually
-   Keep package-lock.json in git

---

### ❌ "EACCES: permission denied"

**Error Message:**

```
npm ERR! code EACCES
npm ERR! syscall open
npm ERR! path /usr/local/lib/node_modules/npm/package-lock.json
```

**Solution (Linux/Mac):**

```bash
# Run with sudo
sudo npm install

# Or fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

**Solution (Windows):**

-   Run terminal as Administrator
-   Or reinstall Node.js

---

### ❌ "ENOENT: no such file or directory"

**Error Message:**

```
Error: ENOENT: no such file or directory, open '/path/to/file'
```

**Common Causes:**

-   File was deleted
-   Wrong file path
-   Directory doesn't exist

**Solution:**

```bash
# Verify project structure
ls src/
ls package.json

# Check for missing .env
ls -la .env

# Recreate if missing
cp .env.example .env
```

---

## Bot Connection Issues

### ❌ "DISCORD_TOKEN is not defined"

**Error Message:**

```
Error: Token is not a valid token
Error: DISCORD_TOKEN is not set
```

**Solution:**

```bash
# 1. Check .env file exists
cat .env | grep DISCORD_TOKEN

# 2. Verify token format
# Should be a long string, like: NzkyNDcyNzI1NDk1MDI2Njg4.X-hvzA.Ov4MCQywSkoWQh...

# 3. Reload environment
# Kill the process and restart
npm run dev

# 4. Get new token if needed
# Discord Developer Portal → Bot → Reset Token
```

**Prevention:**

-   Never commit .env to git
-   Add .env to .gitignore
-   Use different tokens for dev/prod

---

### ❌ "Invalid token" or "Unauthorized"

**Error Message:**

```
Error: Invalid token.
Error: Unauthorized
```

**Causes & Solutions:**

1. **Wrong Bot**

    - Make sure DISCORD_TOKEN is from your bot
    - Don't use User token (will be banned)

2. **Token Leaked**

    - If exposed on GitHub, immediately reset in Discord Portal
    - Regenerate token and update .env

3. **Scope Issues**
    - Bot invited without proper scopes
    - Reinvite with correct permissions:
    ```
    https://discord.com/api/oauth2/authorize?client_id=YOUR_ID&permissions=1099511627867&scope=bot%20applications.commands
    ```

---

### ❌ "Cannot access guild"

**Error Message:**

```
Error: Missing Access
Guild not found
```

**Solution:**

```bash
# 1. Verify bot is in server
# Check Discord server member list

# 2. Re-invite bot with proper permissions
# See above invite URL

# 3. Check GUILDID in .env is correct
grep GUILDID .env
```

---

### ❌ Bot goes offline frequently

**Causes:**

-   Database disconnection
-   Memory leak
-   Too many simultaneous requests

**Solutions:**

1. **Check Database:**

    ```bash
    # Test MongoDB connection
    node -e "require('mongoose').connect(process.env.MONGODB_URL).then(()=>console.log('OK'))"
    ```

2. **Enable Debug Logging:**

    ```env
    LOG_LEVEL=DEBUG
    ```

3. **Monitor Memory:**

    ```bash
    # Check memory usage
    node --max-old-space-size=4096 src/index.js
    ```

4. **Use Process Manager (PM2):**
    ```bash
    npm install -g pm2
    pm2 start src/index.js
    pm2 logs
    ```

---

## Command Issues

### ❌ Commands not showing in Discord

**Error:**

```
/help - Command not found
```

**Solutions:**

1. **Wait for Registration** (1-2 minutes)

    - Slash commands register automatically
    - Check bot logs for "Loaded X commands"

2. **Force Refresh:**

    ```bash
    # Stop bot and restart
    npm run dev

    # Wait 2 minutes
    # Try /help again
    ```

3. **Check Permissions:**

    - Bot needs "Manage Slash Commands"
    - Check Discord server settings

4. **Clear Discord Cache:**
    - Press Ctrl+Shift+R in Discord
    - Log out and log back in

---

### ❌ "Missing Permissions" Error

**Error:**

```
Error: Missing Permissions: [SEND_MESSAGES]
Error: Missing Permissions: [MANAGE_ROLES]
```

**Solution:**

```bash
# 1. Check bot permissions in Discord
# Server Settings → Roles → bot-name

# 2. Verify bot role is high enough
# Bot role should be above target user roles

# 3. Check channel permissions
# #channel → Permissions → Ensure bot can send messages

# 4. Reinvite bot with all permissions
# Use correct invite URL with permissions=1099511627867
```

---

### ❌ Command execution fails silently

**No error message, command just doesn't work**

**Solution:**

1. **Check Bot Logs:**

    ```bash
    tail -f logs/bot-*.log
    ```

2. **Enable Debug Logging:**

    ```env
    LOG_LEVEL=DEBUG
    ```

3. **Check Command Code:**
    ```javascript
    // Ensure error handling exists
    try {
        // Command code
    } catch (error) {
        Logger.error("Command Error:", error);
        await interaction.reply("An error occurred");
    }
    ```

---

## Database Issues

### ❌ "MongooseError: Cannot connect to MongoDB"

**Error Message:**

```
MongooseError: Cannot connect to MongoDB instance at 'mongodb://...'
Error: getaddrinfo ENOTFOUND cluster0.mongodb.net
```

**Solutions:**

1. **Check Connection String:**

    ```bash
    # Verify MONGODB_URL format
    grep MONGODB_URL .env

    # Should look like:
    # mongodb+srv://user:password@cluster.mongodb.net/database
    ```

2. **For MongoDB Atlas:**

    - Check IP whitelist (Network Access)
    - Add your IP: `0.0.0.0/0` or specific IP
    - Verify credentials are correct
    - Check special characters are URL-encoded

3. **Test Connection:**

    ```bash
    node -e "
    require('mongoose').connect(process.env.MONGODB_URL)
      .then(()=>console.log('Connected!'))
      .catch(e=>console.error('Error:', e.message))
    "
    ```

4. **For Local MongoDB:**

    ```bash
    # Ensure MongoDB is running
    # Linux: sudo systemctl start mongod
    # Mac: brew services start mongodb-community
    # Windows: net start MongoDB

    # Then try connecting with:
    # MONGODB_URL=mongodb://localhost:27017/kiyo
    ```

---

### ❌ "E11000 duplicate key error"

**Error Message:**

```
MongoServerError: E11000 duplicate key error
```

**Cause:** Field marked as `unique` already exists

**Solution:**

```bash
# 1. Check unique fields
# Review database schema

# 2. Clear duplicates
# Via MongoDB Compass or:
db.collection.deleteMany({})

# 3. Reset database
npm run cleanup  # If available
```

---

### ❌ Database operations timeout

**Error:**

```
Timeout waiting for connection
```

**Solutions:**

1. Increase timeout in connection string: `?serverSelectionTimeoutMS=10000`
2. Check internet connection
3. Check MongoDB server status
4. Reduce number of concurrent operations

---

## API Integration Issues

### ❌ "API key not found" or "Invalid API key"

**Error:**

```
GEMINI_API_KEY not found
Error: 401 Unauthorized - Invalid API Key
```

**Solution:**

1. **Check Environment Variable:**

    ```bash
    grep GEMINI_API_KEY .env
    # Should be set to actual key, not empty
    ```

2. **Verify API Key is Active:**

    - Log into API provider dashboard
    - Regenerate key if expired
    - Check usage limits not exceeded

3. **Restart Bot:**
    ```bash
    npm run dev
    ```

---

### ❌ "YouTube API quota exceeded"

**Error:**

```
Error: YouTube Data API quota exceeded
```

**Causes:**

-   Too many API calls
-   Quota limit too low

**Solutions:**

1. Reduce API call frequency
2. Increase quota in Google Cloud Console
3. Implement caching to reduce calls

---

### ❌ "Weather API not responding"

**Error:**

```
Error: Cannot reach weather service
Error: timeout
```

**Solutions:**

```bash
# 1. Test endpoint manually
curl "https://api.openweathermap.org/data/2.5/weather?..."

# 2. Check API status website

# 3. Verify API key is active

# 4. Check rate limits
```

---

## Auto-Moderation Issues

### ❌ Auto-mod not working

**Nothing happens when rules violated**

**Solutions:**

1. **Check if Enabled:**

    ```
    /automod status
    ```

    Should show enabled = true

2. **Enable Auto-Mod:**

    ```
    /automod enable
    ```

3. **Check Log Channel:**

    ```
    /setlogchannel #moderation-logs
    ```

4. **Verify Configuration:**
    ```
    /automod spam enabled:true
    /automod mentions enabled:true
    ```

---

### ❌ Bot can't delete messages

**Error:**

```
Error: Missing Permissions: [MANAGE_MESSAGES]
```

**Solution:**

-   Give bot "Manage Messages" permission
-   Ensure bot role is high enough
-   Check message isn't from an admin

---

### ❌ False positives (legitimate spam flagged)

**Solution:**

1. **Adjust Thresholds:**

    ```
    /automod spam max_messages:10 time_window:10
    ```

2. **Ignore Safe Channels:**

    ```
    /automod ignorechannel #general
    ```

3. **Ignore Trusted Roles:**
    ```
    /automod ignorerole Trusted
    ```

---

## Music Issues

### ❌ "Could not establish connection to voice channel"

**Error:**

```
Error: Cannot join voice channel
```

**Solutions:**

1. **Bot Permissions:**

    - Ensure bot has "Connect" and "Speak" permissions

2. **Voice Channel Status:**

    - Channel isn't full
    - Channel isn't locked
    - Bot isn't already in another channel

3. **Rejoin:**
    ```
    /leave
    /join
    ```

---

### ❌ "Cannot play song" or "No results found"

**Error:**

```
Error: Could not find song
Error: Search returned no results
```

**Solutions:**

1. **Verify Song Exists:**

    - Try searching on YouTube directly
    - Use exact title

2. **Check API Key:**

    ```bash
    grep YOUTUBE_API_KEY .env
    ```

3. **Try Different Search:**
    ```
    /play artist name - song name
    ```

---

### ❌ Music skips or stops unexpectedly

**Causes:**

-   Connection lost
-   Stream unavailable
-   Timeout

**Solutions:**

1. Check internet connection
2. Use `/leave` and `/join` to reconnect
3. Try different song
4. Restart bot

---

## Performance Issues

### ❌ High CPU usage

**Symptoms:**

```
- Bot responds slowly
- Commands have delays
- Process takes 80%+ CPU
```

**Solutions:**

1. **Check Process:**

    ```bash
    # Linux/Mac
    ps aux | grep node

    # Windows
    tasklist | findstr node
    ```

2. **Monitor Usage:**

    ```bash
    npm run dev:trace
    ```

3. **Optimize:**
    - Reduce database queries
    - Cache frequently accessed data
    - Remove CPU-intensive operations

---

### ❌ High memory usage

**Symptoms:**

```
- RAM usage keeps increasing
- Eventually crashes with OOM
```

**Solutions:**

1. **Increase Memory Limit:**

    ```bash
    node --max-old-space-size=4096 src/index.js
    ```

2. **Find Memory Leak:**

    ```bash
    npm run dev:debug
    # Use Chrome DevTools: chrome://inspect
    ```

3. **Optimize Code:**
    - Don't store large objects in memory
    - Clear intervals/timeouts
    - Limit cache size

---

### ❌ Slow database queries

**Symptoms:**

```
- Commands are slow
- Database operations timeout
```

**Solutions:**

1. **Add Indexes:**

    ```javascript
    schema.index({ userId: 1 });
    ```

2. **Check Query Performance:**

    ```bash
    # In MongoDB Compass: check indexes
    ```

3. **Optimize Queries:**
    - Only select needed fields: `.select('-largeField')`
    - Limit results: `.limit(100)`
    - Cache results

---

## Getting Help

### Step 1: Gather Information

Collect before asking for help:

```bash
# Bot version
cat package.json | grep version

# Node version
node --version

# npm version
npm --version

# Recent logs
tail -20 logs/bot-*.log

# Environment setup (without secrets!)
cat .env | grep -v SECRET | grep -v KEY | grep -v TOKEN
```

### Step 2: Check Resources

1. Read relevant documentation:

    - [Installation & Setup](INSTALLATION_AND_SETUP.md)
    - [Codebase Overview](CODEBASE_OVERVIEW.md)
    - [Commands Reference](COMMANDS_REFERENCE.md)

2. Search GitHub issues for similar problems

3. Check Discord.js documentation

### Step 3: Report Issue

When posting issue, include:

```markdown
## Environment

-   Node: 18.x.x
-   Discord.js: 14.x.x
-   OS: Windows/Linux/Mac

## Error Message
```

[Full error message here]

```

## Steps to Reproduce
1. Did X
2. Then Y happened

## Expected Behavior
Should have done Z

## Actual Behavior
Did W instead

## Logs
```

[Last 20 lines of logs]

```

```

### Step 4: Ask Community

-   Open GitHub Discussion
-   Join Discord server
-   Comment on related issue

---

## Quick Fixes (Try First)

Most issues solved by:

```bash
# 1. Restart bot
npm run dev

# 2. Clear cache
npm cache clean --force

# 3. Reinstall deps
rm -rf node_modules package-lock.json
npm install

# 4. Check environment
cat .env | head

# 5. Check logs
tail -50 logs/bot-*.log
```

---

## Common Command Errors

| Error                 | Cause           | Fix                      |
| --------------------- | --------------- | ------------------------ |
| `Command not found`   | Not registered  | Restart bot, wait 2 min  |
| `Missing Permissions` | Bot lacks perms | Add to role, reinvite    |
| `Interaction failed`  | Timed out       | Try again                |
| `Invalid input`       | Wrong format    | Check `/help command`    |
| `Unknown error`       | Bug             | Check logs, report issue |

---

## Support Resources

-   **Documentation:** [docs/](docs/)
-   **Issues:** GitHub Issues
-   **Discord:** Join server
-   **Email:** Contact maintainer

---

**Last Updated:** December 20, 2025  
**Version:** 1.2.0
