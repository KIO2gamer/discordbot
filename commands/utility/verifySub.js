const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { clientId, redirectUri } = require('../../discord-oauth2/config.json')
const {
    getDiscordUserYoutubeId,
} = require('../../discord-oauth2/functions/authLogin')
const { v4: uuidv4 } = require('uuid') // Import UUID library for generating unique IDs

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
        const state = uuidv4() // Generate a unique state value
        const temporaryUrl = `https://your-website.com/verify?state=${state}` // Replace with your website URL

        const authURL = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
            redirectUri
        )}&response_type=code&scope=identify+connections&state=${state}`
        const embed = new EmbedBuilder()
            .setTitle('Verify Your Account')
            .setDescription(`Click [here](${authURL}) to verify your account.`)

        await interaction.reply({ embeds: [embed] })

        // Set up a listener for the interactionCreate event
        const interactionListener = interaction.client.on(
            'interactionCreate',
            async (newInteraction) => {
                if (
                    newInteraction.user.id === interaction.user.id &&
                    newInteraction.isChatInputCommand() &&
                    newInteraction.commandName === 'verify'
                ) {
                    // User has run the /verify command again (after authorization)
                    try {
                        const code = newInteraction.options.getString('code')
                        const state = newInteraction.options.getString('state')

                        if (!code || !state) {
                            await newInteraction.reply(
                                'Please provide both the authorization code and state.'
                            )
                            return
                        }

                        const youtubeId = await getDiscordUserYoutubeId(
                            code,
                            state
                        )

                        if (youtubeId) {
                            await newInteraction.reply(
                                `Your YouTube ID is: ${youtubeId}`
                            )
                        } else {
                            await newInteraction.reply(
                                'YouTube connection not found.'
                            )
                        }

                        interaction.client.removeListener(
                            'interactionCreate',
                            interactionListener
                        ) // Remove the listener
                    } catch (error) {
                        console.error('Error during verification:', error)
                        await newInteraction.reply(
                            'An error occurred during verification.'
                        )
                        interaction.client.removeListener(
                            'interactionCreate',
                            interactionListener
                        ) // Remove the listener
                    }
                }
            }
        )
    },
}
