const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    description_full:
        'This command simulates a dice roll. It uses a random number generator to generate a number between 1 and 6 (inclusive) and displays the corresponding dice face in an embedded message.',
    usage: '/roll',
    examples: ['/roll'],
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll a dice.'),

    async execute(interaction) {
        const sides = 6 // You can customize the number of sides
        const roll = Math.floor(Math.random() * sides) + 1

        // URLs for dice images
        const diceImages = {
            1: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Dice-1-b.svg/1200px-Dice-1-b.svg.png',
            2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Dice-2-b.svg/1200px-Dice-2-b.svg.png',
            3: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Dice-3-b.svg/1200px-Dice-3-b.svg.png',
            4: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Dice-4-b.svg/1200px-Dice-4-b.svg.png',
            5: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Dice-5-b.svg/1200px-Dice-5-b.svg.png',
            6: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Dice-6-b.svg/1200px-Dice-6-b.svg.png',
        }

        const rollEmbed = new EmbedBuilder()
            .setTitle(`You rolled a ${roll}!`)
            .setColor('#00ff00')
            .setImage(diceImages[roll]) // Add the dice image URL
            .setFooter({
                text: `Executed by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp()

        await interaction.reply({ embeds: [rollEmbed] })
    },
}
