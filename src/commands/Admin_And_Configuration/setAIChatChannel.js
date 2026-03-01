const {
    ChannelType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");

const { handleError } = require("../../utils/errorHandler");
const AIChatChannel = require("./../../database/AIChatChannel");

module.exports = {
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName("set_ai_chat_channel")
        .setDescription("Set the channel for AI chat interactions")
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The channel to set for AI chat")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    description_full:
        "Sets a specific channel where users can interact with the AI chatbot. This helps keep AI conversations organized in a dedicated channel.",
    usage: "/set_ai_chat_channel #channel",
    examples: [
        "/set_ai_chat_channel #ai-chat",
        "/set_ai_chat_channel #bot-commands",
        "/set_ai_chat_channel #chatbot",
    ],

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const channel = interaction.options.getChannel("channel");

            // Validate channel
            if (!channel) {
                await handleError(
                    interaction,
                    new Error("No channel provided"),
                    "VALIDATION",
                    "Please provide a valid text channel.",
                );
                return;
            }

            // Check if channel is in the same guild
            if (channel.guildId !== interaction.guildId) {
                await handleError(
                    interaction,
                    new Error("Invalid channel guild"),
                    "VALIDATION",
                    "The channel must be in this server.",
                );
                return;
            }

            // Check bot permissions in the channel
            const botMember = interaction.guild.members.me;
            const requiredPermissions = [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
            ];

            const missingPermissions = requiredPermissions.filter(
                (perm) => !channel.permissionsFor(botMember).has(perm),
            );

            if (missingPermissions.length > 0) {
                const permissionNames = missingPermissions.map((perm) =>
                    Object.keys(PermissionFlagsBits)
                        .find((key) => PermissionFlagsBits[key] === perm)
                        .replace(/_/g, " ")
                        .toLowerCase(),
                );

                await handleError(
                    interaction,
                    new Error("Missing channel permissions"),
                    "PERMISSION",
                    `I need the following permissions in ${channel}: ${permissionNames.join(", ")}`,
                );
                return;
            }

            // Update or create AI chat channel configuration
            try {
                await AIChatChannel.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { channelId: channel.id },
                    { upsert: true, new: true },
                );

                await interaction.editReply({
                    content: `✅ AI chat channel has been set to ${channel}\nUsers can now interact with the AI chatbot in that channel.`,
                    flags: MessageFlags.Ephemeral,
                });

                // Send a test message to the channel
                await channel.send({
                    content:
                        "🤖 This channel has been set up for AI chat interactions!\n" +
                        "Users can now chat with the AI bot in this channel.\n" +
                        "To start a conversation, simply send a message in this channel.",
                });
            } catch (error) {
                if (error.code === 11000) {
                    await handleError(
                        interaction,
                        error,
                        "DATABASE",
                        "Failed to update the AI chat channel configuration.",
                    );
                } else {
                    throw error;
                }
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while setting up the AI chat channel.",
            );
        }
    },
};
