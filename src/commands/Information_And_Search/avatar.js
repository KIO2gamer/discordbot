const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 5,
    description_full:
        "Displays the user's avatar (profile picture) with various options for size and format. You can get the avatar of another user by mentioning them.",
    usage: "/avatar [target:user] [size:pixels] [format:png/jpg/webp]",
    examples: [
        "/avatar",
        "/avatar target:@username",
        "/avatar target:@username size:1024 format:png",
        "/avatar size:2048 format:webp",
    ],

    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Get the avatar of a user")
        .addUserOption((option) =>
            option.setName("target").setDescription("The user's avatar to show").setRequired(false),
        )
        .addIntegerOption((option) =>
            option
                .setName("size")
                .setDescription("The size of the avatar (in pixels)")
                .setRequired(false)
                .addChoices(
                    { name: "16", value: 16 },
                    { name: "32", value: 32 },
                    { name: "64", value: 64 },
                    { name: "128", value: 128 },
                    { name: "256", value: 256 },
                    { name: "512", value: 512 },
                    { name: "1024", value: 1024 },
                    { name: "2048", value: 2048 },
                    { name: "4096", value: 4096 },
                ),
        )
        .addStringOption((option) =>
            option
                .setName("format")
                .setDescription("The format of the avatar")
                .setRequired(false)
                .addChoices(
                    { name: "PNG", value: "png" },
                    { name: "JPEG", value: "jpg" },
                    { name: "WebP", value: "webp" },
                ),
        ),

    /**
     * Executes the avatar command to display a user's avatar.
     *
     * @param {Object} interaction - The interaction object from the Discord API.
     * @param {Object} interaction.options - The options provided with the interaction.
     * @param {Function} interaction.options.getUser - Function to get a user from the options.
     * @param {Function} interaction.options.getInteger - Function to get an integer from the options.
     * @param {Function} interaction.options.getString - Function to get a string from the options.
     * @param {Object} interaction.user - The user who initiated the interaction.
     * @param {Function} interaction.reply - Function to send a reply to the interaction.
     *
     * @returns {Promise<void>} - A promise that resolves when the reply is sent.
     */
    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Get command options
            const userTarget = interaction.options.getUser("target") || interaction.user;
            const size = interaction.options.getInteger("size") || 512;
            const format = interaction.options.getString("format") || "webp";

            try {
                // Validate user
                if (!userTarget) {
                    await handleError(
                        interaction,
                        new Error("Invalid user"),
                        "VALIDATION",
                        "The specified user could not be found.",
                    );
                    return;
                }

                // Check available formats
                const availableFormats = ["png", "jpg", "webp"];
                const isAnimated = userTarget.avatar?.startsWith("a_");
                if (isAnimated) {
                    availableFormats.push("gif");
                }

                // Validate format
                const validFormat = availableFormats.includes(format) ? format : "webp";

                // Get avatar URLs for different formats
                const avatarURLs = {};
                for (const fmt of availableFormats) {
                    avatarURLs[fmt] = userTarget.displayAvatarURL({
                        format: fmt,
                        dynamic: true,
                        size: size,
                    });
                }

                // Create embed
                const embed = new EmbedBuilder()
                    .setTitle(`${userTarget.username}'s Avatar`)
                    .setDescription(
                        [
                            `**User ID:** ${userTarget.id}`,
                            `**Animated:** ${isAnimated ? "Yes" : "No"}`,
                            `**Size:** ${size}x${size} pixels`,
                            `**Format:** ${validFormat.toUpperCase()}`,
                            "\n**Available Formats:**",
                            ...availableFormats.map(
                                (fmt) => `• [${fmt.toUpperCase()}](${avatarURLs[fmt]})`,
                            ),
                        ].join("\n"),
                    )
                    .setImage(avatarURLs[validFormat])
                    .setColor(userTarget.accentColor || "Blue")
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                    })
                    .setTimestamp();

                // Add server-specific avatar if available
                if (interaction.guild) {
                    const member = await interaction.guild.members
                        .fetch(userTarget.id)
                        .catch(() => null);
                    if (member && member.avatar) {
                        const serverAvatar = member.displayAvatarURL({
                            dynamic: true,
                            size: size,
                            format: validFormat,
                        });
                        embed.addFields({
                            name: "Server-Specific Avatar",
                            value: `[View Server Avatar](${serverAvatar})`,
                            inline: false,
                        });
                    }
                }

                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                await handleError(
                    interaction,
                    error,
                    "DATA_COLLECTION",
                    "Failed to fetch avatar information.",
                );
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while retrieving the avatar.",
            );
        }
    },
};
