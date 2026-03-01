const BotStats = require("../database/botStats");
const CommandStats = require("../database/commandStats");
const UserActivity = require("../database/userActivity");
const Logger = require("./logger");

class StatsTracker {
    constructor(client) {
        this.client = client;
        this.commandCount = 0;
        this.startTime = Date.now();

        // In-memory buffers – flushed to DB in bulk every 30 seconds
        this.commandStatsBatch = [];
        this.activityBatch = [];

        // Start periodic stats collection
        this.startStatsCollection();
    }

    startStatsCollection() {
        // Collect bot-health stats every 5 minutes
        setInterval(
            async () => {
                await this.collectBotStats();
            },
            5 * 60 * 1000,
        );

        // Flush command/activity batches every 30 seconds
        setInterval(async () => {
            await this.flushBatches();
        }, 30 * 1000);

        // Initial collection after 30 seconds
        setTimeout(async () => {
            await this.collectBotStats();
        }, 30000);
    }

    /** Bulk-write buffered command stats and user activity to the database. */
    async flushBatches() {
        try {
            if (this.commandStatsBatch.length > 0) {
                const docs = this.commandStatsBatch.splice(0);
                await CommandStats.insertMany(docs, { ordered: false }).catch((err) =>
                    Logger.error("Error flushing command stats batch:", err),
                );
            }
            if (this.activityBatch.length > 0) {
                const docs = this.activityBatch.splice(0);
                await UserActivity.insertMany(docs, { ordered: false }).catch((err) =>
                    Logger.error("Error flushing activity batch:", err),
                );
            }
        } catch (error) {
            Logger.error("Error in flushBatches:", error);
        }
    }

    async collectBotStats() {
        try {
            if (!this.client.isReady()) return;

            const memUsage = process.memoryUsage();
            const stats = new BotStats({
                guilds: this.client.guilds.cache.size,
                users: this.client.users.cache.size,
                channels: this.client.channels.cache.size,
                commands: this.client.commands.size,
                uptime: Math.floor((Date.now() - this.startTime) / 1000),
                memoryUsage: {
                    used: memUsage.heapUsed,
                    rss: memUsage.rss,
                    heapUsed: memUsage.heapUsed,
                    heapTotal: memUsage.heapTotal,
                    external: memUsage.external,
                },
                ping: this.client.ws.ping,
                commandsExecuted: this.commandCount,
            });

            await stats.save();
        } catch (error) {
            Logger.error("Error collecting bot stats:", error);
        }
    }

    async trackCommand(
        commandName,
        user,
        guild,
        success = true,
        executionTime = 0,
        errorMessage = null,
    ) {
        try {
            this.commandCount++;

            this.commandStatsBatch.push({
                commandName,
                guildId: guild?.id || "DM",
                userId: user.id,
                username: `${user.username}#${user.discriminator}`,
                success,
                executionTime,
                errorMessage,
            });

            // Also track as user activity
            await this.trackUserActivity(
                user,
                guild,
                "command_used",
                commandName,
                success ? `/${commandName}` : `/${commandName} (failed)`,
            );
        } catch (error) {
            Logger.error("Error tracking command stats:", error);
        }
    }

    async trackUserActivity(user, guild, action, commandName = null, details = null) {
        try {
            if (!guild) return; // Skip DM activities for now

            this.activityBatch.push({
                userId: user.id,
                username: user.username,
                discriminator: user.discriminator,
                guildId: guild.id,
                guildName: guild.name,
                action,
                commandName,
                details,
            });
        } catch (error) {
            Logger.error("Error tracking user activity:", error);
        }
    }

    async getRecentStats(hours = 24) {
        try {
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            return await BotStats.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 });
        } catch (error) {
            Logger.error("Error getting recent stats:", error);
            return [];
        }
    }

    async getCommandStats(hours = 24) {
        try {
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);

            const stats = await CommandStats.aggregate([
                { $match: { timestamp: { $gte: since } } },
                {
                    $group: {
                        _id: "$commandName",
                        count: { $sum: 1 },
                        successCount: { $sum: { $cond: ["$success", 1, 0] } },
                        avgExecutionTime: { $avg: "$executionTime" },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]);

            return stats;
        } catch (error) {
            Logger.error("Error getting command stats:", error);
            return [];
        }
    }

    async getUserStats(hours = 24) {
        try {
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);

            const stats = await UserActivity.aggregate([
                { $match: { timestamp: { $gte: since } } },
                {
                    $group: {
                        _id: "$userId",
                        username: { $first: "$username" },
                        discriminator: { $first: "$discriminator" },
                        activityCount: { $sum: 1 },
                        commandsUsed: {
                            $sum: { $cond: [{ $eq: ["$action", "command_used"] }, 1, 0] },
                        },
                    },
                },
                { $sort: { activityCount: -1 } },
                { $limit: 10 },
            ]);

            return stats;
        } catch (error) {
            Logger.error("Error getting user stats:", error);
            return [];
        }
    }

    async getRecentActivity(limit = 50) {
        try {
            return await UserActivity.find().sort({ timestamp: -1 }).limit(limit).lean();
        } catch (error) {
            Logger.error("Error getting recent activity:", error);
            return [];
        }
    }

    async getDailyStats(days = 7) {
        try {
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const stats = await BotStats.aggregate([
                { $match: { timestamp: { $gte: since } } },
                {
                    $group: {
                        _id: {
                            year: { $year: "$timestamp" },
                            month: { $month: "$timestamp" },
                            day: { $dayOfMonth: "$timestamp" },
                        },
                        avgGuilds: { $avg: "$guilds" },
                        avgUsers: { $avg: "$users" },
                        avgPing: { $avg: "$ping" },
                        totalCommands: { $sum: "$commandsExecuted" },
                        maxMemory: { $max: "$memoryUsage.used" },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
            ]);

            return stats;
        } catch (error) {
            Logger.error("Error getting daily stats:", error);
            return [];
        }
    }

    getUptime() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    getCurrentStats() {
        const memUsage = process.memoryUsage();
        return {
            guilds: this.client.guilds.cache.size,
            users: this.client.users.cache.size,
            channels: this.client.channels.cache.size,
            commands: this.client.commands.size,
            uptime: this.getUptime(),
            memoryUsage: memUsage,
            ping: this.client.ws.ping,
            commandsExecuted: this.commandCount,
        };
    }
}

module.exports = StatsTracker;
