# 📖 Codebase Overview

A comprehensive guide to understanding the Project Kiyo Discord bot architecture and components.

## 🎯 Project Summary

**Project Kiyo** is a feature-rich, multipurpose Discord bot built with `discord.js` v14, featuring:

-   **100 commands** organized into 10 categories
-   **17 MongoDB database schemas** for persistent storage
-   **14 event handlers** for Discord interactions
-   **16 utility modules** for shared functionality
-   **Advanced auto-moderation system** with 9 detection types
-   **YouTube OAuth2 integration** with enhanced security
-   **Music playback system** with queue management
-   **AI chatbot** powered by Google Generative AI
-   **Support ticket system** for community management

## 🏗️ Architecture Overview

### Command Structure (100 commands)

```
commands/ (100 total)
├── Admin_And_Configuration/      (20) - Server setup and configuration
├── API_Integrations/            (8)  - External service integrations
├── Fun_And_Entertainment/        (11) - Games and entertainment
├── Information_And_Search/       (12) - User/server info and search
├── Levels_And_Experience/        (4)  - XP and leveling system
├── Moderation/                  (19) - Moderation and management
├── Music/                       (10) - Music playback control
├── Role_Management/             (5)  - Role automation
├── Support_And_Tickets/         (6)  - Ticket management
└── Utility/                     (5)  - Helper utilities
```

### Database Layer (17 schemas)

**Core Schemas:**

-   `GuildSettingsSchema.js` - Guild/server configuration
-   `commandPermissions.js` - Command permission management
-   `commandStats.js` - Command usage statistics
-   `customCommands.js` - User-defined custom commands
-   `botStats.js` - Bot performance metrics
-   `moderationLogs.js` - Moderation action history
-   `msgLogsConfig.js` - Message logging configuration
-   `userActivity.js` - User activity tracking
-   `xp_data.js` - XP and leveling data

**Feature Schemas:**

-   `AIChatChannel.js` - AI chatbot channel configuration
-   `ChatHistory.js` - AI chat conversation history
-   `autoModConfig.js` - Auto-moderation settings
-   `reminderStorage.js` - Reminder data
-   `roleStorage.js` - Role automation data
-   `ticketConfig.js` - Support ticket configuration
-   `tempOAuth2Storage.js` - Temporary OAuth2 tokens
-   `ytSubRoleConfig.js` - YouTube subscriber role settings

### Event Handlers (14 handlers)

**Core Events:**

-   `ready.js` - Bot initialization and startup
-   `guild_create.js` - Guild/server creation
-   `interaction_create.js` - Slash command handling
-   `member_join_antiraid.js` - Anti-raid on member join

**Logging Events:**

-   `msg_delete_logs.js` - Deleted message logging
-   `msg_update_logs.js` - Edited message logging

**Feature Events:**

-   `ai_chatbot.js` - AI conversation handling
-   `auto_moderation.js` - Auto-moderation execution
-   `award_xp.js` - XP award system
-   `reminder_check.js` - Reminder notifications
-   `ticket_button_interaction.js` - Ticket UI handling
-   `voice_xp.js` - Voice activity XP
-   `welcomer.js` - Server welcome messages
-   `what_is_TKOD.js` - Custom welcome response

### Utilities (16 modules)

**String & Format:**

-   `stringUtils.js` - String manipulation helpers
-   `permissionFormatter.js` - Format Discord permissions
-   `formatUptime.js` - Format bot uptime display
-   `renderLatex.js` - LaTeX rendering for math

**Command Support:**

-   `commandUtils.js` - Command execution helpers
-   `channelTypes.js` - Discord channel type mapping
-   `validationUtils.js` - Input validation

**Bot Features:**

-   `logger.js` - Universal logging system
-   `errorHandler.js` - Error handling and reporting
-   `moderationEmbeds.js` - Auto-mod embed generation
-   `statsTracker.js` - Usage statistics tracking
-   `statusRotator.js` - Bot status rotation
-   `presenceManager.js` - Bot presence/activity management

**External Services:**

-   `oauth2Handler.js` - YouTube OAuth2 authentication
-   `slowBufferCompat.js` - Buffer compatibility layer

## 🔌 Feature Architecture

### YouTube Subscriber Roles Feature

**Location:** `src/features/youtube-subscriber-roles/`

**Components:**

```
youtube-subscriber-roles/
├── commands/
│   ├── ytSubRole.js              - User command: Get YouTube role
│   ├── ytSubRoleConfig.js        - Admin command: Configure tiers
│   └── testYTSetup.js            - Diagnostic command
├── database/
│   ├── ytSubRoleConfig.js        - Tier configuration schema
│   └── tempOAuth2Storage.js      - OAuth2 token storage
├── utils/
│   └── oauth2Handler.js          - OAuth2 server implementation
└── index.js                      - Feature metadata
```

**Flow:**

1. User runs `/get_yt_sub_role`
2. Redirected to YouTube OAuth2 authorization
3. Token validated and subscriber count checked
4. Discord roles assigned based on tier configuration

**Security Features:**

-   Guild-scoped HMAC-signed state tokens
-   15-minute token expiration
-   User/state cross-validation
-   Prevents replay and cross-guild attacks

## 🎯 Key Systems

### Auto-Moderation System

**9 Detection Types:**

1. **Spam Detection** - Message frequency analysis
2. **Mass Mentions** - Mention count limits
3. **Link Filtering** - URL pattern detection
4. **Discord Invites** - Invite link removal
5. **Bad Word Filter** - Word blacklist
6. **Caps Lock** - ALL CAPS detection
7. **Emoji Spam** - Emoji frequency limits
8. **Anti-Raid** - Join pattern analysis
9. **Ignore Lists** - Channel/role exclusions

**Features:**

-   Configurable per-guild
-   Multiple action types (delete, timeout, warn)
-   Detailed audit logs
-   Bypass for admins/trusted roles

See [Auto-Moderation System](AUTO_MODERATION.md) for detailed documentation.

### Music System

**Capabilities:**

-   Play audio from YouTube, Spotify, SoundCloud
-   Queue management (add, remove, clear, shuffle)
-   Playback control (play, pause, resume, stop, skip)
-   Volume adjustment and repeat modes
-   Now Playing embeds with progress bars
-   Playlist support

### Leveling System

**Components:**

-   **Message XP:** +1-3 XP per message (cooldown: 5 seconds)
-   **Voice XP:** +1 XP per minute of voice activity
-   **Leaderboards:** Server-wide and user statistics
-   **Customizable:** Admin commands for tier configuration

### AI Chatbot

**Configuration:**

-   **Model:** Google Generative AI
-   **Temperature:** 0.7 (balanced randomness)
-   **Top K:** 40 (controlled diversity)
-   **Max Tokens:** 500 (concise responses)
-   **Channel-scoped:** Enable per channel

**Features:**

-   Conversation context awareness
-   Chat history storage
-   Error recovery
-   Rate limiting

See [LOGGING_SYSTEM.md](LOGGING_SYSTEM.md) for logging details.

## 📊 Data Flow

### Command Execution Flow

```
User slash command
    ↓
interaction_create event
    ↓
Command handler validation
    ↓
Permission check
    ↓
Command execution
    ↓
Database operations (if needed)
    ↓
Response/embed generation
    ↓
Interaction reply
```

### Auto-Moderation Flow

```
Message received
    ↓
Check if enabled for guild
    ↓
Check ignore lists
    ↓
Run detection checks
    ↓
If violated:
  ├── Delete message
  ├── Timeout user (if configured)
  ├── Send to log channel
  └── Track statistics
```

### Feature Metadata Pattern

Each feature exports a standardized metadata structure:

```javascript
module.exports = {
    commands: {
        // Feature-specific commands
    },
    database: {
        // Feature-specific schemas
    },
    utils: {
        // Feature-specific utilities
    },
    meta: {
        name: "Feature Name",
        version: "1.0.0",
        description: "Feature description",
        author: "Contributor name",
        dependencies: ["dependency1", "dependency2"],
    },
};
```

## 🔐 Security Features

### Authentication

-   Discord OAuth2 with authorization code flow
-   Guild-scoped, HMAC-signed state tokens
-   15-minute token expiration
-   User and state cross-validation

### Authorization

-   Command permission levels (admin, moderator, user)
-   Guild-specific role restrictions
-   Bot permission checks before actions
-   Rate limiting on API calls

### Data Protection

-   Password-hashed OAuth2 state tokens
-   Temporary token storage with TTL
-   No persistent sensitive data
-   MongoDB connection validation

## 🚀 Performance Optimizations

### Memory Management

-   Event handler cleanup
-   Cache optimization for frequently accessed data
-   Connection pooling for database
-   Garbage collection tuning

### Execution Speed

-   Asynchronous operations throughout
-   Promise-based error handling
-   Lazy loading of heavy modules
-   Command batching for bulk operations

### Database

-   Indexed queries on common fields
-   Bulk operations for mass updates
-   Connection pooling
-   Query optimization

## 📝 Code Organization Principles

### Feature-Based Organization

-   Related files grouped by feature
-   Self-contained feature directories
-   Clear dependency boundaries
-   Easier feature removal/addition

### Single Responsibility

-   Each module handles one concern
-   Clear import/export boundaries
-   Testable components
-   Maintainable codebase

### Configuration Over Code

-   Environment variable-driven setup
-   Guild-specific configurations
-   Feature toggles
-   Scalable design

## 🧪 Testing Strategy

### Areas Covered

-   Command execution validation
-   Permission checking
-   Database schema validation
-   OAuth2 flow verification
-   Auto-moderation detection

### Running Tests

```bash
npm test
```

## 📦 Deployment

### Production Deployment

1. Set environment variables
2. Install dependencies: `npm ci`
3. Run bot: `npm start`
4. Monitor logs and errors

### Development Workflow

```bash
npm run dev              # Auto-reload on changes
npm run dev:debug       # Debug mode with inspector
npm run lint            # Fix ESLint issues
npm run format          # Format with Prettier
```

### OAuth2 Deployment

-   Netlify deployment in `deployments/netlify-oauth/`
-   Serverless function: `.netlify/functions/callback.js`
-   Configuration in `netlify.toml`

## 🔗 Related Documentation

-   [Project Structure](PROJECT_STRUCTURE.md) - File organization guide
-   [Auto-Moderation](AUTO_MODERATION.md) - Moderation system details
-   [Logging System](LOGGING_SYSTEM.md) - Logging configuration
-   [YouTube Subscriber Roles](youtube-subscriber-roles/YOUTUBE_SUBSCRIBER_ROLES_SETUP.md) - Feature setup

## 📊 Statistics

| Category             | Count   |
| -------------------- | ------- |
| **Total Commands**   | 100     |
| **Database Schemas** | 17      |
| **Event Handlers**   | 14      |
| **Utility Modules**  | 16      |
| **API Integrations** | 5       |
| **Detection Types**  | 9       |
| **npm Dependencies** | 25+     |
| **Node.js Version**  | 18.0.0+ |

---

**Last Updated:** December 20, 2025  
**Version:** 1.2.0  
**Maintainer:** Project Kiyo Team
