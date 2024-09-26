const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyricwhiz')
        .setDescription('Play a lyric guessing game!'),

    async execute(interaction) {
        await interaction.deferReply()

        try {
            // Fetch a random song from the Lyrics.ovh API
            const response = await fetch('https://api.lyrics.ovh/random')
            const data = await response.json()

            const { artist, title, lyrics } = data

            // Extract a random line from the lyrics
            const lines = lyrics
                .split('\n')
                .filter((line) => line.trim() !== '')
            const randomLine = lines[Math.floor(Math.random() * lines.length)]

            const questionEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Lyric Whiz')
                .setDescription(`Guess the song from this lyric:\n\n"${randomLine}"`)
                .setFooter({ text: 'You have 30 seconds to guess!' })

            await interaction.editReply({ embeds: [questionEmbed] })

            const filter = (m) => m.author.id === interaction.user.id
            const collector = interaction.channel.createMessageCollector({
                filter,
                time: 30000
            })

            collector.on('collect', async (message) => {
                const guess = message.content.toLowerCase()
                const correctTitle = title.toLowerCase()
                const correctArtist = artist.toLowerCase()

                if (
                    guess.includes(correctTitle) ||
                    guess.includes(correctArtist)
                ) {
                    const correctEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('Congratulations!')
                        .setDescription(`You got it right!\nThe song is "${title}" by ${artist}.`)

                    await interaction.followUp({ embeds: [correctEmbed] })
                    collector.stop()
                }
            })

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    const timeUpEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Time\'s up!')
                        .setDescription(`The correct answer was "${title}" by ${artist}.`)

                    await interaction.followUp({ embeds: [timeUpEmbed] })
                }
            })
        } catch (error) {
            console.error('Error in lyricwhiz command:', error)
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription('Sorry, there was an error while trying to start the game. Please try again later.')

            await interaction.editReply({ embeds: [errorEmbed] })
        }
    }
}