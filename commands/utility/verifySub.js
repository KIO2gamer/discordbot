const { SlashCommandBuilder } = require('discord.js')
const axios = require('axios')
const qs = require('qs')
const { clientId, redirectUri } = require('../../discord-oauth2/config.json')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription(
            'Verifies a user by checking if they have a YouTube channel linked to their Discord account.'
        ),
    async execute(interaction) {
        const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify+connections`

        try {
            const response = await axios.get(authUrl, {
                headers: {
                    Authorization: `Bot ${interaction.client.token}`,
                },
            })

            const authCode = qs.parse(response.data.split('&')[1]).code

            if (authCode) {
                const authLoginUrl =
                    'https://discord-oauth2.netlify.app/.netlify/functions/authLogin'

                try {
                    const authLoginResponse = await axios.post(authLoginUrl, {
                        code: authCode,
                    })
                    const youtubeId = authLoginResponse.data.youtubeId

                    if (youtubeId) {
                        await interaction.reply(`Your YouTube ID: ${youtubeId}`)
                    } else {
                        await interaction.reply(
                            'You do not have a YouTube channel linked to your Discord account.'
                        )
                    }
                } catch (error) {
                    console.error('Error in authLogin.js:', error)
                    await interaction.reply('Failed to get YouTube ID.')
                }
            } else {
                await interaction.reply('Failed to fetch authorization code.')
            }
        } catch (error) {
            console.error('Error in verifySub.js:', error)
            await interaction.reply('Failed to authorize.')
        }
    },
}
