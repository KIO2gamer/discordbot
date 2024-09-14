const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const axios = require('axios')

module.exports = {
    description_full:
        'Searches Google for the given query and displays the top results.',
    usage: '/google <query>',
    examples: [
        '/google discord bot tutorial',
        '/google best restaurants near me',
    ],
    data: new SlashCommandBuilder()
        .setName('google')
        .setDescription('Search Google for a query')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The search query')
                .setRequired(true)
        ),

    async execute(interaction) {
        const query = interaction.options.getString('query')
        const apiKey = process.env.GOOGLE_API_KEY
        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID

        if (!apiKey || !searchEngineId) {
            console.error('Google API key or Search Engine ID not found!')
            return interaction.reply({
                content:
                    'This command is not configured properly. Please contact the server administrator.',
                ephemeral: true,
            })
        }

        try {
            const response = await axios.get(
                'https://www.googleapis.com/customsearch/v1',
                {
                    params: {
                        key: apiKey,
                        cx: searchEngineId,
                        q: query,
                    },
                }
            )

            const results = response.data.items.slice(0, 5) // Show top 3 results

            if (results.length === 0) {
                return interaction.reply({
                    content: 'No results found for your query.',
                    ephemeral: true,
                })
            }

            const embed = new EmbedBuilder()
                .setColor('#4285F4') // Google's blue color
                .setTitle(`Search Results for "${query}"`)

            results.forEach((item, index) => {
                embed.addFields({
                    name: `${index + 1}. ${item.title}`,
                    value: `${item.link}\n${item.snippet.replace(/(\r\n|\n|\r)/gm, '')}`, // Remove line breaks from snippet
                })
            })

            await interaction.reply({ embeds: [embed], ephemeral: true })
        } catch (error) {
            console.error('Error performing Google search:', error)
            await interaction.reply({
                content:
                    'An error occurred while performing the search. Please try again later.',
                ephemeral: true,
            })
        }
    },
}
