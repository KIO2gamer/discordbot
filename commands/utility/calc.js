const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const math = require('mathjs') // Import mathjs

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calculate')
        .setDescription('Perform a calculation using mathjs.')
        .addStringOption((option) =>
            option
                .setName('expression')
                .setDescription(
                    'The mathematical expression to calculate (e.g., 2 + 5 * 3)'
                )
                .setRequired(true)
        ),
    description_full: 'Perform mathematical calculations using the mathjs library. This command can handle a wide range of mathematical operations and functions.',
    usage: '/calculate <expression>',
    examples: [
        '/calculate 2 + 2',
        '/calculate sin(45) * cos(30)',
        '/calculate sqrt(16) + log(100)',
    ],
    async execute(interaction) {
        const expression = interaction.options.getString('expression')

        try {
            // Safely evaluate the expression using mathjs
            const result = math.evaluate(expression)

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🧮 Calculation Result')
                .addFields(
                    {
                        name: 'Expression:',
                        value: `\`${expression}\``,
                        inline: false,
                    },
                    { name: 'Result:', value: `\`${result}\``, inline: false }
                )
                .setTimestamp()

            await interaction.reply({ embeds: [embed] })
        } catch (error) {
            console.error('Error calculating expression:', error)
            await interaction.reply({
                content:
                    'Invalid mathematical expression. Please check your input.',
                ephemeral: true,
            })
        }
    },
}