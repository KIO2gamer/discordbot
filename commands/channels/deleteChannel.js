const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require('discord.js')
const { handleError } = require('../../bot_utils/errorHandler')

module.exports = {
    description_full:
        'This command permanently deletes a specified channel from the server. Please use caution as this action is irreversible.',
    usage: '/delete_channel [channel]',
    examples: [
        '/delete_channel channel:category', // Deletes a channel named "category" (could be any valid channel name)
        '/delete_channel channel:text', // Deletes a channel named "text"
        '/delete_channel channel:voice', // Deletes a channel named "voice"
    ],
    data: new SlashCommandBuilder()
        .setName('delete_channel')
        .setDescription('Deletes a specified channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to delete')
                .setRequired(true)
        ),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel')

        try {
            await channel.delete()

            const embed = new EmbedBuilder()
                .setTitle('Channel Deleted!')
                .setColor('Red')
                .setDescription(
                    `The channel ${channel.id} has been successfully deleted.`
                )
                .setTimestamp()

            await interaction.reply({ embeds: [embed] })
        } catch (error) {
            await handleError(interaction, error)
        }
    },
}
