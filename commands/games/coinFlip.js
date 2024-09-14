const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    description_full:
        'The bot virtually flips a coin and reveals the result (Heads or Tails). You can also bet on the outcome!',
    usage: '/coinflip [bet]',
    examples: ['/coinflip', '/coinflip heads', '/coinflip tails'],
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin and bet on the outcome!')
        .addStringOption((option) =>
            option
                .setName('bet')
                .setDescription('Bet on heads or tails')
                .setRequired(false)
                .addChoices(
                    { name: 'Heads', value: 'heads' },
                    { name: 'Tails', value: 'tails' }
                )
        ),
    async execute(interaction) {
        const bet = interaction.options.getString('bet')?.toLowerCase()
        const result = Math.random() < 0.5 ? 'heads' : 'tails'
        let imageMedia = ''
        if (result === 'heads') {
            imageMedia = 'https://i.imgur.com/HavOS7J.png'
        } else {
            imageMedia = 'https://i.imgur.com/u1pmQMV.png'
        }

        let description = `The coin landed on **${result.charAt(0).toUpperCase() + result.slice(1)}**!`

        if (bet) {
            if (bet === result) {
                description += '\n\nCongratulations! You guessed correctly! 🎉'
            } else {
                description += '\n\nSorry, better luck next time! 😔'
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Coin Flip')
            .setDescription(description)
            .setThumbnail(imageMedia)

        await interaction.reply({ embeds: [embed] })
    },
}
