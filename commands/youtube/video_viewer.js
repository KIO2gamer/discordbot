const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const yt = require('youtube-search-api')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('youtube')
        .setDescription('Search YouTube for videos.')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The search query for YouTube videos.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const query = interaction.options.getString('query')

        try {
            const videos = await yt.GetListByKeyword(query, false, 5)

            if (videos.items.length === 0) {
                await interaction.reply({
                    content: 'No videos found for that query.',
                })
                return
            }

            const mainEmbed = new EmbedBuilder()
                .setTitle(`YouTube Search Results for "${query}"`)
                .setColor('#ff0000')
                .setDescription(
                    `Showing the top ${videos.items.length} results.`
                )

            await interaction.reply({ embeds: [mainEmbed] })

            for (let i = 0; i < videos.items.length; i++) {
                const video = videos.items[i]
                const embed = new EmbedBuilder()
                    .setTitle(video.title)
                    .setDescription(
                        `Channel: ${video.channelTitle}\nDuration: ${video.length.simpleText}`
                    )
                    .setColor('#ff0000')
                    .setURL(`https://www.youtube.com/watch?v=${video.id}`)
                    .setThumbnail(video.thumbnail.thumbnails[0].url)

                await interaction.channel.send({ embeds: [embed] })
            }
        } catch (error) {
            console.error('Error fetching YouTube results:', error)
            await interaction.reply({
                content:
                    'Oops, something went wrong while searching YouTube. Please try again later.',
            })
        }
    },
}
