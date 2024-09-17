const { EmbedBuilder } = require('discord.js')

/**
 * Handles and logs errors that occur during command execution.
 *
 * @param {import('discord.js').Interaction} interaction - The Discord interaction object.
 * @param {Error} error - The error that occurred.
 */
async function handleError(interaction, error) {
    console.error(error)

    const errorEmbed = new EmbedBuilder()
        .setTitle('An error occurred')
        .setDescription(
            'There was a problem executing the command. Please try again later.'
        )
        .setColor('Red')
        .setTimestamp()

    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
}

module.exports = {
    handleError,
}
