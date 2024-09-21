const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    description_full:
        "Measures the bot's response time (latency) and displays its uptime (how long it's been running).",
    usage: '/ping',
    examples: ['/ping'],
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription("Checks the bot's response time"),

    async execute(interaction) {
        const startTime = Date.now()
        await interaction.deferReply()

        const endTime = Date.now()
        const responseTime = endTime - startTime

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏓 Pong!')
            .addFields(
                {
                    name: 'Response Time',
                    value: `${responseTime}ms`,
                    inline: true
                },
                {
                    name: 'WebSocket Ping',
                    value: `${interaction.client.ws.ping}ms`,
                    inline: true
                }
            )
            .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
    }
}
