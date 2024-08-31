const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    description_full:
        'Generates a random color and displays it along with its hexadecimal code.',
    usage: '/random_color',
    examples: ['/random_color'],
    data: new SlashCommandBuilder()
        .setName('random_color')
        .setDescription('Get a random color'),
    async execute(interaction) {
        const randomHex = Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, '0')

        // Build embed message
        const embed = new EmbedBuilder()
            .setColor(`#${randomHex}`)
            .setTitle('Random Color!')
            .setDescription(
                `**Here is your random hex color code:** \n \`#${randomHex}\``
            )
            .setThumbnail(`https://www.colorhexa.com/${randomHex}.png`)
        await interaction.reply({ embeds: [embed], ephemeral: true })
    },
}
