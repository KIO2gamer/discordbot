const {
    SlashCommandBuilder,
    ChannelType,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js')

module.exports = {
    description_full:
        'Echoes the provided text back to you. Optionally, send the echo to a specific channel and choose whether to format it as an embed. Requires the "Manage Channels" permission to prevent misuse.',
    usage: '/echo <input:text_to_echo> <channel:channel> [embed:true/false]',
    examples: [
        '/echo input:"Hello there!" channel:#general',
        '/echo input:"Important announcement!" channel:#announcements embed:true',
    ],
    data: new SlashCommandBuilder()
        .setName('echo')
        .setDescription('Replies with your input!')
        .addStringOption((option) =>
            option
                .setName('input')
                .setDescription('The input to echo back')
                .setMaxLength(2000)
                .setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to echo into')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addBooleanOption((option) =>
            option
                .setName('embed')
                .setDescription('Whether or not the echo should be embedded')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const input = interaction.options.getString('input')
        const channel = interaction.options.getChannel('channel')
        const useEmbed = interaction.options.getBoolean('embed') || false

        // Check if the bot has permission to send messages in the target channel
        if (
            !channel
                .permissionsFor(interaction.guild.members.me)
                .has(PermissionFlagsBits.SendMessages)
        ) {
            return interaction.reply({
                content: `I don't have permission to send messages in ${channel}.`,
                ephemeral: true,
            })
        }

        try {
            if (useEmbed) {
                const echoEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`Echoed by ${interaction.user.tag}`)
                    .setDescription(input)
                    .setFooter({
                        text: `Echoed by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL({
                            dynamic: true,
                        }),
                    })
                    .setTimestamp()

                await channel.send({ embeds: [echoEmbed] })
            } else {
                await channel.send(
                    `**Message:** ${input}\n*Echoed by: ${interaction.user.tag}*`
                )
            }

            await interaction.reply({
                content: `Message echoed successfully in ${channel}.`,
                ephemeral: true,
            })
        } catch (error) {
            console.error('Error sending echo message:', error)
            await interaction.reply({
                content: 'There was an error trying to execute that command.',
                ephemeral: true,
            })
        }
    },
}
