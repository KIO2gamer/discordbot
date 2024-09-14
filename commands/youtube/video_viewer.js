const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js')
const { google } = require('googleapis')
require('dotenv').config()

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API,
})

const pageSize = 5 // Number of results per page

module.exports = {
    data: new SlashCommandBuilder()
        .setName('youtube-search')
        .setDescription('Search for YouTube videos')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The search query')
                .setRequired(true)
        ),
    description_full: 'Search for YouTube videos and display results with pagination.',
    usage: '/youtube-search <query>',
    examples: [
        '/youtube-search cute cats',
        '/youtube-search coding tutorials',
        '/youtube-search latest news'
    ],

    async execute(interaction) {
        await interaction.deferReply({ content: 'Searching YouTube...' })
        const query = interaction.options.getString('query')
        let currentPage = 1
        let nextPageToken = ''
        let prevPageToken = ''

        // Function to fetch and display results
        const displayResults = async () => {
            try {
                const response = await youtube.search.list({
                    part: 'snippet',
                    q: query,
                    type: 'video',
                    maxResults: pageSize,
                    pageToken: nextPageToken || prevPageToken || '', // Handle empty tokens
                })

                const results = response.data
                nextPageToken = results.nextPageToken || ''
                prevPageToken =
                    currentPage > 1 ? results.prevPageToken || '' : ''

                // Handle case when there are no results
                if (results.items.length === 0) {
                    return {
                        content: `No results found for "${query}".`,
                        embeds: [],
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle(`YouTube Search Results for "${query}"`)
                    .setDescription(`Page ${currentPage}`)

                results.items.forEach((item, index) => {
                    embed.addFields(
                        {
                            name: `${(currentPage - 1) * pageSize + index + 1}. ${item.snippet.title}`,
                            value: `[Watch Video](https://www.youtube.com/watch?v=${item.id.videoId})`,
                        },
                        {
                            name: 'Channel',
                            value: item.snippet.channelTitle,
                            inline: true,
                        },
                        {
                            name: 'Published',
                            value: new Date(
                                item.snippet.publishedAt
                            ).toLocaleDateString(),
                            inline: true,
                        }
                    )
                })

                // Create buttons based on available page tokens
                const buttons = []
                if (prevPageToken) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentPage === 1) // Disable 'Previous' on first page
                    )
                }
                if (nextPageToken) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                    )
                }

                const row =
                    buttons.length > 0
                        ? new ActionRowBuilder().addComponents(buttons)
                        : null

                return {
                    embeds: [embed],
                    components: row ? [row] : [],
                }
            } catch (error) {
                console.error('Error fetching YouTube results:', error)
                return {
                    content: 'An error occurred while searching YouTube.',
                    embeds: [],
                    components: [],
                }
            }
        }

        // Send initial message with the first page of results
        const message = await interaction.editReply(await displayResults())

        // Create button collector for pagination
        const collector = message.createMessageComponentCollector({
            time: 60000, // Collector lasts for 60 seconds
        })

        collector.on('collect', async (i) => {
            // Ensure the user interacting with the buttons is the original one
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content:
                        'You are not allowed to interact with these buttons.',
                    ephemeral: true,
                })
            }

            // Update the page tokens and current page
            if (i.customId === 'prev') {
                currentPage--
                prevPageToken = results.prevPageToken
            } else if (i.customId === 'next') {
                currentPage++
                nextPageToken = results.nextPageToken
            }

            // Update the message with the new page of results
            await i.update(await displayResults())
        })

        collector.on('end', () => {
            message.edit({ components: [] }).catch(console.error) // Remove buttons after the collector ends
        })
    },
}