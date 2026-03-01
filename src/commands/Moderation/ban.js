const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const moderationLogs = require("./../../database/moderationLogs");
const { handleError } = require("../../utils/errorHandler");
const { success, error: errorEmbed, actionColor } = require("../../utils/moderationEmbeds");

module.exports = {
    cooldown: 5,
    description_full: "Bans a member from the server with the specified reason.",
    usage: '/ban target:@user [reason:"ban reason"]',
    examples: ["/ban target:@user123", '/ban target:@user123 reason:"Severe rule violation"'],

    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user from the server")
        .addUserOption((option) =>
            option.setName("target").setDescription("The user to ban").setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("The reason for banning").setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getMember("target");
            const reason = interaction.options.getString("reason");

            // Validate target user
            if (!targetUser) {
                const embed = errorEmbed(interaction, {
                    title: "User not found",
                    description: "Please mention a valid member.",
                });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            // Check if user is bannable
            if (!targetUser.bannable) {
                const embed = errorEmbed(interaction, {
                    title: "Permission Error",
                    description: "I do not have permission to ban this user.",
                });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            // Check if target is server owner
            if (targetUser.id === interaction.guild.ownerId) {
                const embed = errorEmbed(interaction, {
                    title: "Permission Error",
                    description: "You cannot ban the owner of the server",
                });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            // Check role hierarchy
            const targetUserRolePosition = targetUser.roles.highest.position;
            const botRolePosition = interaction.guild.members.me.roles.highest.position;
            const moderatorRolePosition = interaction.member.roles.highest.position;

            if (targetUserRolePosition >= moderatorRolePosition) {
                const embed = errorEmbed(interaction, {
                    title: "Hierarchy Error",
                    description: "You cannot ban someone with a higher or equal role than you",
                });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            if (targetUserRolePosition >= botRolePosition) {
                const embed = errorEmbed(interaction, {
                    title: "Hierarchy Error",
                    description: "I cannot ban someone with a higher or equal role than myself",
                });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            // Create moderation log entry
            const logEntry = new moderationLogs({
                action: "ban",
                moderator: interaction.user.id,
                user: targetUser.id,
                reason: reason,
            });

            // Save log and ban user
            await Promise.all([logEntry.save(), targetUser.ban({ reason: reason })]);

            // Send success message
            const embed = success(interaction, {
                title: "User Banned",
                description: `Successfully banned ${targetUser} for reason: \`${reason}\``,
                color: actionColor("ban"),
            });
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            handleError("Error banning user:", error);
            if (error.code === 50013) {
                const embed = errorEmbed(interaction, {
                    title: "Permission Error",
                    description: "I do not have the required permissions to ban this user.",
                });
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = errorEmbed(interaction, {
                    description: "An error occurred while trying to ban the user.",
                });
                await interaction.reply({ embeds: [embed] });
            }
        }
    },
};
