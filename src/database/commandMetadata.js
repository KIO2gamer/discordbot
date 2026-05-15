const mongoose = require("mongoose");

/**
 * Command Metadata Schema
 * Stores execution statistics and metadata for commands
 */
const commandMetaSchema = new mongoose.Schema(
    {
        commandName: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        category: {
            type: String,
            required: true,
            lowercase: true,
        },
        subCategory: {
            type: String,
            lowercase: true,
            default: null,
        },
        description: {
            type: String,
            default: "",
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        executionCount: {
            type: Number,
            default: 0,
        },
        successCount: {
            type: Number,
            default: 0,
        },
        errorCount: {
            type: Number,
            default: 0,
        },
        totalExecutionTime: {
            type: Number,
            default: 0,
            description: "Total time spent executing in milliseconds",
        },
        averageExecutionTime: {
            type: Number,
            default: 0,
            description: "Cached average execution time in milliseconds",
        },
        lastExecuted: {
            type: Date,
            default: null,
        },
        firstExecuted: {
            type: Date,
            default: null,
        },
        cooldown: {
            type: Number,
            default: 3,
            description: "Cooldown in seconds",
        },
        requiredPermissions: {
            type: [String],
            default: [],
        },
        botPermissions: {
            type: [String],
            default: [],
        },
        nsfw: {
            type: Boolean,
            default: false,
        },
        hidden: {
            type: Boolean,
            default: false,
        },
        maintenance: {
            type: Boolean,
            default: false,
        },
        maintenanceReason: {
            type: String,
            default: null,
        },
        version: {
            type: String,
            default: "1.0.0",
        },
        lastModified: {
            type: Date,
            default: Date.now,
        },
        tags: {
            type: [String],
            default: [],
        },
        usageNotes: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    },
);

/**
 * Calculate success rate
 */
commandMetaSchema.methods.getSuccessRate = function () {
    if (this.executionCount === 0) return 0;
    return (this.successCount / this.executionCount) * 100;
};

/**
 * Calculate error rate
 */
commandMetaSchema.methods.getErrorRate = function () {
    if (this.executionCount === 0) return 0;
    return (this.errorCount / this.executionCount) * 100;
};

/**
 * Record a command execution
 */
commandMetaSchema.methods.recordExecution = function (success = true, executionTime = 0) {
    this.executionCount++;

    if (success) {
        this.successCount++;
    } else {
        this.errorCount++;
    }

    this.totalExecutionTime += executionTime;
    this.averageExecutionTime = this.totalExecutionTime / this.executionCount;
    this.lastExecuted = new Date();

    if (!this.firstExecuted) {
        this.firstExecuted = new Date();
    }

    return this.save();
};

/**
 * Get command status
 */
commandMetaSchema.methods.getStatus = function () {
    if (!this.enabled) return "disabled";
    if (this.maintenance) return "maintenance";
    if (this.errorCount > this.successCount) return "problematic";
    return "operational";
};

/**
 * Get command health report
 */
commandMetaSchema.methods.getHealthReport = function () {
    return {
        command: this.commandName,
        category: this.category,
        status: this.getStatus(),
        successRate: this.getSuccessRate().toFixed(2) + "%",
        errorRate: this.getErrorRate().toFixed(2) + "%",
        totalExecutions: this.executionCount,
        avgExecutionTime: this.averageExecutionTime.toFixed(2) + "ms",
        lastExecuted: this.lastExecuted,
    };
};

/**
 * Static method to get health report for all commands
 */
commandMetaSchema.statics.getHealthReport = async function () {
    const commands = await this.find();
    return commands.map((cmd) => cmd.getHealthReport());
};

/**
 * Static method to get problematic commands
 */
commandMetaSchema.statics.getProblematicCommands = async function (limit = 10) {
    return this.find()
        .sort({ errorCount: -1 })
        .limit(limit)
        .select("commandName errorCount executionCount");
};

/**
 * Static method to reset statistics
 */
commandMetaSchema.statics.resetStatistics = async function (commandName = null) {
    if (commandName) {
        return this.findOneAndUpdate(
            { commandName },
            {
                executionCount: 0,
                successCount: 0,
                errorCount: 0,
                totalExecutionTime: 0,
                averageExecutionTime: 0,
                lastExecuted: null,
            },
            { new: true },
        );
    } else {
        return this.updateMany(
            {},
            {
                executionCount: 0,
                successCount: 0,
                errorCount: 0,
                totalExecutionTime: 0,
                averageExecutionTime: 0,
                lastExecuted: null,
            },
        );
    }
};

const CommandMetadata = mongoose.model("CommandMetadata", commandMetaSchema);

module.exports = CommandMetadata;
