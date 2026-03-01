const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require("discord.js");

const Logger = require("../../utils/logger");

module.exports = {
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName("setlogchannel")
        .setDescription("Set the channel for bot logging")
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The channel to send logs to")
                .setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel("channel") || interaction.channel;

            // Check if the channel is a text channel
            if (!channel.isTextBased()) {
                return await interaction.reply({
                    content: "❌ Please select a text channel for logging.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Check bot permissions in the channel
            const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
            const permissions = channel.permissionsFor(botMember);

            if (
                !permissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])
            ) {
                return await interaction.reply({
                    content:
                        "❌ I don't have permission to send messages and embeds in that channel.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Set the log channel
            Logger.setLogChannel(channel.id);

            // Send confirmation
            await interaction.reply({
                content: `✅ Log channel set to ${channel}. Important bot logs will now be sent here.`,
                flags: MessageFlags.Ephemeral,
            });

            // Send a test log to the channel
            await Logger.logToDiscord(
                `Log channel configured by ${interaction.user.tag} in ${interaction.guild.name}`,
                "info",
                "BOT",
            );

            // Log the action
            await Logger.security(
                `Log channel set to #${channel.name} (${channel.id}) by ${interaction.user.tag} in ${interaction.guild.name}`,
            );
        } catch (error) {
            console.error("Error in setlogchannel command:", error);

            await Logger.errorWithContext(error, {
                command: "setlogchannel",
                user: interaction.user.tag,
                guild: interaction.guild?.name,
                channel: interaction.channel?.name,
            });

            if (!interaction.replied) {
                await interaction.reply({
                    content: "❌ An error occurred while setting the log channel.",
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    },
};
