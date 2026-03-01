const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const moderationLogs = require("./../../database/moderationLogs");
const ms = require("ms"); // Use ms library to parse duration strings
const { success, error: errorEmbed, actionColor } = require("../../utils/moderationEmbeds");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 5,
    description_full: "Temporarily bans a member for the specified duration and reason.",
    usage: '/temp_ban target:@user duration:"duration" [reason:"ban reason"]',
    examples: [
        '/temp_ban target:@user123 duration:"1d"',
        '/temp_ban target:@user123 duration:"2h" reason:"Spamming"',
    ],

    data: new SlashCommandBuilder()
        .setName("temp_ban")
        .setDescription("Temporarily ban a member for a specified duration.")
        .addUserOption((option) =>
            option.setName("target").setDescription("The member to ban").setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("duration")
                .setDescription("The duration of the ban (e.g., 1h, 1d)")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("The reason for banning"),
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers,
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getMember("target");
        const duration = interaction.options.getString("duration");
        const reason = interaction.options.getString("reason") ?? "No reason provided";

        if (!(await this.checkTargetUser(interaction, targetUser))) return;
        if (!(await this.checkRolePositions(interaction, targetUser))) return;
        const durationMs = this.parseDuration(interaction, duration);
        if (!durationMs) return;

        await this.banUser({
            interaction,
            targetUser,
            duration,
            reason,
            durationMs,
        });
    },

    async checkTargetUser(interaction, targetUser) {
        if (!targetUser) {
            const embed = errorEmbed(interaction, {
                title: "User not found",
                description: "Please mention a valid member.",
            });
            await interaction.reply({ embeds: [embed] });
            return false;
        }

        if (targetUser.id === interaction.guild.ownerId) {
            const embed = errorEmbed(interaction, {
                title: "Permission Error",
                description: "You cannot ban the owner of the server",
            });
            await interaction.reply({ embeds: [embed] });
            return false;
        }

        return true;
    },

    async checkRolePositions(interaction, targetUser) {
        const targetUserRolePosition = targetUser.roles.highest.position;
        const requestUserRolePosition = interaction.member.roles.highest.position;
        const botRolePosition = interaction.guild.members.me.roles.highest.position;

        if (targetUserRolePosition >= requestUserRolePosition) {
            const embed = errorEmbed(interaction, {
                title: "Hierarchy Error",
                description: "You cannot ban someone with a higher or equal role than you",
            });
            await interaction.reply({ embeds: [embed] });
            return false;
        }

        if (targetUserRolePosition >= botRolePosition) {
            const embed = errorEmbed(interaction, {
                title: "Hierarchy Error",
                description: "I cannot ban someone with a higher or equal role than myself",
            });
            await interaction.reply({ embeds: [embed] });
            return false;
        }

        return true;
    },

    parseDuration(interaction, duration) {
        const durationMs = ms(duration);
        if (!durationMs) {
            const embed = errorEmbed(interaction, {
                title: "Invalid Duration",
                description: "Invalid duration format. Please use formats like 1h, 1d, etc.",
            });
            interaction.reply({ embeds: [embed] });
            return null;
        }
        return durationMs;
    },

    async banUser({ interaction, targetUser, duration, reason, durationMs }) {
        try {
            const logEntry = new moderationLogs({
                action: "temp_ban",
                moderator: interaction.user.id,
                user: targetUser.id,
                reason: reason,
                duration: durationMs,
            });

            await logEntry.save();

            await targetUser.ban({ reason: reason });
            const embed = success(interaction, {
                title: "Temporary Ban",
                description: `<@${targetUser.id}> has been banned for ${duration} for: \`${reason}\``,
                color: actionColor("ban"),
            });
            await interaction.reply({ embeds: [embed] });

            setTimeout(async () => {
                try {
                    await interaction.guild.members.unban(targetUser.id);
                } catch (error) {
                    handleError(`Failed to unban ${targetUser.tag}: ${error}`);
                }
            }, durationMs);
        } catch (error) {
            handleError("Error banning user:", error);
            const e = errorEmbed(interaction, {
                description: "An error occurred while trying to ban the user",
            });
            await interaction.reply({ embeds: [e] });
        }
    },
};
