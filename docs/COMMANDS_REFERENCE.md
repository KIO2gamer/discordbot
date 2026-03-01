# 🎯 Commands Reference Guide

Quick reference for all 100 Project Kiyo Discord bot commands organized by category.

## 📑 Table of Contents

-   [Admin & Configuration (20)](#admin--configuration-20)
-   [API Integrations (8)](#api-integrations-8)
-   [Fun & Entertainment (11)](#fun--entertainment-11)
-   [Information & Search (12)](#information--search-12)
-   [Levels & Experience (4)](#levels--experience-4)
-   [Moderation (19)](#moderation-19)
-   [Music (10)](#music-10)
-   [Role Management (5)](#role-management-5)
-   [Support & Tickets (6)](#support--tickets-6)
-   [Utility (5)](#utility-5)

---

## Admin & Configuration (20)

Administrator commands for server setup and management.

| Command                 | Description                                   | Permission    |
| ----------------------- | --------------------------------------------- | ------------- |
| `/clear_db`             | Clear all database records (use with caution) | Administrator |
| `/clear_history`        | Clear chat history                            | Administrator |
| `/custom add`           | Add custom command                            | Administrator |
| `/custom delete`        | Delete custom command                         | Administrator |
| `/custom edit`          | Edit existing custom command                  | Administrator |
| `/custom list`          | List all custom commands                      | Administrator |
| `/custom preview`       | Preview custom command                        | Administrator |
| `/custom run`           | Execute custom command                        | Administrator |
| `/delete_channel`       | Delete a channel                              | Administrator |
| `/embed`                | Create rich embed message                     | Administrator |
| `/fetch_embed_data`     | Fetch and reuse embed data                    | Administrator |
| `/image_headers`        | Manage channel headers with images            | Administrator |
| `/modifychannel`        | Modify channel settings                       | Administrator |
| `/new_channel`          | Create new channel                            | Administrator |
| `/reload`               | Reload all commands                           | Administrator |
| `/set_ai_chat_channel`  | Set channel for AI chatbot                    | Administrator |
| `/set_cmd_perms`        | Set command permissions                       | Administrator |
| `/setlogchannel`        | Set moderation log channel                    | Administrator |
| `/set_msg_logs_channel` | Set message logs channel                      | Administrator |
| `/welcomesettings`      | Configure welcome messages                    | Administrator |

---

## API Integrations (8)

Commands using external APIs and services.

| Command             | Description                                | Permission    |
| ------------------- | ------------------------------------------ | ------------- |
| `/ask`              | Ask Google Generative AI (Gemini)          | @everyone     |
| `/google`           | Search Google                              | @everyone     |
| `/photo`            | Search and display photos                  | @everyone     |
| `/test_yt_setup`    | Verify YouTube API setup                   | Administrator |
| `/weather`          | Get weather information                    | @everyone     |
| `/get_yt_sub_role`  | Get role based on YouTube subscriber count | @everyone     |
| `/youtube search`   | Search YouTube videos                      | @everyone     |

---

## Fun & Entertainment (11)

Games and entertainment commands.

| Command             | Description                  | Permission |
| ------------------- | ---------------------------- | ---------- |
| `/8ball`            | Magic 8-ball fortune telling | @everyone  |
| `/coin_flip`        | Flip a coin                  | @everyone  |
| `/fun`              | List fun commands            | @everyone  |
| `/guess_the_number` | Guess number game            | @everyone  |
| `/hangman`          | Hangman word game            | @everyone  |
| `/lyricwhiz`        | Song lyrics guessing game    | @everyone  |
| `/meme`             | Get random meme              | @everyone  |
| `/roll`             | Roll dice (1d6 or custom)    | @everyone  |
| `/rpsls`          | Rock-Paper-Scissors game     | @everyone  |
| `/trivia`           | Answer trivia questions      | @everyone  |
| `/unscramble`       | Unscramble word game         | @everyone  |

---

## Information & Search (12)

Look up information about users, servers, and bot.

| Command          | Description                       | Permission |
| ---------------- | --------------------------------- | ---------- |
| `/avatar`        | Display user or server avatar     | @everyone  |
| `/bot_info`      | Show bot information              | @everyone  |
| `/channel_info`  | Get channel details               | @everyone  |
| `/credits`       | Show bot credits                  | @everyone  |
| `/emoji_info`    | Get emoji information             | @everyone  |
| `/game_info`     | Get game information              | @everyone  |
| `/help`          | Show all commands or command help | @everyone  |
| `/minecraft`     | Display Minecraft skin            | @everyone  |
| `/reaction_stats`| Show reaction statistics          | @everyone  |
| `/rule`          | Display server rules              | @everyone  |
| `/server`        | Show server information           | @everyone  |
| `/user_info`     | Display user information          | @everyone  |

---

## Levels & Experience (4)

XP and leveling system commands.

| Command          | Description             | Permission    |
| ---------------- | ----------------------- | ------------- |
| `/leaderboard`   | Show XP leaderboard     | @everyone     |
| `/level`         | Check your XP and level | @everyone     |
| `/levelsettings` | Manage XP               | Administrator |

---

## Moderation (19)

Server moderation and management commands.

| Command             | Description                | Permission    |
| ------------------- | -------------------------- | ------------- |
| `/automod disable`  | Disable auto-moderation    | Administrator |
| `/automod enable`   | Enable auto-moderation     | Administrator |
| `/automod invites`  | Configure invite filtering | Administrator |
| `/automod mentions` | Configure mention limits   | Administrator |
| `/automod setlog`   | Set moderation log channel | Administrator |
| `/automod spam`     | Configure spam detection   | Administrator |
| `/automod status`   | Show moderation status     | Administrator |
| `/ban`              | Ban user from server       | Moderator     |
| `/channel`         | Manage channels            | Moderator     |
| `/kick`             | Kick user from server      | Moderator     |
| `/lockchannel`      | Lock channel (read-only)   | Moderator     |
| `/mute`             | Mute user in voice         | Moderator     |
| `/purge`            | Delete messages in bulk    | Moderator     |
| `/slowmode`         | Set channel slowmode       | Moderator     |
| `/timeout`          | Timeout user temporarily   | Moderator     |
| `/unlockchannel`    | Unlock channel             | Moderator     |
| `/unmute`           | Unmute user in voice       | Moderator     |
| `/warn`             | Warn user                  | Moderator     |
| `/warnings`         | View user warnings         | Moderator     |

---

## Music (10)

Music playback and control commands.

| Command   | Description           | Permission |
| --------- | --------------------- | ---------- |
| `/join`   | Join voice channel    | @everyone  |
| `/leave`  | Leave voice channel   | @everyone  |
| `/np`     | Show now playing song | @everyone  |
| `/pause`  | Pause music           | @everyone  |
| `/play`   | Play song/playlist    | @everyone  |
| `/queue`  | Show music queue      | @everyone  |
| `/resume` | Resume paused music   | @everyone  |
| `/skip`   | Skip current song     | @everyone  |
| `/stop`   | Stop music playback   | @everyone  |
| `/volume` | Adjust volume (0-100) | @everyone  |

---

## Role Management (5)

Commands for role automation and management.

| Command       | Description                 | Permission    |
| ------------- | --------------------------- | ------------- |
| `/addrole`    | Add role to user            | Moderator     |
| `/autorole`   | Configure auto-role on join | Administrator |
| `/removerole` | Remove role from user       | Moderator     |
| `/roleinfo`   | Get role information        | @everyone     |
| `/roles`      | List server roles           | @everyone     |

---

## Support & Tickets (6)

Support ticket system for community help.

| Command           | Description             | Permission    |
| ----------------- | ----------------------- | ------------- |
| `/close`          | Close support ticket    | Administrator |
| `/closeall`       | Close all tickets       | Administrator |
| `/ticket`         | Create support ticket   | @everyone     |
| `/ticketcategory` | Set ticket category     | Administrator |
| `/ticketconfig`   | Configure ticket system | Administrator |
| `/ticketstatus`   | Check ticket status     | @everyone     |

---

## Utility (5)

General utility and helper commands.

| Command     | Description               | Permission |
| ----------- | ------------------------- | ---------- |
| `/calc`     | Calculate math expression | @everyone  |
| `/define`   | Get word definition       | @everyone  |
| `/ping`     | Check bot latency         | @everyone  |
| `/poll`     | Create poll               | @everyone  |
| `/reminder` | Set reminder              | @everyone  |

---

## Permission Levels

| Level             | Description               |
| ----------------- | ------------------------- |
| **@everyone**     | All members can use       |
| **Verified**      | Email-verified members    |
| **Moderator**     | Users with Moderator role |
| **Administrator** | Server admin only         |

## Command Tips

### Getting Help

```
/help                      # Show all commands
/help command_name         # Help for specific command
```

### Discovering Commands

```
/help admin_and_configuration
/help music
/help moderation
```

### Command Syntax

-   `<required>` - Must provide
-   `[optional]` - Can skip
-   `|` - Choose one

Example: `/ban <user> [reason]`

---

## Common Command Workflows

### Moderation Setup

1. `/automod enable` - Enable auto-moderation
2. `/setlogchannel #mod-logs` - Set log channel
3. `/automod spam enabled:true` - Enable spam detection
4. `/automod mentions enabled:true` - Enable mention limits

### Music Setup

1. `/join` - Bot joins voice channel
2. `/play song_name` - Start playing
3. `/queue` - Check upcoming songs
4. `/np` - See current song

### Support Tickets Setup

1. `/ticketconfig` - Configure system
2. `/ticketcategory category_name` - Set category
3. `/ticket` - User creates ticket
4. `/close` - Admin closes ticket

### Custom Commands

1. `/customadd` - Create custom command
2. `/customlist` - See all custom commands
3. `/customrun command_name` - Execute it

---

## Aliases & Shortcuts

Some commands have shortcuts:

| Full          | Shortcut  | Equivalent      |
| ------------- | --------- | --------------- |
| `/userinfo`   | `/user`   | User details    |
| `/serverinfo` | `/server` | Server details  |
| `/botinfo`    | `/bot`    | Bot information |
| `/nowplaying` | `/np`     | Current song    |

---

## Troubleshooting

### Command not showing?

-   Bot requires `applications.commands` scope
-   Commands auto-register on startup (wait 1-2 minutes)
-   Check bot has "Manage Slash Commands" permission

### Permission denied?

-   Check your role permissions
-   Verify bot has required permissions
-   Some commands require Administrator role

### Command failed?

-   Check log channel for errors
-   Verify API keys configured
-   Check database connection

---

## Feedback & Suggestions

Have suggestions for new commands or improvements?

-   Open GitHub issue
-   Join support server
-   Contact developer

---

**Last Updated:** December 20, 2025  
**Total Commands:** 100  
**Categories:** 10

See [CODEBASE_OVERVIEW.md](CODEBASE_OVERVIEW.md) for detailed architecture information.
