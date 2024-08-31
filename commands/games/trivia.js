const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const he = require('he')

module.exports = {
    description_full:
        'The bot will provide a trivia question with four multiple-choice answers. Users can react to guess the correct answer.',
    usage: '/trivia',
    examples: ['/trivia'],
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Answer a trivia question! (Only 1 try!!!)'),
    async execute(interaction) {
        try {
            const response = await fetch(
                'https://opentdb.com/api.php?amount=1&type=multiple'
            )
            const data = await response.json()

            const questionData = data.results[0]

            // Decode HTML entities
            const decodedQuestion = he.decode(questionData.question)
            const decodedAnswers = questionData.incorrect_answers.map(
                (answer) => he.decode(answer)
            )
            decodedAnswers.push(he.decode(questionData.correct_answer))

            // Shuffle answers
            const answers = [...decodedAnswers].sort(() => Math.random() - 0.5)
            const correctIndex = answers.indexOf(questionData.correct_answer)

            // Create trivia embed (no timer here)
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Trivia Time!')
                .setDescription(decodedQuestion)
                .addFields(
                    { name: 'A', value: answers[0], inline: true },
                    { name: 'B', value: answers[1], inline: true },
                    { name: 'C', value: answers[2], inline: true },
                    { name: 'D', value: answers[3], inline: true }
                )

            await interaction.reply({ embeds: [embed] })

            // Timer message
            let timeLeft = 15
            const timerMessage = await interaction.followUp(
                `Time Remaining: ${timeLeft} seconds`
            )
            let winnerFound = false // Flag to track if a winner is found

            const countdown = setInterval(async () => {
                if (!winnerFound) {
                    // Only decrement timer if a winner hasn't been found
                    timeLeft--
                    if (timeLeft >= 0) {
                        await timerMessage.edit(
                            `Time Remaining: ${timeLeft} seconds`
                        )
                    }
                }

                if (timeLeft <= 0 && !winnerFound) {
                    clearInterval(countdown)
                    await timerMessage.edit("Time's up!")
                    const correctAnswer = ['a', 'b', 'c', 'd'][correctIndex]
                    interaction.followUp(
                        `The correct answer was ${correctAnswer.toUpperCase()}: ${questionData.correct_answer}`
                    )
                }
            }, 1000)

            // Answer collection
            const filter = (m) =>
                ['a', 'b', 'c', 'd'].includes(m.content.toLowerCase()) &&
                m.author.id === interaction.user.id
            const collector = interaction.channel.createMessageCollector({
                filter,
                max: 1,
                time: 15000,
            })

            collector.on('collect', async (msg) => {
                const userAnswer = msg.content.toLowerCase()
                const correctAnswer = ['a', 'b', 'c', 'd'][correctIndex]

                if (userAnswer === correctAnswer) {
                    winnerFound = true // Set the flag to stop the timer
                    clearInterval(countdown) // Stop the timer
                    await timerMessage.edit(
                        `<@${msg.author.id}> got the correct answer!`
                    ) // Announce the winner
                } else {
                    interaction.followUp(`Incorrect, <@${msg.author.id}>!`)
                }
            })
        } catch (error) {
            console.error('Error fetching trivia:', error)
            interaction.reply('An error occurred. Please try again later.')
        }
    },
}
