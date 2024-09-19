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

        await interaction.reply({ embeds: [embed] })
    },
}
