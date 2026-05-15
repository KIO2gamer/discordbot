# Command System Design Documentation

## Overview

The command system has been upgraded to support 100+ commands efficiently with built-in monitoring, caching, and advanced middleware. This guide explains the new architecture and how to use it.

## New Components

### 1. CommandRegistry (`src/utils/commandRegistry.js`)

Centralized registry for managing all commands with advanced features.

**Key Features:**

-   Register commands with categories and subcategories
-   Support for command aliases
-   Real-time execution statistics
-   Performance analytics

**Usage:**

```javascript
// Already initialized in client.commandRegistry
const command = client.commandRegistry.get("commandName");
const commands = client.commandRegistry.getCommandsByCategory("Moderation");
const stats = client.commandRegistry.getAllStats();
```

**API Reference:**

```javascript
// Registration
commandRegistry.register(command, category, subCategory);

// Retrieval
commandRegistry.get(nameOrAlias);
commandRegistry.getCommandsByCategory(category);
commandRegistry.getCommandsBySubcategory(category, subCategory);
commandRegistry.getCategories();
commandRegistry.getSubcategories(category);
commandRegistry.has(nameOrAlias);

// Statistics
commandRegistry.recordExecution(commandName, executionTime, success);
commandRegistry.getStats(commandName);
commandRegistry.getAllStats();
commandRegistry.getMostUsedCommands(limit);
commandRegistry.getSlowestCommands(limit);
commandRegistry.getProblematicCommands(limit);

// Utility
commandRegistry.toArray();
commandRegistry.toJSON();
commandRegistry.size;
```

### 2. CommandExecutor (`src/utils/commandExecutor.js`)

Middleware for executing commands with permission checks, cooldown handling, and error management.

**Key Features:**

-   Permission validation
-   Cooldown management
-   Bot permission checks
-   Automatic error handling
-   Execution statistics tracking

**Usage:**

```javascript
// In interaction_create event (already implemented)
const success = await CommandExecutor.execute(interaction, command, client);

// Manual execution
await CommandExecutor.execute(interaction, command, client);

// Cooldown management
CommandExecutor.cleanupCooldowns(client);
```

**Execution Pipeline:**

1. Check if command is enabled
2. Verify user permissions
3. Verify bot permissions
4. Check cooldown
5. Execute command
6. Record statistics
7. Handle errors

### 3. CommandMonitor (`src/utils/commandMonitor.js`)

Real-time monitoring and analytics for command usage and performance.

**Key Features:**

-   Usage statistics
-   Performance metrics
-   Error tracking
-   Health reports
-   Detailed analytics

**Usage:**

```javascript
// Get comprehensive statistics
const stats = client.commandMonitor.getStats();

// Get specific reports
const mostUsed = client.commandMonitor.getMostUsedCommands(10);
const slowest = client.commandMonitor.getSlowestCommands(5);
const problematic = client.commandMonitor.getProblematicCommands(5);

// Get formatted report
const report = client.commandMonitor.getDetailedReport();
console.log(report);

// Log summary
client.commandMonitor.logSummary();
```

**Statistics Output:**

```javascript
{
    totalCommands: 87,
    categories: {
        count: 10,
        breakdown: {
            "Moderation": 15,
            "Utility": 12,
            "Music": 20,
            ...
        }
    },
    usage: {
        mostUsed: [...],
        leastUsed: [...],
        neverUsed: [...]
    },
    performance: {
        slowest: [...],
        fastest: [...],
        averageExecutionTime: 125.5
    },
    reliability: {
        problematic: [...],
        overallErrorRate: 2.3
    }
}
```

### 4. CommandCache (`src/utils/commandCache.js`)

In-memory caching system for command lookups and metadata.

**Key Features:**

-   TTL-based cache expiration
-   Automatic cleanup
-   Batch operations
-   Cache statistics

**Usage:**

```javascript
// Already initialized with 5-minute TTL
const cache = client.commandCache;

// Get/set values
cache.set("key", value);
const value = cache.get("key");

// Batch operations
cache.mset({ key1: value1, key2: value2 });
const values = cache.mget(["key1", "key2"]);

// Cache management
cache.cleanup();
cache.clear();
const stats = cache.getStats();
const size = cache.size();
```

### 5. CommandMetadata (`src/database/commandMetadata.js`)

MongoDB schema for persistent command statistics.

**Features:**

-   Execution tracking
-   Error rate monitoring
-   Performance metrics
-   Command configuration

**Usage:**

```javascript
const CommandMetadata = require("./database/commandMetadata");

// Record execution
await CommandMetadata.findOneAndUpdate(
    { commandName: "ping" },
    { $inc: { executionCount: 1 } },
    { upsert: true },
);

// Get health report
const report = await CommandMetadata.getHealthReport();

// Get problematic commands
const problematic = await CommandMetadata.getProblematicCommands(10);

// Reset statistics
await CommandMetadata.resetStatistics();
```

## File Organization

### Recommended Structure for 100+ Commands

```
src/commands/
├── Admin_And_Configuration/
│   ├── server-settings/
│   │   ├── prefix.js
│   │   ├── language.js
│   │   └── timezone.js
│   ├── user-management/
│   │   ├── mute.js
│   │   ├── ban.js
│   │   └── warn.js
│   └── _category.json
├── Moderation/
│   ├── message-management/
│   │   ├── delete.js
│   │   ├── purge.js
│   │   └── lock.js
│   ├── user-management/
│   │   ├── timeout.js
│   │   ├── kick.js
│   │   └── role-update.js
│   └── _category.json
├── Music/
│   ├── playback/
│   │   ├── play.js
│   │   ├── pause.js
│   │   ├── resume.js
│   │   └── stop.js
│   ├── queue/
│   │   ├── queue.js
│   │   ├── skip.js
│   │   ├── remove.js
│   │   └── shuffle.js
│   └── _category.json
└── [... other categories ...]
```

## Creating New Commands

### Basic Command Template

```javascript
const { SlashCommandBuilder } = require("discord.js");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("command-name")
        .setDescription("What this command does")
        .setDMPermission(false),

    cooldown: 5,
    category: "Category",

    async execute(interaction) {
        try {
            await interaction.reply("Success!");
        } catch (error) {
            await handleError(interaction, error, "COMMAND_EXECUTION");
        }
    },
};
```

### Advanced Command Template

See `COMMAND_TEMPLATE.js` for a complete template with all available options.

## System Features

### Automatic Cleanup

The system automatically cleans up expired resources:

```javascript
// Cooldown cleanup (every 5 minutes)
setInterval(
    () => {
        CommandExecutor.cleanupCooldowns(client);
    },
    5 * 60 * 1000,
);

// Cache cleanup (every 10 minutes)
setInterval(
    () => {
        client.commandCache.cleanup();
    },
    10 * 60 * 1000,
);
```

### Permission System

Commands can require different levels of permissions:

```javascript
module.exports = {
    // User must have Discord permissions
    userPermissions: ["MANAGE_MESSAGES", "BAN_MEMBERS"],

    // Bot must have Discord permissions
    botPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],

    async execute(interaction) {
        // CommandExecutor validates these automatically
    },
};
```

### Cooldown Management

Cooldowns are handled automatically:

```javascript
module.exports = {
    cooldown: 10, // 10 seconds between uses per user

    async execute(interaction) {
        // User is automatically rate-limited
    },
};
```

### Execution Tracking

All command executions are tracked:

```javascript
// Get execution history
const stats = client.commandRegistry.getStats("command-name");
// {
//     executionCount: 1234,
//     errorCount: 12,
//     totalExecutionTime: 156789,
//     lastExecuted: Date,
//     averageExecutionTime: 127.23,
//     successRate: 99.03
// }
```

## Monitoring and Analytics

### Health Dashboard

```javascript
// Get complete health overview
const stats = client.commandMonitor.getStats();
console.log(stats);

// Log formatted report
client.commandMonitor.logSummary();

// Get detailed report
const report = client.commandMonitor.getDetailedReport();
```

### Performance Metrics

```javascript
// Most used commands
const mostUsed = client.commandMonitor.getMostUsedCommands(10);
// [{name: "help", executions: 5234, ...}, ...]

// Slowest commands
const slowest = client.commandMonitor.getSlowestCommands(5);
// [{name: "generate", avgTime: "2345.67ms", ...}, ...]

// Problematic commands
const problematic = client.commandMonitor.getProblematicCommands(5);
// [{name: "deprecated", errorRate: "8.5%", ...}, ...]
```

### Never-Used Commands

```javascript
const neverUsed = client.commandMonitor.getStats().usage.neverUsed;
// Useful for identifying commands to deprecate
```

## Performance Optimization

### 1. Lazy Loading

For heavy commands, load dependencies on-demand:

```javascript
module.exports = {
    async execute(interaction) {
        const { HeavyLibrary } = await import("./heavy-lib");
        // Use HeavyLibrary...
    },
};
```

### 2. Caching

Use the built-in cache for frequently accessed data:

```javascript
const cached = client.commandCache.get("cache-key");
if (!cached) {
    const data = await expensiveOperation();
    client.commandCache.set("cache-key", data);
}
```

### 3. Deferred Replies

For operations longer than 3 seconds:

```javascript
async execute(interaction) {
    await interaction.deferReply();
    // Long operation...
    await interaction.editReply("Done!");
}
```

## Best Practices

### 1. Always Use Error Handling

```javascript
try {
    await interaction.reply("Success!");
} catch (error) {
    await handleError(interaction, error, "COMMAND_EXECUTION");
}
```

### 2. Set Appropriate Cooldowns

```javascript
module.exports = {
    cooldown: 5, // Standard: 5s
    // cooldown: 30,    // Rate limited: 30s
    // cooldown: 0,     // No cooldown (use rarely)
};
```

### 3. Validate Permissions Early

```javascript
module.exports = {
    userPermissions: ["MANAGE_MESSAGES"],
    botPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
};
```

### 4. Provide Clear Command Categories

```javascript
// Good
category: "Moderation";
subCategory: "user-management";

// Avoid
category: "other";
```

### 5. Disable Instead of Delete

```javascript
module.exports = {
    enabled: false, // Disables without deleting
    // Instead of deleting the file
};
```

## Troubleshooting

### Commands Not Loading

```javascript
// Check the registry
console.log(client.commandRegistry.size); // Should match your command count
console.log(client.commandRegistry.getCategories());
```

### Permission Denied Messages

```javascript
// Check bot permissions
const botMember = interaction.guild.members.me;
console.log(botMember.permissions.has(["SEND_MESSAGES"]));

// Check command definition
console.log(command.botPermissions);
console.log(command.userPermissions);
```

### Cooldown Issues

```javascript
// Check cooldown cooldowns
console.log(client.cooldowns.size);
CommandExecutor.cleanupCooldowns(client);
```

### Performance Bottlenecks

```javascript
// Identify slow commands
const slowest = client.commandMonitor.getSlowestCommands(10);
console.log(slowest);

// Identify problematic commands
const problematic = client.commandMonitor.getProblematicCommands(10);
console.log(problematic);
```

## API Reference

### client.commandRegistry

```javascript
.register(command, category, subCategory?)
.get(nameOrAlias)
.getCommandsByCategory(category)
.getCommandsBySubcategory(category, subCategory)
.getCategories()
.getSubcategories(category)
.has(nameOrAlias)
.toArray()
.toJSON()
.forEach(callback)
.size
.recordExecution(commandName, executionTime, success)
.getStats(commandName)
.getAllStats()
.getMostUsedCommands(limit)
.getSlowestCommands(limit)
.getProblematicCommands(limit)
.resetStats()
```

### client.commandMonitor

```javascript
.getStats()
.getMostUsedCommands(limit)
.getLeastUsedCommands(limit)
.getNeverUsedCommands()
.getSlowestCommands(limit)
.getFastestCommands(limit)
.getProblematicCommands(limit)
.getAverageExecutionTime()
.getOverallErrorRate()
.getSessionDuration()
.logSummary()
.getDetailedReport()
```

### CommandExecutor

```javascript
CommandExecutor.execute(interaction, command, client);
CommandExecutor.checkPermissions(interaction, command, client);
CommandExecutor.checkBotPermissions(interaction, command);
CommandExecutor.checkCooldown(interaction, command, client);
CommandExecutor.cleanupCooldowns(client);
```

## Migration Guide

If you're updating an existing bot:

1. **Backup your code**
2. **Install new utilities** - Already done
3. **Update index.js** - Already done
4. **Update interaction_create.js** - Already done
5. **Test thoroughly** - Run your bot and verify commands work
6. **Monitor performance** - Check `client.commandMonitor.logSummary()`

## Support and Questions

For issues or questions about the new system design, refer to:

-   `COMMAND_TEMPLATE.js` - Complete command template with examples
-   `src/utils/commandRegistry.js` - Detailed registry documentation
-   `src/utils/commandExecutor.js` - Middleware documentation
-   `src/utils/commandMonitor.js` - Monitoring documentation

---

**Version:** 1.0.0  
**Last Updated:** May 2026  
**Discord.js Version:** 14.19+
