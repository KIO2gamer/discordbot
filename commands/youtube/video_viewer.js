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

    async execute(interaction) {
        await interaction.deferReply()
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
                    pageToken: nextPageToken || prevPageToken,
                })

                const results = response.data
                nextPageToken = results.nextPageToken
                prevPageToken = results.prevPageToken

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle(`YouTube Search Results for "${query}"`)
                    .setDescription(`Page ${Math.max(1, currentPage)}`)

                results.items.forEach((item, index) => {
                    embed.addFields(
                        {
                            name: `${Math.max(0, (currentPage - 1) * pageSize) + index + 1}. ${item.snippet.title}`,
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
                        },
                        {
                            name: 'Description',
                            value: `${item.snippet.description.slice(0, 200)}...`,
                            inline: false,
                        },
                        // Add the separator field here
                        {
                            name: '\u200B',
                            value: '---------------------------------------------------------------------------------',
                            inline: false,
                        }
                    )
                })

                // Create buttons dynamically based on available pages
                const buttons = []
                if (prevPageToken) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
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
                const row = new ActionRowBuilder().addComponents(buttons)

                return {
                    embeds: [embed],
                    components: buttons.length > 0 ? [row] : [],
                }
            } catch (error) {
                console.error('Error fetching YouTube results:', error)
                return { content: 'An error occurred while searching YouTube.' }
            }
        }

        // Send initial message
        const message = await interaction.editReply(await displayResults())

        // Create button collector
        const collector = message.createMessageComponentCollector({
            time: 60000,
        })

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: 'You cannot use these buttons.',
                    ephemeral: true,
                })
            }

            if (i.customId === 'prev') {
                currentPage--
            } else if (i.customId === 'next') {
                currentPage++
            }

            await i.update(await displayResults())
        })

        collector.on('end', () => {
            message.edit({ components: [] })
        })
    },
}
