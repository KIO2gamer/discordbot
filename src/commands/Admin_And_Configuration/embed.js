const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Colors,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");

const { handleError } = require("../../utils/errorHandler");

// Define preset colors with friendly names
const COLOR_PRESETS = {
    blue: Colors.Blue,
    red: Colors.Red,
    green: Colors.Green,
    yellow: Colors.Yellow,
    purple: Colors.Purple,
    pink: Colors.Fuchsia,
    aqua: Colors.Aqua,
    orange: Colors.Orange,
    white: Colors.White,
    black: Colors.NotQuiteBlack,
};

module.exports = {
    cooldown: 10,
    description_full:
        "Creates and sends a fully customizable embed message to the current or specified channel.",
    usage: "/embed create title:<title> description:<description> [channel:] [color:] [fields:] [footer:] [image:] [thumbnail:]",
    examples: [
        "/embed create title:Welcome! description:Hello everyone",
        "/embed create title:Rules description:Server rules channel:#rules color:red",
        "/embed create title:Announcement description:New features footer:Admin Team fields:Feature 1,Added voice chat|Feature 2,Improved performance",
    ],

    data: new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Create and send customizable embed messages")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("create")
                .setDescription("Create and send an embed message")
                .addStringOption((option) =>
                    option
                        .setName("title")
                        .setDescription("The title of the embed")
                        .setRequired(true)
                        .setMaxLength(256),
                )
                .addStringOption((option) =>
                    option
                        .setName("description")
                        .setDescription("The description of the embed")
                        .setRequired(true)
                        .setMaxLength(4096),
                )
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription(
                            "The channel to send the embed to (defaults to current channel)",
                        )
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("color")
                        .setDescription("The color of the embed (hex code or preset name)")
                        .setRequired(false)
                        .addChoices(
                            { name: "Blue", value: "blue" },
                            { name: "Red", value: "red" },
                            { name: "Green", value: "green" },
                            { name: "Yellow", value: "yellow" },
                            { name: "Purple", value: "purple" },
                            { name: "Pink", value: "pink" },
                            { name: "Aqua", value: "aqua" },
                            { name: "Orange", value: "orange" },
                            { name: "Custom Hex", value: "custom" },
                        ),
                )
                .addStringOption((option) =>
                    option
                        .setName("custom_color")
                        .setDescription(
                            "Custom hex color code (e.g. #FF5733) - only used if color is set to Custom Hex",
                        )
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("fields")
                        .setDescription(
                            "Add fields in format: 'name1,value1|name2,value2' (up to 25 fields)",
                        )
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("footer")
                        .setDescription("The footer text of the embed")
                        .setRequired(false)
                        .setMaxLength(2048),
                )
                .addStringOption((option) =>
                    option
                        .setName("footer_icon")
                        .setDescription("The URL of the footer icon")
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("thumbnail")
                        .setDescription("The URL of the thumbnail image")
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("image")
                        .setDescription("The URL of the main image")
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("author")
                        .setDescription("The author name for the embed")
                        .setRequired(false)
                        .setMaxLength(256),
                )
                .addStringOption((option) =>
                    option
                        .setName("author_icon")
                        .setDescription("The URL of the author icon")
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("author_url")
                        .setDescription("The URL to link the author name to")
                        .setRequired(false),
                )
                .addBooleanOption((option) =>
                    option
                        .setName("timestamp")
                        .setDescription("Whether to include a timestamp")
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("preview")
                .setDescription("Preview an embed without sending it")
                .addStringOption((option) =>
                    option
                        .setName("title")
                        .setDescription("The title of the embed")
                        .setRequired(true)
                        .setMaxLength(256),
                )
                .addStringOption((option) =>
                    option
                        .setName("description")
                        .setDescription("The description of the embed")
                        .setRequired(true)
                        .setMaxLength(4096),
                ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            // Build the embed based on options
            const embed = await this.buildEmbed(interaction);

            if (subcommand === "preview") {
                await interaction.deferReply({ flags: 64 });
                // For preview, include buttons to edit or send the embed
                const actionRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("send_embed")
                        .setLabel("Send to Channel")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("cancel_embed")
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Secondary),
                );

                await interaction.editReply({
                    content: "**Embed Preview:**",
                    embeds: [embed],
                    components: [actionRow],
                });
            } else {
                // For create, send directly to channel
                const targetChannel =
                    interaction.options.getChannel("channel") || interaction.channel;

                // Verify the bot has permission to send to that channel
                if (!targetChannel.permissionsFor(interaction.client.user).has("SendMessages")) {
                    return interaction.reply({
                        content: `I don't have permission to send messages in ${targetChannel}.`,
                        embeds: [],
                    });
                }

                await targetChannel.send({ embeds: [embed] });
                await interaction.reply({
                    content: `Embed successfully sent to ${targetChannel}.`,
                });
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while creating the embed.",
            );
        }
    },

    // Helper method to build embed from options
    async buildEmbed(interaction) {
        const options = interaction.options;
        const embed = new EmbedBuilder()
            .setTitle(options.getString("title"))
            .setDescription(options.getString("description"));

        // Handle color
        const colorChoice = options.getString("color");
        if (colorChoice) {
            if (colorChoice === "custom") {
                const customColor = options.getString("custom_color");
                if (customColor && /^#[0-9A-F]{6}$/i.test(customColor)) {
                    embed.setColor(customColor);
                } else {
                    embed.setColor(Colors.Blue);
                }
            } else if (COLOR_PRESETS[colorChoice]) {
                embed.setColor(COLOR_PRESETS[colorChoice]);
            }
        } else {
            embed.setColor(Colors.Blue);
        }

        // Handle fields
        const fieldsString = options.getString("fields");
        if (fieldsString) {
            const fieldPairs = fieldsString.split("|");
            for (const pair of fieldPairs) {
                const [name, value] = pair.split(",");
                if (name && value) {
                    embed.addFields({ name: name.trim(), value: value.trim() });
                }
            }
        }

        // Handle footer
        const footer = options.getString("footer");
        const footerIcon = options.getString("footer_icon");
        if (footer) {
            embed.setFooter({
                text: footer,
                iconURL: footerIcon || null,
            });
        }

        // Handle thumbnail
        const thumbnail = options.getString("thumbnail");
        if (thumbnail) {
            try {
                embed.setThumbnail(thumbnail);
            } catch {
                // Just skip if invalid URL
            }
        }

        // Handle main image
        const image = options.getString("image");
        if (image) {
            try {
                embed.setImage(image);
            } catch {
                // Just skip if invalid URL
            }
        }

        // Handle author
        const author = options.getString("author");
        const authorIcon = options.getString("author_icon");
        const authorUrl = options.getString("author_url");
        if (author) {
            embed.setAuthor({
                name: author,
                iconURL: authorIcon || null,
                url: authorUrl || null,
            });
        }

        // Handle timestamp
        if (options.getBoolean("timestamp")) {
            embed.setTimestamp();
        }

        return embed;
    },
};
