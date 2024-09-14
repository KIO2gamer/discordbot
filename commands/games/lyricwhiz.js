const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const Genius = require('genius-lyrics')

const GENIUS_API_TOKEN = process.env.GENIUS_ACCESS_TOKEN_MUSIC
const ROUND_TIME_LIMIT = 30000
const HINT_PENALTY = 1
const MAX_ROUNDS = 5

const geniusClient = new Genius.Client(GENIUS_API_TOKEN)

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyricwhiz')
        .setDescription('Start a music lyric guessing game!'),
    async execute(interaction) {
        await interaction.reply(
            "Let's play LyricWhiz! I'll give you a snippet of lyrics, and you have to guess the next line."
        )

        let players = []
        let currentRound = 1

        const joinMessage = await interaction.channel.send(
            'React to this message with 🎵 to join the game!'
        )
        await joinMessage.react('🎵')

        const joinCollector = joinMessage.createReactionCollector({
            filter: (reaction, user) =>
                reaction.emoji.name === '🎵' && !user.bot,
            time: 30000,
        })

        joinCollector.on('collect', (reaction, user) => {
            players.push({ id: user.id, name: user.username, score: 0 })
        })

        joinCollector.on('end', async () => {
            if (players.length < 2) {
                return await interaction.followUp(
                    'Not enough players to start. :('
                )
            }

            await interaction.followUp(
                `Game starting with ${players.length} players! Get ready!`
            )
            await playGame()
        })

        async function playGame() {
            for (currentRound; currentRound <= MAX_ROUNDS; currentRound++) {
                await playRound()
            }
            declareWinner()
        }

        async function playRound() {
            await interaction.followUp(`**Round ${currentRound}!**`)
            let hintGiven = false

            try {
                const song = await getRandomSong()
                if (!song) {
                    await interaction.followUp(
                        "Oops, couldn't fetch a song. Try again later!"
                    )
                    return
                }

                const { lyrics, correctLine } = await processLyrics(song)
                await interaction.followUp(lyrics)

                const answerCollector =
                    interaction.channel.createMessageCollector({
                        time: ROUND_TIME_LIMIT,
                    })

                const roundTimeout = setTimeout(async () => {
                    await interaction.followUp(
                        "Time's up! Nobody got the answer this round."
                    )
                    answerCollector.stop()
                }, ROUND_TIME_LIMIT)

                answerCollector.on('collect', async (msg) => {
                    const guess = msg.content.toLowerCase()
                    const player = players.find((p) => p.id === msg.author.id)

                    if (!player) return

                    if (guess === correctLine.toLowerCase()) {
                        player.score += 3
                        answerCollector.stop('correct')
                        clearTimeout(roundTimeout)
                        await interaction.followUp(
                            `🎉 That's right, ${msg.author}! The answer is **${correctLine}**. You earned 3 points!`
                        )
                    } else {
                        await interaction.followUp(
                            `${msg.author}, that's not quite it. Try again!`
                        )
                    }
                })

                answerCollector.on('end', async (collected, reason) => {
                    if (reason !== 'correct') {
                        await interaction.followUp(
                            `The correct answer was: **${correctLine}**`
                        )
                    }

                    if (!hintGiven) {
                        await interaction.followUp(
                            'React with 🤔 to this message for a hint (this will deduct a point)!'
                        )

                        const hintCollector =
                            interaction.channel.createReactionCollector({
                                filter: (reaction, user) =>
                                    reaction.emoji.name === '🤔' &&
                                    players.some((p) => p.id === user.id),
                                max: 1,
                                time: ROUND_TIME_LIMIT / 2,
                            })

                        hintCollector.on('collect', async (reaction, user) => {
                            const requestingPlayer = players.find(
                                (p) => p.id === user.id
                            )
                            if (requestingPlayer) {
                                if (requestingPlayer.score > 0) {
                                    requestingPlayer.score -= HINT_PENALTY
                                }
                                await interaction.followUp(
                                    `Hint: ${provideHint(correctLine)}`
                                )
                                hintGiven = true
                            }
                        })

                        hintCollector.on('end', () => {
                            if (!hintGiven) {
                                interaction.followUp('No one requested a hint.')
                            }
                        })
                    }
                })
            } catch (error) {
                console.error('An error occurred during the round:', error)
                await interaction.followUp(
                    'Oops, something went wrong! Skipping to the next round.'
                )
            }
        }

        function provideHint(correctLine) {
            const words = correctLine.split(' ')
            if (words.length > 3) {
                const visibleWords = Math.floor(words.length / 2)
                return words.slice(0, visibleWords).join(' ') + ' ...'
            } else if (words.length >= 2) {
                return words[0] + ' ...'
            } else {
                return 'The line is very short!'
            }
        }

        function declareWinner() {
            players.sort((a, b) => b.score - a.score)
            const winner = players[0]
            const tieWinners = players.filter((p) => p.score === winner.score)

            if (tieWinners.length > 1) {
                let tieMessage = "It's a tie! The winners are: "
                tieWinners.forEach((player) => {
                    tieMessage += `${player.name} (${player.score} points), `
                })
                tieMessage = tieMessage.slice(0, -2)
                interaction.followUp(tieMessage)
            } else {
                interaction.followUp(
                    `Game over! The winner is... **${winner.name}** with ${winner.score} points!`
                )
            }
        }
    },
}

async function getRandomSong() {
    const randomSearchTerm = getRandomElement([
        'Taylor Swift',
        'Imagine Dragons',
        'Ed Sheeran',
        'Billie Eilish',
        'Ariana Grande',
        'Drake',
        'The Weeknd',
        'Adele',
    ])

    try {
        const searches = await geniusClient.songs.search(randomSearchTerm)
        if (searches.length === 0) {
            console.log('No results found for:', randomSearchTerm)
            return null
        }

        return getRandomElement(searches)
    } catch (error) {
        console.error('Error fetching from Genius API:', error)
        return null
    }
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)]
}

async function processLyrics(song) {
    const lyrics = await song.lyrics()
    const lyricsLines = lyrics
        .split('\n')
        .filter((line) => line.trim() !== '' && !line.startsWith('['))

    if (lyricsLines.length < 3) {
        return {
            lyrics: 'The song is too short for this game!',
            correctLine: null,
        }
    }

    const endIndex = Math.floor(Math.random() * (lyricsLines.length - 2)) + 1
    const snippetLines = lyricsLines.slice(0, endIndex)

    const lyricsSnippet = snippetLines.join('\n')
    const correctLine = lyricsLines[endIndex].trim()

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Lyrics from: ${song.title} by ${song.artist.name}`)
        .setDescription(lyricsSnippet)
        .setFooter({ text: 'Can you guess the next line?' })

    return { lyrics: { embeds: [embed] }, correctLine: correctLine }
}
