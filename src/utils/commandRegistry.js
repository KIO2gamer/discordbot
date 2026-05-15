/**
 * CommandRegistry
 * Centralized registry for managing commands, categories, and metadata
 */
class CommandRegistry {
    constructor() {
        this.commands = new Map();
        this.categories = new Map();
        this.subCategories = new Map();
        this.aliases = new Map();
        this.commandStats = new Map();
    }

    /**
     * Register a command in the registry
     * @param {Object} command - The command object
     * @param {string} category - Main category name
     * @param {string} subCategory - Optional subcategory name
     */
    register(command, category, subCategory = null) {
        const commandName = command.data.name;

        // Register main command
        this.commands.set(commandName, command);

        // Register category
        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }
        this.categories.get(category).push(commandName);

        // Register subcategory if provided
        if (subCategory) {
            const key = `${category}:${subCategory}`;
            if (!this.subCategories.has(key)) {
                this.subCategories.set(key, []);
            }
            this.subCategories.get(key).push(commandName);
            command.subCategory = subCategory;
        }

        // Register aliases
        if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach((alias) => {
                this.aliases.set(alias, commandName);
            });
        }

        // Initialize command stats
        this.commandStats.set(commandName, {
            executionCount: 0,
            errorCount: 0,
            totalExecutionTime: 0,
            lastExecuted: null,
        });

        command.category = category;
        return this;
    }

    /**
     * Get a command by name or alias
     * @param {string} nameOrAlias - Command name or alias
     * @returns {Object|null} The command object or null
     */
    get(nameOrAlias) {
        const actualName = this.aliases.get(nameOrAlias) || nameOrAlias;
        return this.commands.get(actualName) || null;
    }

    /**
     * Get all commands in a category
     * @param {string} category - Category name
     * @returns {Array} Array of command names
     */
    getCommandsByCategory(category) {
        return this.categories.get(category) || [];
    }

    /**
     * Get all commands in a subcategory
     * @param {string} category - Category name
     * @param {string} subCategory - Subcategory name
     * @returns {Array} Array of command names
     */
    getCommandsBySubcategory(category, subCategory) {
        const key = `${category}:${subCategory}`;
        return this.subCategories.get(key) || [];
    }

    /**
     * Get all categories
     * @returns {Array} Array of category names
     */
    getCategories() {
        return Array.from(this.categories.keys());
    }

    /**
     * Get all subcategories for a category
     * @param {string} category - Category name
     * @returns {Array} Array of subcategory names
     */
    getSubcategories(category) {
        const subcats = [];
        for (const [key] of this.subCategories) {
            if (key.startsWith(`${category}:`)) {
                subcats.push(key.split(":")[1]);
            }
        }
        return [...new Set(subcats)];
    }

    /**
     * Check if a command exists
     * @param {string} nameOrAlias - Command name or alias
     * @returns {boolean}
     */
    has(nameOrAlias) {
        return this.commands.has(nameOrAlias) || this.aliases.has(nameOrAlias);
    }

    /**
     * Get all commands (returns Iterator)
     * @returns {Iterator}
     */
    forEach(callback) {
        return this.commands.forEach(callback);
    }

    /**
     * Get command count
     * @returns {number}
     */
    get size() {
        return this.commands.size;
    }

    /**
     * Get all commands as array
     * @returns {Array}
     */
    toArray() {
        return Array.from(this.commands.values());
    }

    /**
     * Get all commands as JSON for slash command deployment
     * @returns {Array}
     */
    toJSON() {
        return this.toArray()
            .filter((cmd) => cmd?.data?.toJSON)
            .map((cmd) => cmd.data.toJSON());
    }

    /**
     * Record command execution
     * @param {string} commandName - Command name
     * @param {number} executionTime - Time in ms
     * @param {boolean} success - Whether execution was successful
     */
    recordExecution(commandName, executionTime, success = true) {
        if (!this.commandStats.has(commandName)) {
            return;
        }

        const stats = this.commandStats.get(commandName);
        stats.executionCount++;
        stats.totalExecutionTime += executionTime;
        stats.lastExecuted = new Date();

        if (!success) {
            stats.errorCount++;
        }
    }

    /**
     * Get command statistics
     * @param {string} commandName - Command name
     * @returns {Object|null} Statistics object or null
     */
    getStats(commandName) {
        if (!this.commandStats.has(commandName)) {
            return null;
        }

        const stats = this.commandStats.get(commandName);
        return {
            ...stats,
            averageExecutionTime:
                stats.executionCount > 0 ? stats.totalExecutionTime / stats.executionCount : 0,
            successRate:
                stats.executionCount > 0
                    ? ((stats.executionCount - stats.errorCount) / stats.executionCount) * 100
                    : 0,
        };
    }

    /**
     * Get all statistics
     * @returns {Object}
     */
    getAllStats() {
        const allStats = {};
        for (const [cmd, stats] of this.commandStats) {
            allStats[cmd] = {
                ...stats,
                averageExecutionTime:
                    stats.executionCount > 0 ? stats.totalExecutionTime / stats.executionCount : 0,
                successRate:
                    stats.executionCount > 0
                        ? ((stats.executionCount - stats.errorCount) / stats.executionCount) * 100
                        : 0,
            };
        }
        return allStats;
    }

    /**
     * Get most used commands
     * @param {number} limit - How many commands to return
     * @returns {Array} Array of command names sorted by usage
     */
    getMostUsedCommands(limit = 10) {
        return Array.from(this.commandStats.entries())
            .sort((a, b) => b[1].executionCount - a[1].executionCount)
            .slice(0, limit)
            .map(([name]) => name);
    }

    /**
     * Get slowest commands
     * @param {number} limit - How many commands to return
     * @returns {Array} Array of command names sorted by average execution time
     */
    getSlowestCommands(limit = 10) {
        return Array.from(this.commandStats.entries())
            .filter(([, stats]) => stats.executionCount > 0)
            .sort((a, b) => {
                const avgA = a[1].totalExecutionTime / a[1].executionCount;
                const avgB = b[1].totalExecutionTime / b[1].executionCount;
                return avgB - avgA;
            })
            .slice(0, limit)
            .map(([name]) => name);
    }

    /**
     * Get commands with highest error rates
     * @param {number} limit - How many commands to return
     * @returns {Array} Array of command names sorted by error rate
     */
    getProblematicCommands(limit = 10) {
        return Array.from(this.commandStats.entries())
            .filter(([, stats]) => stats.executionCount > 0)
            .sort((a, b) => {
                const rateA = a[1].errorCount / a[1].executionCount;
                const rateB = b[1].errorCount / b[1].executionCount;
                return rateB - rateA;
            })
            .slice(0, limit)
            .map(([name]) => name);
    }

    /**
     * Reset all statistics
     */
    resetStats() {
        for (const stats of this.commandStats.values()) {
            stats.executionCount = 0;
            stats.errorCount = 0;
            stats.totalExecutionTime = 0;
            stats.lastExecuted = null;
        }
    }
}

module.exports = CommandRegistry;
