const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require("discord.js");
const { handleError } = require("./../../utils/errorHandler");

module.exports = {
    cooldown: 10,
    description_full: "Fetches the embed data from a message URL.",
    usage: "/fetch_embed_data <url:message_url>",
    examples: [
        "/fetch_embed_data https://discord.com/channels/123456789012345678/123456789012345678/123456789012345678",
    ],

    data: new SlashCommandBuilder()
        .setName("fetch_embed_data")
        .setDescription("Fetches the embed data from a message URL.")
        .addStringOption((option) =>
            option.setName("url").setDescription("The message URL").setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const url = interaction.options.getString("url"); // Get the URL from the message
            const urlRegex = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
            const match = url.match(urlRegex);

            if (!match) {
                return handleError(
                    interaction,
                    new Error("Invalid message URL provided."),
                    "VALIDATION",
                );
            }

            const [, , channelId, messageId] = match;

            // Fetch the message using the provided URL
            const response = await fetch(
                `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
                {
                    headers: {
                        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
                    },
                },
            );

            if (!response.ok) {
                return handleError(
                    interaction,
                    new Error(`Failed to fetch the message. Status: ${response.status}`),
                    "API",
                    "Failed to fetch the message. Is the URL correct and is the bot in that server?",
                );
            }

            const data = await response.json();

            if (!data.embeds || data.embeds.length === 0) {
                return handleError(
                    interaction,
                    new Error("The specified message does not contain any embeds."),
                    "VALIDATION",
                );
            }

            const embedData = data.embeds[0];

            // Send the embed data as JSON
            await interaction.editReply({
                content: "Embed Data:",
                files: [
                    {
                        attachment: Buffer.from(JSON.stringify(embedData, null, 2)),
                        name: "embed.json",
                    },
                ],
            });
        } catch (error) {
            handleError(interaction, error);
        }
    },
};
