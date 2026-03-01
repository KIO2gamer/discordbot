const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 5,
    description_full:
        "Shows detailed information about emojis in the server, including name, ID, creation date, usage stats, and more. Can display info for a specific emoji or list all server emojis.",
    usage: "/emoji_info [emoji]",
    examples: [
        "/emoji_info",
        "/emoji_info MyCustomEmoji",
        "/emoji_info 🎮",
        "/emoji_info PartyBlob",
    ],

    data: new SlashCommandBuilder()
        .setName("emoji_info")
        .setDescription("Provides information about emojis")
        .addStringOption((option) =>
            option
                .setName("emoji")
                .setDescription("The emoji to get information about (name or the emoji itself)")
                .setRequired(false),
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const emojiInput = interaction.options.getString("emoji");

            try {
                // If no emoji specified, show all server emojis
                if (!emojiInput) {
                    const { emojis } = interaction.guild;
                    const totalEmojis = emojis.cache.size;

                    if (totalEmojis === 0) {
                        const embed = new EmbedBuilder()
                            .setTitle(`Emojis in ${interaction.guild.name}`)
                            .setDescription("This server has no custom emojis.")
                            .setColor("Blue")
                            .setFooter({
                                text: `Server ID: ${interaction.guild.id}`,
                                iconURL: interaction.guild.iconURL({ dynamic: true }),
                            });

                        await interaction.editReply({ embeds: [embed] });
                        return;
                    }

                    // Get emoji statistics
                    const animatedCount = emojis.cache.filter((e) => e.animated).size;
                    const staticCount = totalEmojis - animatedCount;
                    const managedCount = emojis.cache.filter((e) => e.managed).size;

                    // Group emojis by category (animated/static)
                    const staticEmojis = emojis.cache
                        .filter((e) => !e.animated)
                        .map((emoji) => `${emoji} \`${emoji.name}\``)
                        .join(" ");
                    const animatedEmojis = emojis.cache
                        .filter((e) => e.animated)
                        .map((emoji) => `${emoji} \`${emoji.name}\``)
                        .join(" ");

                    const embed = new EmbedBuilder()
                        .setAuthor({
                            name: `${interaction.guild.name} - Emoji Collection`,
                            iconURL: interaction.guild.iconURL(),
                        })
                        .setTitle("😀 Server Emojis")
                        .setDescription(
                            `Emoji statistics and collection for this server\n` +
                                `${"-".repeat(40)}`,
                        )
                        .setColor("#5865F2")
                        .addFields({
                            name: "📊 Emoji Statistics",
                            value: [
                                `**Total Emojis:** ${totalEmojis}`,
                                `**Static:** ${staticCount}`,
                                `**Animated:** ${animatedCount}`,
                                `**Integration Managed:** ${managedCount}`,
                                `**Server Boost Level:** ${interaction.guild.premiumTier}`,
                                `**Max Emoji Slots:** ${getMaxEmojis(interaction.guild.premiumTier)}`,
                            ].join("\n"),
                            inline: false,
                        });

                    if (staticEmojis) {
                        embed.addFields({
                            name: "🖼️ Static Emojis",
                            value: staticEmojis || "None",
                            inline: false,
                        });
                    }

                    if (animatedEmojis) {
                        embed.addFields({
                            name: "✨ Animated Emojis",
                            value: animatedEmojis || "None",
                            inline: false,
                        });
                    }

                    embed.setFooter({
                        text: `Server ID: ${interaction.guild.id} • Use /emoji_info <emoji> for detailed info`,
                        iconURL: interaction.guild.iconURL({ dynamic: true }),
                    });

                    await interaction.editReply({ embeds: [embed] });
                    return;
                }

                // Try to find emoji by name or by parsing emoji string
                let emoji;

                // Check if input is an emoji ID
                if (/^\d+$/.test(emojiInput)) {
                    emoji = interaction.guild.emojis.cache.get(emojiInput);
                }
                // Check if input is a custom emoji string
                else if (/<a?:\w+:\d+>/.test(emojiInput)) {
                    const emojiId = emojiInput.match(/\d+/)[0];
                    emoji = interaction.guild.emojis.cache.get(emojiId);
                }
                // Check if input is an emoji name
                else {
                    emoji = interaction.guild.emojis.cache.find(
                        (e) => e.name.toLowerCase() === emojiInput.toLowerCase(),
                    );
                }

                if (!emoji) {
                    await handleError(
                        interaction,
                        new Error("Emoji not found"),
                        "VALIDATION",
                        "Could not find that emoji in this server. Make sure to use the emoji name or the emoji itself.",
                    );
                    return;
                }

                // Get creator if possible
                let creator;
                try {
                    const fetchedEmoji = await interaction.guild.emojis.fetch(emoji.id);
                    creator = fetchedEmoji.author;
                } catch {
                    creator = null;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`Emoji Info: ${emoji.name}`)
                    .setColor(interaction.guild.members.me.displayHexColor)
                    .setThumbnail(emoji.imageURL())
                    .addFields(
                        {
                            name: "📋 General",
                            value: [
                                `**Name:** ${emoji.name}`,
                                `**ID:** \`${emoji.id}\``,
                                `**Created:** <t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`,
                                `**Animated:** ${emoji.animated ? "Yes" : "No"}`,
                                `**Available:** ${emoji.available ? "Yes" : "No"}`,
                                `**Managed:** ${emoji.managed ? "Yes (Integration)" : "No"}`,
                                `**Requires Colons:** ${emoji.requiresColons ? "Yes" : "No"}`,
                            ].join("\n"),
                            inline: false,
                        },
                        {
                            name: "🔗 Usage",
                            value: [
                                "**In Message:**",
                                `\`${emoji}\``,
                                "**In Reaction:**",
                                `\`${emoji.identifier}\``,
                                "**As URL:**",
                                `[Direct Link](${emoji.imageURL()})`,
                            ].join("\n"),
                            inline: false,
                        },
                    );

                if (creator) {
                    embed.addFields({
                        name: "👤 Creator",
                        value: [`**Name:** ${creator.tag}`, `**ID:** \`${creator.id}\``].join("\n"),
                        inline: false,
                    });
                }

                if (emoji.roles.cache.size > 0) {
                    const roles = emoji.roles.cache.map((role) => role.toString()).join(", ");
                    embed.addFields({
                        name: "🔒 Role Restrictions",
                        value: roles,
                        inline: false,
                    });
                }

                embed
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                await handleError(
                    interaction,
                    error,
                    "DATA_COLLECTION",
                    "Failed to fetch emoji information. The emoji might have been deleted.",
                );
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while retrieving emoji information.",
            );
        }
    },
};

// Helper function to get max emoji slots based on boost level
function getMaxEmojis(premiumTier) {
    switch (premiumTier) {
        case 1:
            return "100 static, 100 animated";
        case 2:
            return "150 static, 150 animated";
        case 3:
            return "250 static, 250 animated";
        default:
            return "50 static, 50 animated";
    }
}
