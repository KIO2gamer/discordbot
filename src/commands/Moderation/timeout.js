const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const ms = require("ms");
const moderationLogs = require("./../../database/moderationLogs");
const { success, error: errorEmbed } = require("../../utils/moderationEmbeds");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 5,
    description_full: "Timeouts a member for the specified duration and reason.",
    usage: '/timeout target:@user amount:"duration" [reason:"timeout reason"]',
    examples: [
        '/timeout target:@user123 amount:"1h"',
        '/timeout target:@user123 amount:"30m" reason:"Being disruptive"',
    ],

    data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Select a member and timeout them.")
        .addUserOption((option) =>
            option.setName("target").setDescription("The member to timeout").setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("amount")
                .setDescription(
                    "The duration of the timeout (max 28 days) e.g. 1d | 2 weeks | 3hrs",
                )
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("The reason for timeout"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getMember("target");
        const reason = interaction.options.getString("reason") ?? "No reason provided";
        const duration = interaction.options.getString("amount");
        const durationMs = ms(duration);

        if (!targetUser) {
            const embed = errorEmbed(interaction, {
                title: "User not found",
                description: "Please mention a valid member.",
            });
            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (targetUser.id === interaction.guild.ownerId) {
            const embed = errorEmbed(interaction, {
                title: "Permission Error",
                description: "You cannot timeout the owner of the server",
            });
            await interaction.reply({ embeds: [embed] });
            return;
        }

        const targetUserRolePosition = targetUser.roles.highest.position;
        const requestUserRolePosition = interaction.member.roles.highest.position;
        const botRolePosition = interaction.guild.members.me.roles.highest.position;

        if (targetUserRolePosition >= requestUserRolePosition) {
            const embed = errorEmbed(interaction, {
                title: "Hierarchy Error",
                description: "You cannot timeout someone with a higher or equal role than you",
            });
            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (targetUserRolePosition >= botRolePosition) {
            const embed = errorEmbed(interaction, {
                title: "Hierarchy Error",
                description: "I cannot timeout someone with a higher or equal role than myself",
            });
            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (!durationMs || durationMs > ms("28d")) {
            const embed = errorEmbed(interaction, {
                title: "Invalid Duration",
                description: "Please provide a valid duration (max 28 days)",
            });
            await interaction.reply({ embeds: [embed] });
            return;
        }

        try {
            const currentTime = Date.now();
            const newTimeoutDuration =
                targetUser.communicationDisabledUntilTimestamp &&
                targetUser.communicationDisabledUntilTimestamp > currentTime
                    ? targetUser.communicationDisabledUntilTimestamp - currentTime + durationMs
                    : durationMs;

            if (newTimeoutDuration <= 0) {
                await targetUser.timeout(null, reason); // Remove timeout if the new duration is less than or equal to zero
                const embed = success(interaction, {
                    title: "Timeout Removed",
                    description: `<@${targetUser.id}>'s timeout has been removed. Reason: \`${reason}\``,
                });
                await interaction.reply({ embeds: [embed] });
            } else if (newTimeoutDuration > ms("28d")) {
                const embed = errorEmbed(interaction, {
                    title: "Invalid Duration",
                    description: "The total timeout duration exceeds the maximum limit of 28 days.",
                });
                await interaction.reply({ embeds: [embed] });
            } else {
                const logEntry = new moderationLogs({
                    action: "timeout",
                    duration: newTimeoutDuration,
                    moderator: interaction.user.id,
                    user: targetUser.id,
                    reason: reason,
                });

                await logEntry.save();

                await targetUser.timeout(newTimeoutDuration, reason);
                const embed = success(interaction, {
                    title: "Timeout Updated",
                    description: `<@${targetUser.id}>'s timeout has been updated. Reason: \`${reason}\`\nNew Duration: \`${ms(newTimeoutDuration, { long: true })}\``,
                });
                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            handleError("Failed to timeout user:", error);
            const embed = errorEmbed(interaction, {
                title: "Error",
                description: `An error occurred while trying to timeout the user\n\`${error.message}\``,
            });
            await interaction.reply({ embeds: [embed] });
        }
    },
};
