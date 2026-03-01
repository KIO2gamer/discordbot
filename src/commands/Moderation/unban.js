const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { success, error: errorEmbed, actionColor } = require("../../utils/moderationEmbeds");
const { handleError } = require("../../utils/errorHandler");

const moderationLogs = require("./../../database/moderationLogs");

module.exports = {
    cooldown: 5,
    description_full: "Unbans a member from the server with the specified reason.",
    usage: '/unban user:"user ID or unique username" [reason:"unban reason"]',
    examples: [
        '/unban user:"123456789012345678"',
        '/unban user:"yoo_12345" reason:"Ban was a mistake"',
    ],

    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a member from the server.")
        .addStringOption((option) =>
            option
                .setName("user")
                .setDescription("The ID or unique username of the member to unban")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("The reason for unbanning"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const userInput = interaction.options.getString("user");
        const reason = interaction.options.getString("reason") ?? "No reason provided";

        try {
            const bans = await interaction.guild.bans.fetch();
            const bannedUser = bans.find(
                (ban) =>
                    ban.user.id === userInput ||
                    ban.user.tag.toLowerCase() === userInput.toLowerCase(),
            );

            if (!bannedUser) {
                const embed = errorEmbed(interaction, {
                    title: "User Not Found",
                    description: "User is not banned or not found",
                });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            await interaction.guild.members.unban(bannedUser.user.id, reason);

            const logEntry = new moderationLogs({
                action: "unban",
                moderator: interaction.user.id,
                user: bannedUser.user.id,
                reason: reason,
            });

            await logEntry.save();

            const embed = success(interaction, {
                title: "User Unbanned",
                description: `Successfully unbanned ${bannedUser.user.tag}`,
                color: actionColor("unban"),
                fields: [
                    { name: "User ID", value: bannedUser.user.id, inline: true },
                    { name: "Reason", value: reason, inline: true },
                ],
            });
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            handleError("Error unbanning user:", error);
            const e = errorEmbed(interaction, {
                description: "An error occurred while trying to unban the user",
            });
            await interaction.reply({ embeds: [e] });
        }
    },
};
