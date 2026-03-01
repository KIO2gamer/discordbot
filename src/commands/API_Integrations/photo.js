const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 10,
    description_full:
        "Searches for and displays photos from Pexels based on your query. You can customize the number of photos, orientation, size, and even request a random photo.",
    usage: "/photo <query:search_term> [count:1-5] [orientation:landscape/portrait/square] [size:small/medium/large] [random:true/false]",
    examples: [
        "/photo query:cats count:3",
        "/photo query:mountains orientation:landscape",
        "/photo query:flowers random:true",
    ],

    data: new SlashCommandBuilder()
        .setName("photo")
        .setDescription("Search for a photo.")
        .addStringOption((option) =>
            option.setName("query").setDescription("The search query").setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("count")
                .setDescription("Number of photos to fetch (1-5)")
                .setMinValue(1)
                .setMaxValue(5),
        )
        .addStringOption((option) =>
            option
                .setName("orientation")
                .setDescription("Photo orientation")
                .addChoices(
                    { name: "Landscape", value: "landscape" },
                    { name: "Portrait", value: "portrait" },
                    { name: "Square", value: "square" },
                ),
        )
        .addStringOption((option) =>
            option
                .setName("size")
                .setDescription("Photo size")
                .addChoices(
                    { name: "Small", value: "small" },
                    { name: "Medium", value: "medium" },
                    { name: "Large", value: "large" },
                ),
        )
        .addBooleanOption((option) =>
            option.setName("random").setDescription("Fetch a random photo"),
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const query = interaction.options.getString("query");
        const count = interaction.options.getInteger("count") || 1;
        const orientation = interaction.options.getString("orientation");
        const size = interaction.options.getString("size");

        const apiKey = process.env.PEXELS_API_KEY;
        const baseUrl = "https://api.pexels.com/v1/search";
        const params = new URLSearchParams({
            query: query,
            per_page: count.toString(),
        });

        if (orientation) {
            params.append("orientation", orientation);
        }

        if (size) {
            params.append("size", size);
        }

        const url = `${baseUrl}?${params.toString()}`;

        // Check if API key is configured
        if (!apiKey) {
            return handleError(
                interaction,
                new Error("Photo search service is not properly configured. Missing API key."),
                "CONFIGURATION",
            );
        }

        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: apiKey,
                },
            });
            const data = await response.json();

            if (data.photos && data.photos.length > 0) {
                const embeds = data.photos.map((photo) => {
                    return new EmbedBuilder()
                        .setTitle(`Photo by ${photo.photographer}`)
                        .setImage(photo.src.original)
                        .setURL(photo.url);
                });

                await interaction.editReply({ embeds });
            } else {
                await interaction.editReply("Sorry, I could not find any photos for that query.");
            }
        } catch (error) {
            handleError(interaction, error);
        }
    },
};
