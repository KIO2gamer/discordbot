const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js')

module.exports = {
    description_full:
        "Click the button... if you dare. Will you defuse the bomb or face the explosive consequences? Don't worry, it's all in good fun (or is it?).",
    usage: '/donottouch',
    examples: ['/donottouch'],
    data: new SlashCommandBuilder()
        .setName('donottouch')
        .setDescription('YOUR PC WILL GO BOOM-BOOM.'),

    async execute(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('defuse')
                .setLabel('Defuse')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('detonate')
                .setLabel('Detonate')
                .setStyle(ButtonStyle.Danger)
        )

        await interaction.reply({
            content: `Oh? So you found the secret? Well well well, it's time for your PC to blow up.\nAnd also your Discord account is being reported for finding it illegally ||joke btw||\n||or maybe for real?||`,
            components: [row],
        })

        const filter = (i) =>
            i.customId === 'defuse' || i.customId === 'detonate'
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 15000,
        })

        collector.on('collect', async (i) => {
            if (i.customId === 'defuse') {
                await i.update({
                    content:
                        'Phew! You defused the bomb. Your PC is safe... for now.',
                    components: [],
                })
            } else {
                await i.update({
                    content:
                        'BOOM! Your PC just exploded! 💥 Just kidding... or maybe not? 😜',
                    components: [],
                })
            }
        })

        collector.on('end', (collected) => {
            if (!collected.size) {
                interaction.editReply({
                    content:
                        'Time is up! The bomb has been defused automatically. Your PC is safe... for now.',
                    components: [],
                })
            }
        })
    },
}
