/**
 * CommandExecutor
 * Middleware for executing commands with permission checks, cooldown handling, and error management
 */
const Logger = require("./logger");
const { handleError } = require("./errorHandler");

class CommandExecutor {
    /**
     * Execute a command with full middleware pipeline
     * @param {Interaction} interaction - Discord interaction
     * @param {Object} command - Command object
     * @param {Client} client - Discord client
     * @returns {Promise<boolean>} Success status
     */
    static async execute(interaction, command, client) {
        const startTime = Date.now();
        const commandName = command.data.name;

        try {
            // 1. Check if command is enabled
            if (command.enabled === false) {
                await interaction.reply({
                    content: "❌ This command is currently disabled.",
                    ephemeral: true,
                });
                return false;
            }

            // 2. Check permissions
            if (!(await this.checkPermissions(interaction, command, client))) {
                await interaction.reply({
                    content: "❌ You don't have permission to use this command.",
                    ephemeral: true,
                });
                return false;
            }

            // 3. Check bot permissions
            if (command.botPermissions && !this.checkBotPermissions(interaction, command)) {
                await interaction.reply({
                    content: `❌ I don't have the required permissions: ${command.botPermissions.join(", ")}`,
                    ephemeral: true,
                });
                return false;
            }

            // 4. Check cooldown
            const cooldownResult = this.checkCooldown(interaction, command, client);
            if (!cooldownResult.allowed) {
                const remaining = Math.ceil(cooldownResult.remainingTime / 1000);
                await interaction.reply({
                    content: `⏱️ Command on cooldown. Try again in **${remaining}s**.`,
                    ephemeral: true,
                });
                return false;
            }

            // 5. Execute command
            await command.execute(interaction);

            // 6. Record successful execution
            const executionTime = Date.now() - startTime;
            client.commandRegistry.recordExecution(commandName, executionTime, true);
            return true;
        } catch (error) {
            // Record failed execution
            const executionTime = Date.now() - startTime;
            client.commandRegistry.recordExecution(commandName, executionTime, false);

            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                `An error occurred while executing **/${commandName}**.`,
            );
            return false;
        }
    }

    /**
     * Check user permissions for command
     * @param {Interaction} interaction - Discord interaction
     * @param {Object} command - Command object
     * @param {Client} client - Discord client
     * @returns {Promise<boolean>}
     */
    static async checkPermissions(interaction, command, client) {
        // Skip permission check for bot owner
        if (interaction.user.id === process.env.BOT_OWNER_ID) {
            return true;
        }

        // No permission requirements
        if (!command.permissions && !command.userPermissions) {
            return true;
        }

        // Check user permissions
        if (command.userPermissions && Array.isArray(command.userPermissions)) {
            if (!interaction.member.permissions.has(command.userPermissions)) {
                return false;
            }
        }

        // Check role-based permissions from database
        try {
            const CommandPermissions = require("../database/commandPermissions");
            const permDoc = await CommandPermissions.findOne({
                commandName: command.data.name,
            });

            if (permDoc && permDoc.permissions.roles.size > 0) {
                const userRoles = interaction.member.roles.cache;
                let hasPermission = false;

                for (const [roleId, allowed] of permDoc.permissions.roles) {
                    if (userRoles.has(roleId)) {
                        hasPermission = allowed;
                        break;
                    }
                }

                if (!hasPermission) {
                    return false;
                }
            }

            // Check user-specific permissions
            if (permDoc && permDoc.permissions.users.has(interaction.user.id)) {
                return permDoc.permissions.users.get(interaction.user.id);
            }
        } catch (error) {
            Logger.warn(`Failed to check database permissions: ${error.message}`);
        }

        return true;
    }

    /**
     * Check if bot has required permissions
     * @param {Interaction} interaction - Discord interaction
     * @param {Object} command - Command object
     * @returns {boolean}
     */
    static checkBotPermissions(interaction, command) {
        if (!command.botPermissions || !Array.isArray(command.botPermissions)) {
            return true;
        }

        const botMember = interaction.guild.members.me;
        return botMember.permissions.has(command.botPermissions);
    }

    /**
     * Check cooldown for command
     * @param {Interaction} interaction - Discord interaction
     * @param {Object} command - Command object
     * @param {Client} client - Discord client
     * @returns {Object} { allowed: boolean, remainingTime: number }
     */
    static checkCooldown(interaction, command, client) {
        const cooldown = command.cooldown || 3; // Default 3 seconds
        const now = Date.now();
        const cooldownKey = `${command.data.name}-${interaction.user.id}`;

        if (!client.cooldowns.has(cooldownKey)) {
            client.cooldowns.set(cooldownKey, now);
            return { allowed: true, remainingTime: 0 };
        }

        const expirationTime = client.cooldowns.get(cooldownKey) + cooldown * 1000;
        const remainingTime = expirationTime - now;

        if (remainingTime > 0) {
            return { allowed: false, remainingTime };
        }

        client.cooldowns.set(cooldownKey, now);
        return { allowed: true, remainingTime: 0 };
    }

    /**
     * Clean up expired cooldowns
     * @param {Client} client - Discord client
     */
    static cleanupCooldowns(client) {
        const now = Date.now();
        const maxCooldownAge = 30 * 60 * 1000; // 30 minutes

        for (const [key, timestamp] of client.cooldowns) {
            if (now - timestamp > maxCooldownAge) {
                client.cooldowns.delete(key);
            }
        }
    }
}

module.exports = CommandExecutor;
