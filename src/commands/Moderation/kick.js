const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const moderationLogs = require("./../../database/moderationLogs");
const { handleError } = require("../../utils/errorHandler");
const {
    success,
    error: errorEmbed,
    dmNotice,
    actionColor,
} = require("../../utils/moderationEmbeds");

module.exports = {
    cooldown: 5,
    description_full: "Kicks a member from the server with the specified reason.",
    usage: '/kick target:@user [reason:"kick reason"]',
    examples: ["/kick target:@user123", '/kick target:@user123 reason:"Violating server rules"'],

    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a user from the server")
        .addUserOption((option) =>
            option.setName("target").setDescription("The user to kick").setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("The reason for kicking").setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

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

            // Check if user is kickable
            if (!targetUser.kickable) {
                const embed = errorEmbed(interaction, {
                    title: "Permission Error",
                    description: "I do not have permission to kick this user.",
                });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            // Check if target is server owner
            if (targetUser.id === interaction.guild.ownerId) {
                const embed = errorEmbed(interaction, {
                    title: "Permission Error",
                    description: "You cannot kick the owner of the server",
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
                    description: "You cannot kick someone with a higher or equal role than you",
                });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            if (targetUserRolePosition >= botRolePosition) {
                const embed = errorEmbed(interaction, {
                    title: "Hierarchy Error",
                    description: "I cannot kick someone with a higher or equal role than myself",
                });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            // Create moderation log entry
            const logEntry = new moderationLogs({
                action: "kick",
                moderator: interaction.user.id,
                user: targetUser.id,
                reason: reason,
            });

            // Try to DM the user before kicking
            try {
                const dm = dmNotice({
                    guildName: interaction.guild.name,
                    title: `Kicked from ${interaction.guild.name}`,
                    description: `You have been kicked for: \`${reason}\``,
                    color: actionColor("kick"),
                });
                await targetUser.send({ embeds: [dm] });
            } catch (dmError) {
                // If DM fails, log it but don't treat it as a command failure
                handleError(
                    "Could not send kick notification DM to user (they may have DMs disabled).",
                    dmError,
                );
            }

            // Save log and kick user
            await Promise.all([logEntry.save(), targetUser.kick(reason)]);

            // Send success message
            const embed = success(interaction, {
                title: "User Kicked",
                description: `Successfully kicked ${targetUser} for reason: \`${reason}\``,
                color: actionColor("kick"),
            });
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            handleError("Error kicking user:", error);
            if (error.code === 50013) {
                const embed = errorEmbed(interaction, {
                    title: "Permission Error",
                    description: "I do not have the required permissions to kick this user.",
                });
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = errorEmbed(interaction, {
                    description: "An error occurred while trying to kick the user.",
                });
                await interaction.reply({ embeds: [embed] });
            }
        }
    },
};
