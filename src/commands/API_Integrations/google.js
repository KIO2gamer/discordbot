const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const axios = require("axios");

// Constants for styling
const GOOGLE_COLORS = {
    blue: "#4285F4",
    red: "#EA4335",
    yellow: "#FBBC05",
    green: "#34A853",
};
const MAX_RESULTS = 3; // Reduced for cleaner output

module.exports = {
    cooldown: 10,
    description_full: "Searches Google and shows the top results in a clean format",
    usage: "/google <query>",
    examples: ["/google discord.js guide", "/google how to make pasta"],

    data: new SlashCommandBuilder()
        .setName("google")
        .setDescription("Search Google for information")
        .addStringOption((option) =>
            option
                .setName("query")
                .setDescription("What do you want to search for?")
                .setRequired(true),
        )
        .addBooleanOption((option) =>
            option
                .setName("private")
                .setDescription("Keep results visible only to you (default: true)")
                .setRequired(false),
        ),

    async execute(interaction) {
        const query = interaction.options.getString("query").trim();
        const isPrivate = interaction.options.getBoolean("private") ?? true;

        // Validate query
        if (query.length < 2) {
            await interaction.reply({
                content: "❌ Search query must be at least 2 characters long.",
                flags: require("discord.js").MessageFlags.Ephemeral,
            });
            return;
        }

        if (query.length > 2000) {
            await interaction.reply({
                content: "❌ Search query is too long (max 2000 characters).",
                flags: require("discord.js").MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ ephemeral: isPrivate });

        // Check API configuration
        const apiKey = process.env.GOOGLE_API_KEY;
        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!apiKey || !searchEngineId) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(GOOGLE_COLORS.red)
                        .setTitle("⚙️ Google Search Not Configured")
                        .setDescription(
                            "This command needs to be set up by the server admin first.",
                        ),
                ],
            });
        }

        try {
            // Perform search with timeout
            const baseUrl = "https://www.googleapis.com/customsearch/v1";
            const searchParams = {
                key: apiKey,
                cx: searchEngineId,
                q: query,
                num: MAX_RESULTS + 2, // Request extra results in case some are filtered
            };

            const response = await axios.get(baseUrl, {
                params: searchParams,
                timeout: 10000, // 10 second timeout
            });

            const results = response.data.items || [];

            // Handle no results
            if (results.length === 0) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(GOOGLE_COLORS.blue)
                            .setTitle("🔍 No results found")
                            .setDescription(
                                `Nothing found for: "${query}"\nTry different keywords or check your spelling.`,
                            )
                            .setThumbnail(
                                "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
                            ),
                    ],
                });
            }

            // Create the search results embed
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            const embed = new EmbedBuilder()
                .setColor(GOOGLE_COLORS.blue)
                .setTitle("🔍 Google Search Results")
                .setDescription(`Search query: **${query}**\n[View all results →](${searchUrl})`)
                .setThumbnail(
                    "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
                )
                .setFooter({
                    text: `${results.length} result${results.length !== 1 ? "s" : ""} found • Powered by Google`,
                    iconURL: "https://www.google.com/favicon.ico",
                })
                .setTimestamp();

            results.slice(0, MAX_RESULTS).forEach((item, index) => {
                let snippet = item.snippet || "No description available";
                snippet = snippet.replace(/(\r\n|\n|\r)/gm, " ").trim();

                // Truncate snippet if needed
                if (snippet.length > 150) {
                    snippet = snippet.substring(0, 150) + "...";
                }

                // Extract domain from URL
                const domain = new URL(item.link).hostname.replace("www.", "");

                // Add result as a field
                embed.addFields({
                    name: `${index + 1}. ${item.title}`,
                    value: `${snippet}\n[Visit](${item.link}) • *${domain}*`,
                    inline: false,
                });
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Google search error:", error);

            let errorMessage = "An error occurred while searching Google.";
            let errorTitle = "❌ Search Error";

            if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
                errorMessage = "The search request timed out. Please try again.";
                errorTitle = "⏱️ Request Timeout";
            } else if (error.response?.status === 429) {
                errorMessage = "Google API rate limit exceeded. Please try again in a moment.";
                errorTitle = "🔄 Rate Limited";
            } else if (error.response?.status === 403) {
                errorMessage = "Google API quota exceeded for today. Please try again tomorrow.";
                errorTitle = "📊 Quota Exceeded";
            } else if (error.response?.status === 400) {
                errorMessage = "Invalid search parameters. Please check your query and try again.";
                errorTitle = "📝 Invalid Query";
            }

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(GOOGLE_COLORS.red)
                        .setTitle(errorTitle)
                        .setDescription(errorMessage),
                ],
            });
            return;
        }
    },
};
