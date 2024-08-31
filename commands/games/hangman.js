const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const fs = require('fs')

// Wikimedia URLs for hangman images
const hangmanImages = [
    'https://upload.wikimedia.org/wikipedia/commons/8/8b/Hangman-0.png',
    'https://upload.wikimedia.org/wikipedia/commons/3/37/Hangman-1.png',
    'https://upload.wikimedia.org/wikipedia/commons/7/70/Hangman-2.png',
    'https://upload.wikimedia.org/wikipedia/commons/9/97/Hangman-3.png',
    'https://upload.wikimedia.org/wikipedia/commons/2/27/Hangman-4.png',
    'https://upload.wikimedia.org/wikipedia/commons/6/6b/Hangman-5.png',
    'https://upload.wikimedia.org/wikipedia/commons/d/d6/Hangman-6.png',
]

module.exports = {
    description_full:
        "A classic game of hangman! The bot will choose a random word, and users have to guess the letters.  You can use '!hint' to get a hint, but be careful, you only have 3 hints!",
    usage: '/hangman',
    examples: ['/hangman'],
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Start a game of hangman!'),
    async execute(interaction) {
        fs.readFile(
            './assets/texts/hangmanWords.txt',
            'utf-8',
            async (err, data) => {
                if (err) {
                    console.error('Failed to read the word list:', err)
                    interaction.reply(
                        'An error occurred while loading the words.'
                    )
                    return
                }

                const words = data
                    .split('\n')
                    .map((word) => word.trim())
                    .filter((word) => word)

                if (words.length === 0) {
                    interaction.reply('The word list is empty!')
                    return
                }

                const word = words[Math.floor(Math.random() * words.length)]
                const guessedLetters = []
                let remainingGuesses = 6
                let wordState = '_ '.repeat(word.length).trim()
                let hintsUsed = 0

                const gameEmbed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle('Hangman')
                    .setDescription(`\`\`\`${wordState}\`\`\``)
                    .setThumbnail(hangmanImages[0])
                    .addFields(
                        {
                            name: 'Guesses Left',
                            value: remainingGuesses.toString(),
                            inline: true,
                        },
                        {
                            name: 'Guessed Letters',
                            value: guessedLetters.join(', ') || 'None',
                            inline: true,
                        },
                        {
                            name: 'Hints Used',
                            value: hintsUsed.toString(),
                            inline: true,
                        }
                    )

                const msg = await interaction.reply({ embeds: [gameEmbed] })

                const filter = (m) => m.author.id === interaction.user.id
                const collector = interaction.channel.createMessageCollector({
                    filter,
                    time: 60000,
                })

                collector.on('collect', async (guess) => {
                    const content = guess.content.toLowerCase()

                    if (content.startsWith('!hint') && hintsUsed < 3) {
                        hintsUsed++
                        // Implement hint logic here
                        // ... provide a hint based on the word ...
                    } else if (/^[a-zA-Z]$/.test(content)) {
                        const letter = content

                        if (guessedLetters.includes(letter)) {
                            await guess.reply(
                                'You already guessed that letter!'
                            )
                            return
                        }

                        guessedLetters.push(letter)

                        if (word.includes(letter)) {
                            for (let i = 0; i < word.length; i++) {
                                if (word[i] === letter) {
                                    wordState =
                                        wordState.substring(0, i * 2) +
                                        letter +
                                        wordState.substring(i * 2 + 1)
                                }
                            }
                        } else {
                            remainingGuesses--
                        }
                    } else {
                        await guess.reply(
                            'Please enter a single letter or use "!hint" for a hint.'
                        )
                        return
                    }

                    gameEmbed
                        .setDescription(`\`\`\`${wordState}\`\`\``)
                        .setThumbnail(hangmanImages[6 - remainingGuesses])
                        .setFields(
                            {
                                name: 'Guesses Left',
                                value: remainingGuesses.toString(),
                                inline: true,
                            },
                            {
                                name: 'Guessed Letters',
                                value: guessedLetters.join(', '),
                                inline: true,
                            },
                            {
                                name: 'Hints Used',
                                value: hintsUsed.toString(),
                                inline: true,
                            }
                        )

                    if (remainingGuesses === 0) {
                        gameEmbed
                            .setColor(0xff0000)
                            .setTitle('You Lose!')
                            .setDescription(`The word was **${word}**`)
                        await msg.edit({ embeds: [gameEmbed] })
                        collector.stop()
                        return
                    }

                    if (wordState.replace(/ /g, '') === word) {
                        gameEmbed.setColor(0x00ff00).setTitle('You Win!')
                        await msg.edit({ embeds: [gameEmbed] })
                        collector.stop()
                        return
                    }

                    await msg.edit({ embeds: [gameEmbed] })
                })

                collector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        gameEmbed
                            .setColor(0xff0000)
                            .setTitle('Time Up!')
                            .setDescription(`The word was **${word}**`)
                        msg.edit({ embeds: [gameEmbed] })
                    }
                })
            }
        )
    },
}
