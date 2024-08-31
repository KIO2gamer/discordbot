const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    description_full:
        'Shows an embed acknowledging and listing the contributors who helped create the bot, linking their Discord usernames to their IDs.',
    usage: '/credits',
    examples: ['/credits'],
    data: new SlashCommandBuilder()
        .setName('credits')
        .setDescription('Shows an embed of users who helped make this bot.'),

    async execute(interaction) {
        const contributors = [
            { command: 'steel', name: 'steeles.0', id: '1271082993427021825' },
            {
                command: 'koifish',
                name: 'hallow_spice',
                id: '1271082992953069570',
            },
            {
                command: 'donottouch',
                name: 'umbree_on_toast',
                id: '1271082992953069576',
            },
            {
                command: 'rickroll',
                name: 'flashxdfx',
                id: '1271082992953069573',
            },
            { command: 'summon', name: 'eesmal', id: '1271082993427021826' },
            { command: 'snipe', name: 'na51f', id: '1271082993427021824' },
            { command: 'photo', name: 'spheroidon', id: '1271082994102440083' },
            { command: 'skibidi', name: 'zenoz231', id: '1271082992953069577' },
            {
                command: 'quokka',
                name: 'wickiwacka2',
                id: '1271082992953069572',
            },
            { command: 'uwu', name: 'rizzwan.', id: '1271082993427021828' },
            { command: 'boba', name: 'pepsi_pro', id: '1271082992453816412' },
            { command: 'lyricwhiz', name: 'vipraz', id: '1271391276155011072' },
        ]

        const embed = new EmbedBuilder()
            .setTitle('✨ Credits ✨')
            .setColor('#0099ff')
            .setDescription(
                'A big thank you to all the amazing contributors who helped make this bot possible!'
            )
            .setTimestamp()
            .setFooter({ text: 'Thanks to all the contributors!' })

        contributors.forEach((contributor) => {
            embed.addFields([
                {
                    name: `**${contributor.name}**`,
                    value: `</${contributor.command}:${contributor.id}>`,
                    inline: true,
                },
            ])
        })

        await interaction.reply({ embeds: [embed] })
    },
}
