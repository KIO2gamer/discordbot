const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const { handleError } = require("../../utils/errorHandler");
const { success, error: errorEmbed, actionColor } = require("../../utils/moderationEmbeds");

module.exports = {
    cooldown: 10,
    description_full:
        "This command unlocks a specified channel or the current channel if no channel is specified.",
    usage: "/unlock <channel?>",
    examples: ["/unlock", "/unlock #general"],

    data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock a channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The channel you want to unlock")
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false),
        ),

    async execute(interaction) {
        const channel = interaction.options.getChannel("channel") || interaction.channel;

        // Check if the bot has the required permissions
        if (
            !channel.permissionsFor(interaction.client.user).has(PermissionFlagsBits.ManageChannels)
        ) {
            const embed = errorEmbed(interaction, {
                title: "Permission Error",
                description: "I do not have the required permissions to unlock the channel.",
            });
            await interaction.reply({ embeds: [embed] });
            return;
        }

        const embed = success(interaction, {
            title: `Channel Unlocked`,
            description: `${channel} can send messages again.`,
            color: actionColor("unlock"),
        });

        const alreadyEmbed = errorEmbed(interaction, {
            title: "Already Unlocked",
            description: `${channel} is already unlocked`,
        });

        // Check if the channel is already unlocked
        if (
            !channel.permissionOverwrites.cache
                .get(interaction.guild.id)
                ?.deny.has(PermissionFlagsBits.SendMessages)
        ) {
            await interaction.reply({ embeds: [alreadyEmbed] });
            return;
        }

        try {
            // Unlock the channel
            await channel.permissionOverwrites.create(interaction.guild.id, {
                SendMessages: null,
            });

            if (channel === interaction.channel) {
                await interaction.reply({
                    embeds: [embed],
                });
            } else {
                await interaction.reply({
                    content: "**Unlocked Successfully**",
                });
                await channel.send({
                    embeds: [embed],
                });
            }
        } catch (error) {
            handleError("Error unlocking channel:", error);
            const embed = errorEmbed(interaction, {
                description: "An error occurred while trying to unlock the channel.",
            });
            await interaction.reply({ embeds: [embed] });
        }
    },
};
