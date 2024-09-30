const { EmbedBuilder } = require('discord.js')

/**
 * Handles and logs errors that occur during command execution.
 *
 * @param {import('discord.js').Interaction} interaction - The Discord interaction object.
 * @param {Error} error - The error that occurred.
 * @param {import('discord.js').Message} sent - The initial message sent by the command.
 */
async function handleError(interaction, error, sent) {
    const chalk = (await import('chalk')).default // Dynamic import
    const boxen = (await import('boxen')).default // Dynamic import

    // Boxen options
    const boxOptions = {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'red', // Red border for errors
        align: 'center',
    }

    console.error(boxen(chalk.red.bold(`❌ ${error.message}`), boxOptions))

    const errorEmbed = new EmbedBuilder()
        .setTitle('An error occurred')
        .setDescription(
            'There was a problem executing the command. Please try again later.'
        )
        .setColor('Red')
        .setTimestamp()

    await interaction.reply({ embeds: [errorEmbed], ephemeral: true }) // Edit the initial message
}

module.exports = {
    handleError,
}
