const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js')
const ms = require('ms')

module.exports = {
    description_full:
        'This command allows you to set a slowmode for a channel. Slowmode limits how often users can send messages in the specified channel. You can set the slowmode duration using common time units (e.g., 10s, 5m, 1h).',
    usage: '/slowmode [duration] [channel]',
    examples: [
        '/slowmode 10s', // Set slowmode to 10 seconds in the current channel
        '/slowmode 5m #general', // Set slowmode to 5 minutes in the #general channel
    ],
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set a slowmode for a channel.')
        .addStringOption((option) =>
            option
                .setName('duration')
                .setDescription(
                    'The duration of the slowmode (e.g., 10s, 5m, 1h)'
                )
                .setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to set slowmode in')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        const channel =
            interaction.options.getChannel('channel') || interaction.channel
        const durationInput = interaction.options.getString('duration')
        const duration = ms(durationInput) / 1000

        // Defer the reply to allow time for the operation
        await interaction.deferReply()

        if (isNaN(duration) || duration < 0 || duration > 21600) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'Invalid duration. Please provide a duration between 0 seconds and 6 hours.'
                        )
                        .setColor('Red')
                        .setFooter({
                            text: `Set by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.displayAvatarURL()}`,
                        }),
                ],
            })
            return
        }

        try {
            await channel.setRateLimitPerUser(duration)

            let description
            if (duration === 0) {
                description = `The slowmode for <#${channel.id}> has been disabled.`
            } else {
                description = `The slowmode for <#${channel.id}> has been set to ${durationInput}.`
            }

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Slowmode Set')
                        .setDescription(description)
                        .setColor('Green')
                        .setFooter({
                            text: `Set by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.displayAvatarURL()}`,
                        }),
                ],
            })
        } catch (error) {
            console.error('Error setting slowmode:', error)
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'An error occurred while trying to set the slowmode.'
                        )
                        .setColor('Red')
                        .setFooter({
                            text: `Set by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.displayAvatarURL()}`,
                        }),
                ],
            })
        }
    },
}
