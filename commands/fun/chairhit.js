const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    description_full:
        'Express your frustration or excitement (or just cause some chaos) by yeeting a chair across the digital room.',
    usage: '/chairhit', // No parameters needed
    examples: ['/chairhit'],
    data: new SlashCommandBuilder()
        .setName('chairhit')
        .setDescription('yeet the chair fr'),

    async execute(interaction) {
        await interaction.reply(
            'https://tenor.com/view/chair-hit-throw-rigby-gif-17178150'
        )
    },
}
