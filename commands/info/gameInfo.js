const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const axios = require('axios')

module.exports = {
    description_full:
        'Fetches information about a video game from the IGDB API. This can include the game’s description, genres, release date, platforms, and a link to its page on IGDB.',
    usage: '/gameinfo <search>',
    examples: ['/gameinfo The Witcher 3', '/gameinfo "Grand Theft Auto V"'],
    data: new SlashCommandBuilder()
        .setName('gameinfo')
        .setDescription('Fetches game information')
        .addStringOption((option) =>
            option
                .setName('search')
                .setDescription('Name of the game')
                .setRequired(true)
        ),

    async execute(interaction) {
        const gameName = interaction.options.getString('search')
        const clientId = process.env.IGDB_CLIENT_ID
        const accessToken = process.env.IGDB_ACCESS_TOKEN

        try {
            // Search for the game using IGDB API
            const searchResponse = await axios.post(
                'https://api.igdb.com/v4/games',
                `search "${gameName}"; fields name, slug; limit 1;`,
                {
                    headers: {
                        'Client-ID': clientId,
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            )

            if (searchResponse.data.length > 0) {
                const gameSlug = searchResponse.data[0].slug

                // Fetch game details using the game slug
                const gameResponse = await axios.post(
                    'https://api.igdb.com/v4/games',
                    `fields name, summary, genres.name, first_release_date, platforms.name, rating, url; where slug = "${gameSlug}";`,
                    {
                        headers: {
                            'Client-ID': clientId,
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                )

                const game = gameResponse.data[0]

                // Create and send the embed message
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(game.name)
                    .setDescription(game.summary || 'No description available')
                    .addFields(
                        {
                            name: 'Genres',
                            value: game.genres
                                ? game.genres.map((g) => g.name).join(', ')
                                : 'N/A',
                            inline: true,
                        },
                        {
                            name: 'Release Date',
                            value: game.first_release_date
                                ? new Date(
                                      game.first_release_date * 1000
                                  ).toLocaleDateString()
                                : 'Unknown',
                            inline: true,
                        },
                        {
                            name: 'Rating',
                            value: game.rating
                                ? game.rating.toFixed(2)
                                : 'No rating available',
                            inline: true,
                        },
                        {
                            name: 'Platforms',
                            value: game.platforms
                                ? game.platforms.map((p) => p.name).join(', ')
                                : 'N/A',
                            inline: true,
                        },
                        {
                            name: 'IGDB Page',
                            value: `[Link](${game.url})`,
                            inline: true,
                        }
                    )
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL({
                            dynamic: true,
                        }),
                    })
                    .setTimestamp()

                await interaction.reply({ embeds: [embed] })
            } else {
                await interaction.reply('No game found with that name.')
            }
        } catch (error) {
            console.error(error)
            await interaction.reply(
                'An error occurred while fetching game info.'
            )
        }
    },
}
