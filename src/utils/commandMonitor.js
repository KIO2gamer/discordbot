/**
 * CommandMonitor
 * Monitoring and analytics for command usage and performance
 */
const Logger = require("./logger");

class CommandMonitor {
    constructor(registry) {
        this.registry = registry;
        this.sessionStart = Date.now();
    }

    /**
     * Get comprehensive command statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            totalCommands: this.registry.size,
            categories: {
                count: this.registry.getCategories().length,
                breakdown: this.getCategoryBreakdown(),
            },
            usage: {
                mostUsed: this.getMostUsedCommands(10),
                leastUsed: this.getLeastUsedCommands(10),
                neverUsed: this.getNeverUsedCommands(),
            },
            performance: {
                slowest: this.getSlowestCommands(5),
                fastest: this.getFastestCommands(5),
                averageExecutionTime: this.getAverageExecutionTime(),
            },
            reliability: {
                problematic: this.getProblematicCommands(5),
                overallErrorRate: this.getOverallErrorRate(),
            },
            uptime: {
                sessionDuration: this.getSessionDuration(),
                startTime: new Date(this.sessionStart),
            },
        };
    }

    /**
     * Get command count by category
     * @returns {Object}
     */
    getCategoryBreakdown() {
        const breakdown = {};
        for (const category of this.registry.getCategories()) {
            breakdown[category] = this.registry.getCommandsByCategory(category).length;
        }
        return breakdown;
    }

    /**
     * Get most used commands
     * @param {number} limit - How many to return
     * @returns {Array}
     */
    getMostUsedCommands(limit = 10) {
        const stats = this.registry.getAllStats();
        return Object.entries(stats)
            .sort((a, b) => b[1].executionCount - a[1].executionCount)
            .slice(0, limit)
            .map(([name, stat]) => ({
                name,
                executions: stat.executionCount,
                errors: stat.errorCount,
                successRate: stat.successRate.toFixed(2) + "%",
                avgTime: stat.averageExecutionTime.toFixed(2) + "ms",
            }));
    }

    /**
     * Get least used commands
     * @param {number} limit - How many to return
     * @returns {Array}
     */
    getLeastUsedCommands(limit = 10) {
        const stats = this.registry.getAllStats();
        return Object.entries(stats)
            .filter(([, stat]) => stat.executionCount > 0)
            .sort((a, b) => a[1].executionCount - b[1].executionCount)
            .slice(0, limit)
            .map(([name, stat]) => ({
                name,
                executions: stat.executionCount,
            }));
    }

    /**
     * Get never-used commands
     * @returns {Array}
     */
    getNeverUsedCommands() {
        const stats = this.registry.getAllStats();
        return Object.entries(stats)
            .filter(([, stat]) => stat.executionCount === 0)
            .map(([name]) => name);
    }

    /**
     * Get slowest commands
     * @param {number} limit - How many to return
     * @returns {Array}
     */
    getSlowestCommands(limit = 5) {
        const stats = this.registry.getAllStats();
        return Object.entries(stats)
            .filter(([, stat]) => stat.executionCount > 0)
            .sort((a, b) => {
                const avgA = a[1].averageExecutionTime;
                const avgB = b[1].averageExecutionTime;
                return avgB - avgA;
            })
            .slice(0, limit)
            .map(([name, stat]) => ({
                name,
                avgTime: stat.averageExecutionTime.toFixed(2) + "ms",
                totalTime: stat.totalExecutionTime.toFixed(2) + "ms",
                executions: stat.executionCount,
            }));
    }

    /**
     * Get fastest commands
     * @param {number} limit - How many to return
     * @returns {Array}
     */
    getFastestCommands(limit = 5) {
        const stats = this.registry.getAllStats();
        return Object.entries(stats)
            .filter(([, stat]) => stat.executionCount > 0)
            .sort((a, b) => a[1].averageExecutionTime - b[1].averageExecutionTime)
            .slice(0, limit)
            .map(([name, stat]) => ({
                name,
                avgTime: stat.averageExecutionTime.toFixed(2) + "ms",
                executions: stat.executionCount,
            }));
    }

    /**
     * Get commands with highest error rates
     * @param {number} limit - How many to return
     * @returns {Array}
     */
    getProblematicCommands(limit = 5) {
        const stats = this.registry.getAllStats();
        return Object.entries(stats)
            .filter(([, stat]) => stat.executionCount > 0)
            .sort((a, b) => {
                const rateA = a[1].errorCount / a[1].executionCount;
                const rateB = b[1].errorCount / b[1].executionCount;
                return rateB - rateA;
            })
            .slice(0, limit)
            .map(([name, stat]) => ({
                name,
                errors: stat.errorCount,
                executions: stat.executionCount,
                errorRate: ((stat.errorCount / stat.executionCount) * 100).toFixed(2) + "%",
            }));
    }

    /**
     * Get average execution time across all commands
     * @returns {number}
     */
    getAverageExecutionTime() {
        const stats = this.registry.getAllStats();
        const allTimes = Object.values(stats).filter((s) => s.executionCount > 0);

        if (allTimes.length === 0) return 0;

        const totalTime = allTimes.reduce((sum, stat) => sum + stat.totalExecutionTime, 0);
        const totalExecutions = allTimes.reduce((sum, stat) => sum + stat.executionCount, 0);

        return totalTime / totalExecutions;
    }

    /**
     * Get overall error rate
     * @returns {number}
     */
    getOverallErrorRate() {
        const stats = this.registry.getAllStats();
        const allStats = Object.values(stats);

        const totalExecutions = allStats.reduce((sum, s) => sum + s.executionCount, 0);
        const totalErrors = allStats.reduce((sum, s) => sum + s.errorCount, 0);

        if (totalExecutions === 0) return 0;
        return (totalErrors / totalExecutions) * 100;
    }

    /**
     * Get session duration in seconds
     * @returns {number}
     */
    getSessionDuration() {
        return Math.floor((Date.now() - this.sessionStart) / 1000);
    }

    /**
     * Log summary to console
     */
    logSummary() {
        const stats = this.getStats();
        Logger.log("MONITOR", "=== Command Monitor Summary ===");
        Logger.log("MONITOR", `Total Commands: ${stats.totalCommands}`);
        Logger.log("MONITOR", `Categories: ${stats.categories.count}`);
        Logger.log("MONITOR", `Session Duration: ${stats.uptime.sessionDuration}s`);
        Logger.log(
            "MONITOR",
            `Average Execution Time: ${stats.performance.averageExecutionTime.toFixed(2)}ms`,
        );
        Logger.log(
            "MONITOR",
            `Overall Error Rate: ${stats.reliability.overallErrorRate.toFixed(2)}%`,
        );

        if (stats.usage.mostUsed.length > 0) {
            Logger.log("MONITOR", `Most Used: ${stats.usage.mostUsed[0].name}`);
        }
        if (stats.usage.neverUsed.length > 0) {
            Logger.log(
                "MONITOR",
                `Never Used Commands: ${stats.usage.neverUsed.length} (${(
                    (stats.usage.neverUsed.length / stats.totalCommands) *
                    100
                ).toFixed(1)}%)`,
            );
        }
    }

    /**
     * Get a detailed report as string
     * @returns {string}
     */
    getDetailedReport() {
        const stats = this.getStats();
        let report = "📊 **COMMAND MONITORING REPORT**\n";
        report += "================================\n\n";

        report += `**📈 Overview**\n`;
        report += `Total Commands: ${stats.totalCommands}\n`;
        report += `Categories: ${stats.categories.count}\n`;
        report += `Session Duration: ${this.formatDuration(stats.uptime.sessionDuration)}\n\n`;

        report += `**⚡ Performance**\n`;
        report += `Average Execution Time: ${stats.performance.averageExecutionTime.toFixed(2)}ms\n`;
        report += `Overall Error Rate: ${stats.reliability.overallErrorRate.toFixed(2)}%\n\n`;

        if (stats.usage.mostUsed.length > 0) {
            report += `**🔥 Most Used Commands**\n`;
            stats.usage.mostUsed.slice(0, 5).forEach((cmd, i) => {
                report += `${i + 1}. ${cmd.name} - ${cmd.executions} executions (${cmd.successRate})\n`;
            });
            report += "\n";
        }

        if (stats.performance.slowest.length > 0) {
            report += `**🐢 Slowest Commands**\n`;
            stats.performance.slowest.forEach((cmd, i) => {
                report += `${i + 1}. ${cmd.name} - ${cmd.avgTime}\n`;
            });
            report += "\n";
        }

        if (stats.reliability.problematic.length > 0) {
            report += `**⚠️ Problematic Commands**\n`;
            stats.reliability.problematic.forEach((cmd, i) => {
                report += `${i + 1}. ${cmd.name} - Error Rate: ${cmd.errorRate}\n`;
            });
            report += "\n";
        }

        if (stats.usage.neverUsed.length > 0) {
            report += `**❓ Never Used (${stats.usage.neverUsed.length})**\n`;
            report += stats.usage.neverUsed.slice(0, 10).join(", ") + "\n";
        }

        return report;
    }

    /**
     * Format duration in seconds to readable format
     * @param {number} seconds
     * @returns {string}
     */
    formatDuration(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0) parts.push(`${secs}s`);

        return parts.join(" ");
    }
}

module.exports = CommandMonitor;
