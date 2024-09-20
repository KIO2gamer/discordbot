const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { clientId, redirectUri } = require('../../discord-oauth2/config.json')
const puppeteer = require('puppeteer')
const { getDiscordUserYoutubeId } = require('../../discord-oauth2/functions/authLogin')

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
        try {
            // Generate the Discord OAuth2 link
            const oauthLink = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=identify+connections`

            // Launch a browser instance using Puppeteer
            const browser = await puppeteer.launch()
            const page = await browser.newPage()

            // Navigate to the OAuth2 link
            await page.goto(oauthLink)

            // Wait for the redirect to the redirect_uri
            await page.waitForNavigation({ waitUntil: 'networkidle2' })

            // Extract the authorization code from the URL
            const url = page.url()
            const code = new URLSearchParams(url.split('?')[1]).get('code')

            // Close the browser instance
            await browser.close()

            // Call getDiscordUserYoutubeId to retrieve the YouTube ID
            const youtubeId = await getDiscordUserYoutubeId(code)

            if (youtubeId) {
                // User is verified, proceed with your logic
                console.log('User is verified:', youtubeId)
                // ...
            } else {
                // User is not verified, handle accordingly
                console.log('User is not verified.')
                // ...
            }

            const embed = new EmbedBuilder()
                .setTitle('Verify Your Account')
                .setDescription(
                    `Please link your YouTube channel to your Discord account by clicking [here](${redirectUri}).`
                )

            await interaction.reply({ embeds: [embed] })
        } catch (error) {
            console.error('Error verifying user:', error)
            await interaction.reply({
                content:
                    'An error occurred while verifying your account. Please try again later.',
            })
        }
    },
}
