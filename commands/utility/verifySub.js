const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { redirectUri } = require('../../discord-oauth2/config.json')

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
        
        let description = ``
        if (getYoutubeId()) {
            description = `You are verified! You can now access the bot.\nYoutube Channel ID: ${getYoutubeId()}`
        }
        else {
            description = `You are not verified. Please link your YouTube channel to your Discord account by clicking [here](${redirectUri}).`
        }

        const embed = new EmbedBuilder()
            .setTitle('Verify Your Account')
            .setDescription(description)

        await interaction.reply({ embeds: [embed] })
    },
}
