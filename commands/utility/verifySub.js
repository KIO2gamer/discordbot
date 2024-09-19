const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    description_full:
        'Verifies a user by checking if they have a YouTube channel linked to their Discord account. If the user has a YouTube channel linked, they are verified and can access the bot. If not, they are not verified and cannot access the bot.',
    usage: '/verify',
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription(
            'Verifies a user by checking if they have a YouTube channel linked to their Discord account.'
        ),
    async execute(interaction) {
        // Check for YouTube ID from localStorage (you might need to integrate this with your bot environment)
        const youtubeId = await getYoutubeIdFromLocalStorage(
            interaction.user.id
        ) // Customize this function to match your environment

        let description = ''
        if (youtubeId) {
            description = `You have successfully linked your YouTube account. Your YouTube Channel ID is: ${youtubeId}`
        } else {
            description = `You haven't linked your YouTube account yet. Please click [here](${redirectUri}) to verify your account.`
        }

        const embed = new EmbedBuilder()
            .setTitle('Verify Your Account')
            .setDescription(description)

        await interaction.reply({ embeds: [embed] })
    },
}

// Sample function to retrieve YouTube ID (adjust for your environment)
async function getYoutubeIdFromLocalStorage(userId) {
    // Here, you would typically fetch from a database, but for demo purposes, we'll assume localStorage
    // Replace this logic with actual DB fetching logic in production
    const youtubeId = localStorage.getItem('youtubeId') // Replace with actual data fetching logic in a real environment
    return youtubeId
}
