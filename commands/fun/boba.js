const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
require('dotenv').config()

module.exports = {
    description_full:
        'Satisfy your boba cravings with a delightful GIF of this delicious drink.',
    usage: '/boba', // No additional parameters needed
    examples: ['/boba'], // Only one example is sufficient
    data: new SlashCommandBuilder()
        .setName('boba')
        .setDescription('Send a pic of boba because it is the best.'),

    async execute(interaction) {
        // Defer the reply to give more time for processing
        await interaction.deferReply()

        try {
            const response = await fetch(
                `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=boba&limit=20`
            )
            const data = await response.json()

            if (data.data && data.data.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.data.length)
                const bobaGif = data.data[randomIndex].images.original.url

                const embed = new EmbedBuilder()
                    .setTitle('Enjoy your Boba!')
                    .setImage(bobaGif)

                await interaction.editReply({ embeds: [embed] })
            } else {
                await interaction.editReply(
                    'Sorry, I could not find a Boba GIF.'
                )
            }
        } catch (error) {
            console.error('Error fetching Boba GIF:', error)
            await interaction.editReply(
                'There was an error trying to fetch a Boba GIF.'
            )
        }
    },
}
