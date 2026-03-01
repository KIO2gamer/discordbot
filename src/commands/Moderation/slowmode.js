const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const ms = require("ms");
const { handleError } = require("../../utils/errorHandler");
const { success, error: errorEmbed } = require("../../utils/moderationEmbeds");

module.exports = {
    cooldown: 10,
    description_full:
        "This command allows you to set a slowmode for a channel. Slowmode limits how often users can send messages in the specified channel. You can set the slowmode duration using common time units (e.g., 10s, 5m, 1h).",
    usage: "/slowmode [duration] [channel]",
    examples: [
        "/slowmode 10s", // Set slowmode to 10 seconds in the current channel
        "/slowmode 5m #general", // Set slowmode to 5 minutes in the #general channel
    ],

    data: new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set a slowmode for a channel.")
        .addStringOption((option) =>
            option
                .setName("duration")
                .setDescription("The duration of the slowmode (e.g., 10s, 5m, 1h)")
                .setRequired(true),
        )
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The channel to set slowmode in")
                .setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.options.getChannel("channel") || interaction.channel;
        const durationInput = interaction.options.getString("duration");
        const duration = ms(durationInput) / 1000;

        if (isNaN(duration) || duration < 0 || duration > 21600) {
            const embed = errorEmbed(interaction, {
                title: "Invalid Duration",
                description: "Please provide a duration between 0 seconds and 6 hours.",
            });
            await interaction.reply({ embeds: [embed] });
            return;
        }

        try {
            await channel.setRateLimitPerUser(duration);

            let description;
            if (duration === 0) {
                description = `The slowmode for <#${channel.id}> has been disabled.`;
            } else {
                description = `The slowmode for <#${channel.id}> has been set to ${durationInput}.`;
            }

            const embed = success(interaction, {
                title: "Slowmode Set",
                description,
            });
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            handleError("Error setting slowmode:", error);
            const embed = errorEmbed(interaction, {
                description: "An error occurred while trying to set slowmode.",
            });
            await interaction.reply({ embeds: [embed] });
        }
    },
};
