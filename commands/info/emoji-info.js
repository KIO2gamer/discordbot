const { SlashCommandBuilder } = require('@discordjs/builders')
const { EmbedBuilder } = require('discord.js')

module.exports = {
    description_full:
        'Shows details about a specific emoji from the server, including its name, ID, image URL, creation date, whether it’s animated, and whether it’s managed.',
    usage: '/emoji-info <emoji>',
    examples: ['/emoji-info 😄', '/emoji-info MyCustomEmoji'],
    data: new SlashCommandBuilder()
        .setName('emoji-info')
        .setDescription('Provides information about a specific emoji')
        .addStringOption((option) =>
            option
                .setName('emoji')
                .setDescription('The emoji to get information about')
                .setRequired(true)
        ),
    async execute(interaction) {
        const emoji = interaction.guild.emojis.cache.find(
            (e) => e.name === interaction.options.getString('emoji')
        )

        if (!emoji) {
            return interaction.reply('Emoji not found.')
        }

        const embed = new EmbedBuilder()
            .setTitle(`Emoji Info`)
            .setThumbnail(emoji.url)
            .addFields(
                { name: 'Emoji Name', value: emoji.name, inline: true },
                { name: 'Emoji ID', value: emoji.id, inline: true },
                { name: 'Emoji URL', value: emoji.imageURL(), inline: true },
                {
                    name: 'Emoji Created At',
                    value: emoji.createdAt.toDateString(),
                    inline: true,
                },
                {
                    name: 'Emoji Animated',
                    value: emoji.animated ? 'Yes' : 'No',
                    inline: true,
                },
                {
                    name: 'Emoji Managed',
                    value: emoji.managed ? 'Yes' : 'No',
                    inline: true,
                }
            )

        await interaction.reply({ embeds: [embed] })
    },
}
