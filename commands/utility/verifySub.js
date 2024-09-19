const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { clientId, redirectUri } = require('../../discord-oauth2/config.json')

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
        const authURL = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify+connections`
        const embed = new EmbedBuilder()
            .setTitle('Verify Your Account')
            .setDescription(`Click [here](${authURL}) to verify your account.`)

        const response = await interaction.reply({
            embeds: [embed],
            fetchReply: true,
        })

        const authCode = await getAuthCode(response)
        const youtubeId = await getDiscordUserYoutubeId(authCode)

        if (youtubeId) {
            embed.setDescription(`Your YouTube ID: ${youtubeId}`)
        } else {
            embed.setDescription(
                'You do not have a YouTube channel linked to your Discord account.'
            )
        }

        await interaction.editReply({ embeds: [embed] })
    },
}
const axios = require('axios')

async function getAuthCode(message) {
    const authCode = message.content.split(' ').pop()

    if (!authCode) {
        throw new Error('Could not find authorization code.')
    }

    try {
        const response = await axios.post(
            'https://discord-bot-verify.netlify.app/.netlify/functions/authLogin',
            { code: authCode }
        )
        return response.data.youtubeId
    } catch (error) {
        console.error('Error in getAuthCode:', error)
        throw new Error('Failed to get YouTube ID.')
    }
}

async function getDiscordUserYoutubeId(code) {
    const authLoginUrl =
        'https://discord-bot-verify.netlify.app/.netlify/functions/authLogin'
    const response = await fetch(authLoginUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
    })

    const { youtubeId } = await response.json()
    return youtubeId
}
