const {
    ActionRowBuilder,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
} = require("discord.js");

const axios = require("axios");
const { handleError } = require("../../utils/errorHandler");

// Enhanced color scheme
const COLORS = {
    PRIMARY: "#5865F2",
    SUCCESS: "#57F287",
    INFO: "#3498DB",
};

// Steam API cache to avoid rate limiting
const steamAppListCache = {
    data: null,
    timestamp: 0,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
};

module.exports = {
    cooldown: 10,
    description_full:
        "Get detailed information about video games from Steam, including release date, ratings, platforms, genres, pricing, and more. Powered by Steam Store API.",
    usage: "/game_info <title>",
    examples: [
        '/game_info "The Legend of Zelda"',
        '/game_info "Red Dead Redemption 2"',
        '/game_info "Minecraft"',
        '/game_info "Portal 2"',
    ],

    data: new SlashCommandBuilder()
        .setName("game_info")
        .setDescription("Get detailed information about a video game")
        .addStringOption((option) =>
            option
                .setName("title")
                .setDescription("The title of the game to search for")
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(100),
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const gameTitle = interaction.options.getString("title").trim();

            try {
                // Search for games on Steam
                const searchResults = await searchSteamGames(gameTitle);

                if (!searchResults || searchResults.length === 0) {
                    await handleError(
                        interaction,
                        new Error("No games found"),
                        "NOT_FOUND",
                        `No games found on Steam matching "${gameTitle}". Try using a different search term or check the spelling.`,
                    );
                    return;
                }

                // Check for exact match first
                const exactMatch = searchResults.find(
                    (game) => game.name.toLowerCase() === gameTitle.toLowerCase(),
                );

                if (exactMatch) {
                    const gameDetails = await getSteamGameDetails(exactMatch.appid);
                    if (gameDetails) {
                        const embed = createGameEmbed(gameDetails);
                        await interaction.editReply({ embeds: [embed] });
                        return;
                    }
                }

                // If only one result, show it directly
                if (searchResults.length === 1) {
                    const gameDetails = await getSteamGameDetails(searchResults[0].appid);
                    if (gameDetails) {
                        const embed = createGameEmbed(gameDetails);
                        await interaction.editReply({ embeds: [embed] });
                        return;
                    }
                }

                // Multiple results: Create selection menu
                const options = searchResults.slice(0, 25).map((game) => ({
                    label: game.name.substring(0, 100),
                    description: `Steam App ID: ${game.appid}`,
                    value: String(game.appid),
                    emoji: "🎮",
                }));

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("select_steam_game")
                        .setPlaceholder("Select a game from Steam")
                        .addOptions(options),
                );

                const listEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: "Steam Search Results",
                        iconURL: "https://cdn.cloudflare.steamstatic.com/store/favicon.ico",
                    })
                    .setTitle("🔍 Multiple Games Found")
                    .setDescription(
                        `Found **${searchResults.length}** game${searchResults.length > 1 ? "s" : ""} matching "${gameTitle}"\n` +
                            `Select the correct game from the dropdown below:\n` +
                            `${"-".repeat(40)}`,
                    )
                    .setColor(COLORS.INFO)
                    .setFooter({
                        text: "Selection expires in 30 seconds • Powered by Steam",
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                const embed_response = await interaction.editReply({
                    embeds: [listEmbed],
                    components: [row],
                });

                // Create collector for selection
                const collector = embed_response.createMessageComponentCollector({
                    filter: (i) =>
                        i.customId === "select_steam_game" && i.user.id === interaction.user.id,
                    time: 30000,
                    max: 1,
                });

                collector.on("collect", async (i) => {
                    await i.deferUpdate();
                    const appid = parseInt(i.values[0]);
                    const gameDetails = await getSteamGameDetails(appid);

                    if (gameDetails) {
                        const embed = createGameEmbed(gameDetails);
                        await interaction.editReply({
                            embeds: [embed],
                            components: [],
                        });
                    } else {
                        await handleError(
                            interaction,
                            new Error("Failed to load game details"),
                            "API_ERROR",
                            "Failed to load game details from Steam. The game might be region-locked or unavailable.",
                        );
                    }
                });

                collector.on("end", async (collected) => {
                    if (collected.size === 0) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setTitle("⏱️ Selection Timed Out")
                            .setDescription(
                                "No selection was made within 30 seconds. Please run the command again.",
                            )
                            .setColor(COLORS.PRIMARY);

                        await interaction.editReply({
                            embeds: [timeoutEmbed],
                            components: [],
                        });
                    }
                });
            } catch (error) {
                if (error.response?.status === 429) {
                    await handleError(
                        interaction,
                        error,
                        "RATE_LIMIT",
                        "Steam API rate limit reached. Please try again in a few minutes.",
                    );
                } else {
                    await handleError(
                        interaction,
                        error,
                        "API_ERROR",
                        "Failed to fetch game data from Steam. Please try again later.",
                    );
                }
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while processing the game information request.",
            );
        }
    },
};

// Helper function to search Steam games (Store search first, fallback to AppList cache)
async function searchSteamGames(searchTerm) {
    const UA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    try {
        // Primary: Steam Store search API — faster and more reliable
        const storeResp = await axios.get("https://store.steampowered.com/api/storesearch/", {
            params: { term: searchTerm, cc: "us", l: "english" },
            headers: { "User-Agent": UA, Accept: "application/json" },
            timeout: 10000,
        });

        if (storeResp?.data?.items?.length) {
            // Normalize results into { appid, name }
            return storeResp.data.items
                .map((item) => ({ appid: item.id, name: item.name || item.title }))
                .slice(0, 50);
        }

        // Fallback: Use ISteamApps GetAppList (cached)
        const now = Date.now();
        if (!steamAppListCache.data || now - steamAppListCache.timestamp > steamAppListCache.ttl) {
            const appListResp = await axios.get(
                "https://api.steampowered.com/ISteamApps/GetAppList/v2/",
                {
                    headers: { "User-Agent": UA, Accept: "application/json" },
                    timeout: 15000,
                },
            );
            steamAppListCache.data = appListResp.data?.applist?.apps || [];
            steamAppListCache.timestamp = now;
        }

        const searchLower = searchTerm.toLowerCase();
        const matches = (steamAppListCache.data || [])
            .filter((app) => app.name && app.name.toLowerCase().includes(searchLower))
            .slice(0, 50);

        return matches;
    } catch (error) {
        console.error("Error searching Steam games:", error?.response?.status || error.message);
        throw new Error("Failed to search Steam games");
    }
}

// Helper function to get Steam game details
async function getSteamGameDetails(appid) {
    try {
        const response = await axios.get(`https://store.steampowered.com/api/appdetails`, {
            params: {
                appids: appid,
                cc: "us", // Country code for pricing
                l: "english", // Language
            },
            timeout: 10000,
        });

        const data = response.data[appid];

        if (!data || !data.success) {
            return null;
        }

        return data.data;
    } catch (error) {
        console.error(`Error fetching Steam game details for ${appid}:`, error.message);
        return null;
    }
}

// Helper function to create game embed
function createGameEmbed(gameData) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setAuthor({
            name: "Steam Game Information",
            iconURL: "https://cdn.cloudflare.steamstatic.com/store/favicon.ico",
        })
        .setTitle(`🎮 ${gameData.name}`);

    // Set thumbnail/image
    if (gameData.header_image) {
        embed.setImage(gameData.header_image);
    }

    // Add description
    if (gameData.short_description) {
        const description =
            gameData.short_description.length > 300
                ? gameData.short_description.substring(0, 297) + "..."
                : gameData.short_description;
        embed.setDescription(`${description}\n${"-".repeat(40)}`);
    }

    // Basic information
    const basicInfo = [];

    if (gameData.release_date) {
        const releaseText = gameData.release_date.coming_soon
            ? `🔜 **Coming Soon:** ${gameData.release_date.date}`
            : `📅 **Released:** ${gameData.release_date.date}`;
        basicInfo.push(releaseText);
    }

    if (gameData.type) {
        basicInfo.push(`📦 **Type:** ${gameData.type}`);
    }

    if (gameData.developers?.length) {
        basicInfo.push(`👨‍💻 **Developers:** ${gameData.developers.join(", ")}`);
    }

    if (gameData.publishers?.length) {
        basicInfo.push(`🏢 **Publishers:** ${gameData.publishers.join(", ")}`);
    }

    if (basicInfo.length > 0) {
        embed.addFields({
            name: "📋 Game Information",
            value: basicInfo.join("\n"),
            inline: false,
        });
    }

    // Genres and Categories
    const genreInfo = [];

    if (gameData.genres?.length) {
        genreInfo.push(`🎭 **Genres:** ${gameData.genres.map((g) => g.description).join(", ")}`);
    }

    if (gameData.categories?.length) {
        const mainCategories = gameData.categories
            .slice(0, 5)
            .map((c) => c.description)
            .join(", ");
        genreInfo.push(`🏷️ **Features:** ${mainCategories}`);
    }

    if (genreInfo.length > 0) {
        embed.addFields({
            name: "🎨 Categories",
            value: genreInfo.join("\n"),
            inline: false,
        });
    }

    // Platform support
    const platforms = [];
    if (gameData.platforms) {
        if (gameData.platforms.windows) platforms.push("🪟 Windows");
        if (gameData.platforms.mac) platforms.push("🍎 macOS");
        if (gameData.platforms.linux) platforms.push("🐧 Linux");
    }

    if (platforms.length > 0) {
        embed.addFields({
            name: "💻 Platforms",
            value: platforms.join(" • "),
            inline: true,
        });
    }

    // Pricing information
    if (gameData.is_free) {
        embed.addFields({
            name: "💰 Price",
            value: "**Free to Play**",
            inline: true,
        });
    } else if (gameData.price_overview) {
        const price = gameData.price_overview;
        let priceText = `**${price.final_formatted}**`;

        if (price.discount_percent > 0) {
            priceText += `\n~~${price.initial_formatted}~~ **-${price.discount_percent}% OFF**`;
        }

        embed.addFields({
            name: "💰 Price",
            value: priceText,
            inline: true,
        });
    }

    // Requirements
    if (gameData.pc_requirements?.minimum) {
        const minReqs = gameData.pc_requirements.minimum
            .replace(/<br>/gi, "\n")
            .replace(/<[^>]*>/g, "")
            .substring(0, 300);

        embed.addFields({
            name: "⚙️ Minimum Requirements",
            value: minReqs.length === 300 ? minReqs + "..." : minReqs,
            inline: false,
        });
    }

    // Metacritic score
    if (gameData.metacritic?.score) {
        embed.addFields({
            name: "⭐ Metacritic Score",
            value: `**${gameData.metacritic.score}/100**\n[View on Metacritic](${gameData.metacritic.url})`,
            inline: true,
        });
    }

    // Steam links
    const links = [
        `[🛒 Store Page](https://store.steampowered.com/app/${gameData.steam_appid})`,
        `[📊 SteamDB](https://steamdb.info/app/${gameData.steam_appid})`,
    ];

    if (gameData.website) {
        links.push(`[🌐 Website](${gameData.website})`);
    }

    embed.addFields({
        name: "🔗 Links",
        value: links.join(" • "),
        inline: false,
    });

    embed
        .setFooter({
            text: `Steam App ID: ${gameData.steam_appid} • Powered by Steam Store API`,
            iconURL: "https://cdn.cloudflare.steamstatic.com/store/favicon.ico",
        })
        .setTimestamp();

    return embed;
}
