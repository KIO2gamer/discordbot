const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

const { handleError } = require("../../utils/errorHandler");
const axios = require("axios");

module.exports = {
    cooldown: 5,
    description_full: "Various fun commands combined into one with subcommands.",
    usage: "/fun <subcommand> [user:@user]",
    examples: [
        "/fun boba",
        "/fun rickroll",
        "/fun summon @user",
        "/fun quokka",
        "/fun yeet",
        "/fun kill @user",
    ],

    data: new SlashCommandBuilder()
        .setName("fun")
        .setDescription("Various fun commands combined into one.")
        .addSubcommand((subcommand) =>
            subcommand.setName("boba").setDescription("Send a pic of boba because it is the best."),
        )
        .addSubcommand((subcommand) =>
            subcommand.setName("rickroll").setDescription("Never gonna give you up!"),
        )

        .addSubcommand((subcommand) =>
            subcommand
                .setName("summon")
                .setDescription("Summon a user")
                .addUserOption((option) =>
                    option.setName("user").setDescription("The user to summon").setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("quokka")
                .setDescription("Send a pic of a quokka because it is cute."),
        )

        .addSubcommand((subcommand) => subcommand.setName("yeet").setDescription("Yeet someone!"))
        .addSubcommand((subcommand) =>
            subcommand
                .setName("kill")
                .setDescription("Kill a user (in a fun way)")
                .addUserOption((option) =>
                    option.setName("user").setDescription("The user to kill").setRequired(true),
                ),
        ),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case "boba":
                    await handleGifCommand(interaction, "boba", "Enjoy your Boba!");
                    break;
                case "rickroll":
                    await handleGifCommand(
                        interaction,
                        "rickroll",
                        "***You've been rickrolled!***",
                    );
                    break;

                case "summon":
                    await handleSummon(interaction);
                    break;
                case "quokka":
                    await handleGifCommand(
                        interaction,
                        "quokka",
                        "You have been blessed by the powers of a quokka!",
                    );
                    break;

                case "yeet":
                    await handleGifCommand(interaction, "yeet", "Yeet!");
                    break;
                case "kill":
                    await handleKill(interaction);
                    break;

                default:
                    await handleError(
                        interaction,
                        new Error(`Unknown subcommand: ${subcommand}`),
                        "VALIDATION",
                        "This subcommand does not exist.",
                    );
                    break;
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while executing the fun command.",
            );
        }
    },
};

// Rate limiting for GIPHY API
const giphyRateLimit = {
    requests: new Map(),
    MAX_REQUESTS: 10,
    WINDOW_MS: 60000, // 1 minute
};

/**
 * Fetches a random GIF from GIPHY with improved error handling
 */
async function getRandomGif(searchTerm) {
    if (!process.env.GIPHY_API_KEY) {
        throw new Error("GIPHY API key is not configured. Please contact an administrator.");
    }

    try {
        const response = await axios.get("https://api.giphy.com/v1/gifs/random", {
            params: {
                api_key: process.env.GIPHY_API_KEY,
                tag: searchTerm,
                rating: "g",
            },
            timeout: 8000,
            headers: {
                "User-Agent": "Discord-Bot-Fun-Commands",
            },
        });

        // Validate response structure
        if (!response.data?.data?.images?.original?.url) {
            throw new Error("Invalid response structure from GIPHY API");
        }

        return response.data.data.images.original.url;
    } catch (error) {
        if (error.response) {
            // API returned an error response
            const status = error.response.status;
            if (status === 429) {
                throw new Error("GIPHY API rate limit exceeded. Please try again in a moment.");
            } else if (status === 403) {
                throw new Error("GIPHY API access denied. Invalid API key.");
            } else if (status === 404) {
                throw new Error(`No GIF found for "${searchTerm}". Try a different search term.`);
            }
        }

        if (error.code === "ECONNABORTED") {
            throw new Error("GIPHY API request timed out. Please try again.");
        }

        throw new Error(`Failed to fetch GIF: ${error.message || "Unknown error"}`);
    }
}

/**
 * Checks rate limit for user
 */
function checkRateLimit(userId) {
    const now = Date.now();
    const userRequests = giphyRateLimit.requests.get(userId) || [];

    // Filter out old requests
    const recentRequests = userRequests.filter(
        (timestamp) => now - timestamp < giphyRateLimit.WINDOW_MS,
    );

    if (recentRequests.length >= giphyRateLimit.MAX_REQUESTS) {
        return false;
    }

    recentRequests.push(now);
    giphyRateLimit.requests.set(userId, recentRequests);

    // Cleanup old entries
    if (giphyRateLimit.requests.size > 1000) {
        const entriesToDelete = [];
        for (const [id, timestamps] of giphyRateLimit.requests.entries()) {
            if (timestamps.every((t) => now - t > giphyRateLimit.WINDOW_MS)) {
                entriesToDelete.push(id);
            }
        }
        entriesToDelete.forEach((id) => giphyRateLimit.requests.delete(id));
    }

    return true;
}

async function handleGifCommand(interaction, searchTerm, message) {
    try {
        // Check rate limit
        if (!checkRateLimit(interaction.user.id)) {
            await interaction.reply({
                content: `⏱️ Slow down! You can only use GIF commands ${giphyRateLimit.MAX_REQUESTS} times per minute.`,
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();
        const gifUrl = await getRandomGif(searchTerm);

        const embed = new EmbedBuilder()
            .setColor("#FF69B4")
            .setDescription(message)
            .setImage(gifUrl)
            .setTimestamp()
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await handleError(
            interaction,
            error,
            "API_ERROR",
            error.message || "Failed to fetch a GIF. Please try again later.",
        );
    }
}

async function handleSummon(interaction) {
    try {
        await interaction.deferReply();
        const target = interaction.options.getUser("user");
        const gifUrl = await getRandomGif("summon");

        const embed = new EmbedBuilder()
            .setColor("#FF69B4")
            .setDescription(`${target} has been summoned by ${interaction.user}!`)
            .setImage(gifUrl)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await handleError(interaction, error, "COMMAND_EXECUTION", "Failed to summon user.");
    }
}

async function handleKill(interaction) {
    try {
        await interaction.deferReply();
        const target = interaction.options.getUser("user");

        if (target.id === interaction.user.id) {
            await handleError(
                interaction,
                new Error("Self-targeting not allowed"),
                "VALIDATION",
                "You cannot kill yourself!",
            );
            return;
        }

        const gifUrl = await getRandomGif("kill");
        const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription(`${interaction.user} killed ${target}! RIP 💀`)
            .setImage(gifUrl)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await handleError(
            interaction,
            error,
            "COMMAND_EXECUTION",
            "Failed to execute kill command.",
        );
    }
}
