const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    description_full:
        'Fetches information about a video game from the Giant Bomb API. This can include the game’s description, genres, release date, platforms, and a link to its page on Giant Bomb.',
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

        try {
            // Fetch game information from Giant Bomb API
            const response = await fetch(
                `https://www.giantbomb.com/api/search/?api_key=${process.env.GIANT_BOMB_API_KEY}&format=json&query=${encodeURIComponent(gameName)}&resources=game`
            )
            const data = await response.json()

            if (data.results && data.results.length > 0) {
                const game = data.results[0]

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(game.name)
                    .setDescription(game.deck || 'No description available')
                    .setThumbnail(game.image ? game.image.small_url : null)
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
                            value: game.original_release_date || 'Unknown',
                            inline: true,
                        },
                        {
                            name: 'Rating',
                            value: game.original_game_rating
                                ? game.original_game_rating
                                      .map((r) => r.name)
                                      .join(', ')
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
                            name: 'Site Detail URL',
                            value: `[Link](${game.site_detail_url})`,
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
