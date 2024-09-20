const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { redirectUri } = require('../../discord-oauth2/config.json')
const eventEmitter = require('../../discord-oauth2/eventEmitter') // Adjust path if needed
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
        const embed = new EmbedBuilder()
            .setTitle('Verify Your Account')
            .setDescription(
                `Please link your YouTube channel to your Discord account by clicking [here](${redirectUri}).`
            )

        eventEmitter.on('youtubeId', (youtubeId) => {
            if (youtubeId) {
                // User is verified, proceed with your logic
                console.log('User is verified:', youtubeId)
                // ...
            } else {
                // User is not verified, handle accordingly
                console.log('User is not verified.')
                // ...
            }
        })

        await interaction.reply({ embeds: [embed] })
    },
}
