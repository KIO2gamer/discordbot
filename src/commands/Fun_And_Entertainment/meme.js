const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { handleError } = require("../../utils/errorHandler");
const axios = require("axios");

// Configuration
const MEME_CONFIG = {
    API_URL: "https://meme-api.com/gimme",
    MAX_RETRIES: 5,
    INITIAL_RETRY_DELAY: 500, // ms
    REQUEST_TIMEOUT: 8000, // ms
};

module.exports = {
    cooldown: 10,
    description_full:
        "Get ready to laugh! This command fetches and displays a random, SFW meme from the vast expanse of the internet.",
    usage: "/meme",
    examples: ["/meme"],

    data: new SlashCommandBuilder().setName("meme").setDescription("Send a random meme."),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const meme = await fetchMemeWithRetry();

            if (isValidMeme(meme)) {
                const memeEmbed = new EmbedBuilder()
                    .setTitle(
                        meme.title.length > 256 ? meme.title.slice(0, 253) + "..." : meme.title,
                    )
                    .setImage(meme.url)
                    .setColor("#00ff00")
                    .setFooter({
                        text: `From r/${meme.subreddit || "memes"} • Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                if (meme.author) {
                    memeEmbed.setDescription(`Posted by u/${meme.author}`);
                }

                await interaction.editReply({ embeds: [memeEmbed] });
            } else {
                await interaction.editReply(
                    "⚠️ Could not fetch a suitable meme at this time. Please try again later.",
                );
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "API_ERROR",
                "Failed to fetch meme. The API might be temporarily unavailable.",
            );
        }
    },
};

/**
 * Fetches a meme with exponential backoff retry logic
 */
async function fetchMemeWithRetry() {
    let lastError;

    for (let attempt = 0; attempt < MEME_CONFIG.MAX_RETRIES; attempt++) {
        try {
            const response = await axios.get(MEME_CONFIG.API_URL, {
                timeout: MEME_CONFIG.REQUEST_TIMEOUT,
                headers: {
                    "User-Agent": "Discord-Bot-Meme-Fetcher",
                },
            });

            if (response.status === 200 && response.data) {
                const meme = response.data;

                // Validate and return if suitable
                if (isValidMeme(meme)) {
                    return meme;
                }
            }
        } catch (error) {
            lastError = error;

            // Don't retry on 4xx errors (client errors)
            if (error.response && error.response.status >= 400 && error.response.status < 500) {
                throw error;
            }

            // Apply exponential backoff for other errors
            if (attempt < MEME_CONFIG.MAX_RETRIES - 1) {
                const delay = MEME_CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, attempt);
                await sleep(delay);
            }
        }
    }

    throw lastError || new Error("Failed to fetch valid meme after all retries");
}

/**
 * Validates meme data structure and content
 */
function isValidMeme(meme) {
    if (!meme || typeof meme !== "object") return false;
    if (meme.nsfw === true) return false;
    if (!meme.title || typeof meme.title !== "string") return false;
    if (!meme.url || typeof meme.url !== "string") return false;

    // Validate URL format
    try {
        new URL(meme.url);
    } catch {
        return false;
    }

    // Check for image URL
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const hasImageExtension = imageExtensions.some((ext) => meme.url.toLowerCase().includes(ext));

    return hasImageExtension;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
