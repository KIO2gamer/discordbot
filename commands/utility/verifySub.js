const { SlashCommandBuilder } = require('discord.js')
const { request } = require('undici')
const express = require('express')
const { clientId, clientSecret, port } = require('../../bot_utils/config.json')
const subRoles = require('../../assets/json/subRoles.json')
const youtubeApiKey = process.env.YOUTUBE_API

/**
 *  Handles the initial interaction and redirects the user to the OAuth2 authorization page.
 *  @param {Interaction} interaction The interaction object.
 *  @returns {Promise<void>} a promise that resolves when the interaction has been handled.
 */
async function handleInteraction(interaction) {
    const redirectUri = `http://localhost:${port}`
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20connections`

    // Check if the user already has any of the roles
    const userRoles = interaction.member.roles.cache.map((role) => role.id)
    const hasRole = subRoles.roles.some((role) =>
        userRoles.includes(role.roleID)
    )

    if (hasRole) {
        await interaction.reply({
            content:
                'You already have a verified YouTube channel and have been assigned a role!',
            ephemeral: true,
        })
        return
    }

    await interaction.reply(
        `Please click on this link to verify your YouTube channel: ${authUrl}`
    )
}

/**
 *  Handles the OAuth2 token request and retrieves the user's connections.
 *  @param {Request} req The request object.
 *  @param {Response} res The response object.
 *  @returns {Promise<void>} a promise that resolves when the request has been handled.
 */
async function handleOAuth2Token(req, res) {
    const { code } = req.query

    try {
        const tokenResponseData = await request(
            'https://discord.com/api/oauth2/token',
            {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: `http://localhost:${port}`,
                }).toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        )
        const oauthData = await tokenResponseData.body.json()

        const userResult = await request(
            'https://discord.com/api/users/@me/connections',
            {
                headers: {
                    authorization: `${oauthData.token_type} ${oauthData.access_token}`,
                },
            }
        )
        const connections = await userResult.body.json()

        return { oauthData, connections }
    } catch (error) {
        console.error('Error during token request:', error)
        res.status(500).send('An error occurred during token request.')
        throw error
    }
}

/**
 *  Retrieves YouTube channel data and assigns the appropriate role based on subscriber count.
 *  @param {Object} data An object containing oauth data and user connections.
 *  @param {Interaction} interaction The interaction object.
 *  @returns {Promise<void>} a promise that resolves when the YouTube data has been retrieved and roles have been assigned.
 */
async function handleYouTubeData(data, interaction) {
    const { oauthData, connections } = data
    const youtubeConnection = connections.find(
        (connection) => connection.type === 'youtube'
    )

    if (!youtubeConnection) {
        throw new Error('No YouTube connection found.')
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${youtubeConnection.id}&key=${youtubeApiKey}`
    const youtubeResponse = await request(apiUrl)
    const youtubeData = await youtubeResponse.body.json()

    const subscriberCount = parseInt(
        youtubeData.items[0].statistics.subscriberCount,
        10
    )

    const roleToAssign = subRoles.roles.find(
        (role) => subscriberCount < role.maxSubs
    )

    if (roleToAssign) {
        const role = interaction.guild.roles.cache.get(roleToAssign.roleID)
        await interaction.member.roles.add(role)

        await interaction.followUp(
            `You have been assigned the "${roleToAssign.roleName}" role!`
        )
    } else {
        await interaction.followUp(
            'Your subscriber count does not match any available roles.'
        )
    }
}

/**
 *  Creates an Express application and handles the verification process.
 *  @param {Interaction} interaction The interaction object.
 *  @returns {Promise<void>} a promise that resolves when the verification process has been completed.
 */
async function handleVerification(interaction) {
    const app = express()
    let server

    app.get('/', async (req, res) => {
        try {
            const data = await handleOAuth2Token(req, res)
            await handleYouTubeData(data, interaction)
            res.send('Verification successful! You can close this window.')

            // Close the server after sending the response
            if (server) {
                server.close()
                console.log('Server Closed')
            }
        } catch (error) {
            console.error('Error during verification:', error)
            await interaction.followUp('An error occurred during verification.')
            res.status(500).send('An error occurred during verification.')
        }
    })

    if (
        !interaction.member.roles.cache.some((role) =>
            subRoles.roles.some((r) => r.roleID === role.id)
        )
    ) {
        server = app.listen(port, () =>
            console.log(`App listening at http://localhost:${port}`)
        )
    }
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify-youtube')
        .setDescription('Verify your YouTube channel and get roles!'),
    async execute(interaction) {
        await handleInteraction(interaction)
        await handleVerification(interaction)
    },
}
