const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const mongoose = require('mongoose')
const User = require('../../discord-oauth2/UserConnections') // Import the User model

// MongoDB connection string from environment variables
const mongoUri = process.env.MONGODB_URL

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
        // Connect to MongoDB using Mongoose
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })

        const discordUserId = interaction.user.id // Get the Discord user's ID
        const youtubeId = await getYoutubeId(discordUserId)

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

        // Close the MongoDB connection
        mongoose.connection.close()
    },
}

// Fetch YouTube ID from MongoDB using Mongoose
async function getYoutubeId(discordUserId) {
    try {
        const user = await User.findOne({ discordUserId })
        return user ? user.youtubeId : null
    } catch (err) {
        console.error('Error retrieving user from MongoDB:', err)
        return null
    }
}
