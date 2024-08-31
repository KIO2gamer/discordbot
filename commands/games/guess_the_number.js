const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    description_full:
        'The bot chooses a random number between 1 and 100. The user has 7 tries to guess it.',
    usage: '/guess_the_number',
    examples: ['/guess_the_number'],
    data: new SlashCommandBuilder()
        .setName('guess_the_number')
        .setDescription('Try to guess the secret number between 1 and 100!'),

    async execute(interaction) {
        const randomNumber = Math.floor(Math.random() * 100) + 1
        let guessesLeft = 7
        let gameWon = false

        await interaction.reply(
            `I've chosen a secret number between 1 and 100. You have 7 guesses!`
        )

        // Timer message
        let timeLeft = 30
        const timerMessage = await interaction.followUp(
            `Time Remaining: ${timeLeft} seconds`
        )

        const countdown = setInterval(async () => {
            if (!gameWon) {
                timeLeft--
                if (timeLeft >= 0) {
                    await timerMessage.edit(
                        `Time Remaining: ${timeLeft} seconds`
                    )
                }
            }

            if (timeLeft <= 0 && !gameWon) {
                clearInterval(countdown)
                await timerMessage.delete().catch(console.error)
                interaction.followUp(
                    `Time's up! The number was ${randomNumber}.`
                )
            }
        }, 1000)

        // Guess collection
        const filter = (m) =>
            !isNaN(m.content) && m.author.id === interaction.user.id
        const collector = interaction.channel.createMessageCollector({
            filter,
            max: guessesLeft,
            time: 30000,
        })

        collector.on('collect', async (msg) => {
            const guess = parseInt(msg.content)

            if (guess === randomNumber) {
                gameWon = true
                clearInterval(countdown)
                await timerMessage.delete().catch(console.error)
                interaction.followUp(
                    `🎉 <@${msg.author.id}> guessed the number! It was ${randomNumber}!`
                )
            } else if (guess < randomNumber) {
                guessesLeft--
                interaction.followUp(
                    `Too low! You have ${guessesLeft} guesses left.`
                )
            } else {
                guessesLeft--
                interaction.followUp(
                    `Too high! You have ${guessesLeft} guesses left.`
                )
            }
        })
    },
}
