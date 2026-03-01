# Auto-Moderation System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Discord Server                              │
│  (Messages, Member Joins, User Actions)                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Discord.js Client                             │
│                    (Event Listeners)                                │
└───────────────┬──────────────────────┬──────────────────────────────┘
                │                      │
                ▼                      ▼
    ┌───────────────────┐  ┌──────────────────────┐
    │ MessageCreate     │  │ GuildMemberAdd       │
    │ Event             │  │ Event                │
    └─────────┬─────────┘  └──────────┬───────────┘
              │                       │
              ▼                       ▼
┌─────────────────────────┐  ┌──────────────────────┐
│ auto_moderation.js      │  │ member_join_         │
│                         │  │ antiraid.js          │
│ • Check spam            │  │                      │
│ • Check mentions        │  │ • Track joins        │
│ • Check links           │  │ • Detect raids       │
│ • Check invites         │  │ • Take action        │
│ • Check bad words       │  │                      │
│ • Check caps            │  └──────────┬───────────┘
│ • Check emoji spam      │             │
└──────────┬──────────────┘             │
           │                            │
           │  ┌─────────────────────────┘
           │  │
           ▼  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     MongoDB Database                                │
│                  (autoModConfig Collection)                         │
│                                                                     │
│  {                                                                  │
│    guildId: "...",                                                  │
│    enabled: true,                                                   │
│    spamDetection: { ... },                                          │
│    massMention: { ... },                                            │
│    linkFilter: { ... },                                             │
│    inviteFilter: { ... },                                           │
│    wordFilter: { ... },                                             │
│    capsFilter: { ... },                                             │
│    emojiSpam: { ... },                                              │
│    antiRaid: { ... },                                               │
│    ignoredChannels: [...],                                          │
│    ignoredRoles: [...]                                              │
│  }                                                                  │
└─────────────┬────────────────────────────────────┬──────────────────┘
              │                                    │
              │ Read Config                        │ Update Config
              │                                    │
              ▼                                    ▼
┌─────────────────────────┐          ┌────────────────────────────┐
│  Check & Take Action    │          │  /automod Command          │
│                         │          │                            │
│  • Warn                 │          │  • enable/disable          │
│  • Delete Message       │          │  • setlog                  │
│  • Timeout              │          │  • spam                    │
│  • Kick                 │          │  • mentions                │
│  • Ban                  │          │  • invites                 │
└───────────┬─────────────┘          │  • links                   │
            │                        │  • badwords                │
            │                        │  • caps                    │
            │                        │  • emojis                  │
            │                        │  • antiraid                │
            │                        │  • ignore/unignore         │
            │                        │  • status                  │
            ▼                        └────────────────────────────┘
┌─────────────────────────┐
│   Log Channel           │
│                         │
│  Auto-Mod Log           │
│  ├─ User: @user         │
│  ├─ Action: TIMEOUT     │
│  ├─ Reason: Spam        │
│  ├─ Details: 6 msgs/5s  │
│  └─ Message: ...        │
└─────────────────────────┘
```

## Component Interaction

### 1. Message Flow

```
User sends message
    ↓
Discord → Bot receives MessageCreate event
    ↓
auto_moderation.js event handler
    ↓
Fetch config from MongoDB
    ↓
Run all enabled checks in sequence:
    • Spam detection
    • Mass mentions
    • Links
    • Invites
    • Bad words
    • Caps
    • Emoji spam
    ↓
If violation detected → Take action
    ↓
Log to mod channel
```

### 2. Member Join Flow

```
User joins server
    ↓
Discord → Bot receives GuildMemberAdd event
    ↓
member_join_antiraid.js event handler
    ↓
Track join in memory
    ↓
Check recent joins within time window
    ↓
If threshold exceeded → Kick/Ban
    ↓
Log to mod channel
```

### 3. Configuration Flow

```
Admin runs /automod command
    ↓
automod.js slash command handler
    ↓
Fetch or create config from MongoDB
    ↓
Update settings based on subcommand
    ↓
Save to MongoDB
    ↓
Send confirmation embed to user
```

## Memory Management

```
┌────────────────────────────────┐
│  In-Memory Message Cache       │
│                                │
│  Map<userId, MessageHistory[]> │
│                                │
│  MessageHistory {              │
│    content: string             │
│    timestamp: number           │
│    guildId: string             │
│    channelId: string           │
│    messageId: string           │
│  }                             │
└────────────┬───────────────────┘
             │
             │ Cleanup every 60s
             │ (removes entries older than 60s)
             ▼
┌────────────────────────────────┐
│  Optimized Cache               │
│  (Only recent messages kept)   │
└────────────────────────────────┘
```

## Permission Flow

```
Message received
    ↓
Check: Is bot? → YES → Ignore
    ↓ NO
Check: Is DM? → YES → Ignore
    ↓ NO
Check: Auto-mod enabled? → NO → Ignore
    ↓ YES
Check: Channel ignored? → YES → Ignore
    ↓ NO
Check: Role ignored? → YES → Ignore
    ↓ NO
Check: Is Administrator? → YES → Ignore
    ↓ NO
Proceed with auto-mod checks
```

## Data Flow Diagram

```
┌──────────────┐
│   Discord    │
│   Message    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│  Event Handler               │
│  • Parse message             │
│  • Extract mentions          │
│  • Check URLs                │
│  • Count emojis              │
│  • Analyze caps              │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Config Lookup (MongoDB)     │
│  • Fetch guild settings      │
│  • Get thresholds            │
│  • Get ignore lists          │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Decision Engine             │
│  • Compare against limits    │
│  • Check whitelist/blacklist │
│  • Determine violation       │
└──────┬───────────────────────┘
       │
       ├─ No violation → Continue
       │
       └─ Violation detected
              │
              ▼
       ┌──────────────────────────┐
       │  Action Handler          │
       │  • Warn user             │
       │  • Delete message        │
       │  • Timeout/Kick/Ban      │
       └──────┬───────────────────┘
              │
              ▼
       ┌──────────────────────────┐
       │  Logger                  │
       │  • Send to log channel   │
       │  • Include details       │
       │  • Timestamp action      │
       └──────────────────────────┘
```

## Configuration Structure

```javascript
AutoModConfig {
  // Core
  guildId: String
  enabled: Boolean
  logChannelId: String

  // Features
  spamDetection: {
    enabled: Boolean
    maxMessages: Number
    timeWindow: Number (ms)
    maxDuplicates: Number
    action: Enum
    timeoutDuration: Number (ms)
    deleteMessages: Boolean
  }

  massMention: {
    enabled: Boolean
    maxMentions: Number
    action: Enum
    timeoutDuration: Number (ms)
    deleteMessages: Boolean
  }

  linkFilter: {
    enabled: Boolean
    whitelist: [String]
    action: Enum
    deleteMessages: Boolean
  }

  inviteFilter: {
    enabled: Boolean
    action: Enum
    deleteMessages: Boolean
  }

  wordFilter: {
    enabled: Boolean
    words: [String]
    action: Enum
    deleteMessages: Boolean
  }

  capsFilter: {
    enabled: Boolean
    percentage: Number
    minLength: Number
    action: Enum
    deleteMessages: Boolean
  }

  emojiSpam: {
    enabled: Boolean
    maxEmojis: Number
    action: Enum
    deleteMessages: Boolean
  }

  antiRaid: {
    enabled: Boolean
    joinThreshold: Number
    timeWindow: Number (ms)
    action: Enum
  }

  // Bypass
  ignoredChannels: [String]
  ignoredRoles: [String]
}
```

## Command Architecture

```
/automod
├── enable                    [Toggle on]
├── disable                   [Toggle off]
├── setlog                    [Set log channel]
│   └── channel (required)
├── spam                      [Configure spam detection]
│   ├── enabled (required)
│   ├── max_messages
│   ├── time_window
│   └── action
├── mentions                  [Configure mass mentions]
│   ├── enabled (required)
│   ├── max_mentions
│   └── action
├── invites                   [Configure invite filter]
│   ├── enabled (required)
│   └── action
├── links                     [Configure link filter]
│   ├── enabled (required)
│   └── whitelist
├── badwords                  [Configure word filter]
│   ├── enabled (required)
│   └── words
├── caps                      [Configure caps filter]
│   ├── enabled (required)
│   └── percentage
├── emojis                    [Configure emoji spam]
│   ├── enabled (required)
│   └── max_emojis
├── antiraid                  [Configure anti-raid]
│   ├── enabled (required)
│   ├── join_threshold
│   └── time_window
├── ignore                    [Add to ignore list]
│   ├── channel
│   └── role
├── unignore                  [Remove from ignore list]
│   ├── channel
│   └── role
└── status                    [View configuration]
```

## Performance Characteristics

### Time Complexity

-   Message check: O(1) - Direct config lookup
-   Spam detection: O(n) where n = recent messages (max 20)
-   Anti-raid: O(m) where m = recent joins (max 50)

### Space Complexity

-   Per user: ~200 bytes (5 messages × 40 bytes each)
-   Per guild: ~10KB (50 users × 200 bytes)
-   Config: ~2KB per guild

### Scalability

-   Handles 1000s of messages per second
-   Memory auto-cleanup prevents leaks
-   Database queries are optimized
-   Event-driven architecture
