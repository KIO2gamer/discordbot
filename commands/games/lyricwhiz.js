const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const Genius = require('genius-api')
const cheerio = require('cheerio')

const GENIUS_API_TOKEN = 'YOUR_GENIUS_API_TOKEN_HERE'

const ROUND_TIME_LIMIT = 30000
const HINT_PENALTY = 1
const REQUESTS_PER_MINUTE = 10
const RATE_LIMIT_DELAY = 60000 / REQUESTS_PER_MINUTE
let lastRequestTime = 0

module.exports = {
    description_full:
        'A music lyric guessing game! The bot will provide a snippet of lyrics and users have to guess the next line. The player with the most points at the end of 5 rounds wins.',
    usage: '/lyricwhiz',
    examples: ['/lyricwhiz'],
    data: new SlashCommandBuilder()
        .setName('lyricwhiz')
        .setDescription('Start a music lyric guessing game!'),
    async execute(interaction) {
        await interaction.reply(
            "Let's play LyricWhiz!\n\nI'll give you a snippet of lyrics, and you have to guess the next line."
        )

        let players = []
        let currentRound = 1

        const joinMessage = await interaction.channel.send(
            'React to this message with 🎵 to join the game!'
        )
        await joinMessage.react('🎵')

        const joinCollector = joinMessage.createReactionCollector({
            filter: (reaction, user) => !user.bot,
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

            const playGame = async () => {
                for (currentRound; currentRound <= 5; currentRound++) {
                    await playRound()
                }
                declareWinner(players)
            }

            playGame()
        })

        async function playRound() {
            await interaction.followUp(`**Round ${currentRound}!**`)
            let hintGiven = false

            try {
                const songData = await getSongFromGeniusAPI()
                if (!songData) {
                    await interaction.followUp(
                        "Oops, couldn't fetch a song. Try again later!"
                    )
                    return
                }

                const { lyrics, correctLine } = processLyrics(songData.lyrics)
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
                    if (reason !== 'correct') return

                    if (!hintGiven) {
                        await interaction.followUp(
                            'React with 🤔 to this message for a hint (this will deduct a point)!'
                        )

                        const hintReactionFilter = (reaction, user) => {
                            return (
                                ['🤔'].includes(reaction.emoji.name) &&
                                players.some((p) => p.id === user.id)
                            )
                        }

                        const hintCollector =
                            interaction.channel.awaitReactions({
                                filter: hintReactionFilter,
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
                                    `Hint:  ${provideHint(correctLine)}`
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

                    if (currentRound < 5) {
                        currentRound++
                        playRound()
                    }
                })
            } catch (error) {
                console.error('An error occurred during the round:', error)
                await interaction.followUp(
                    'Oops, something went wrong! Skipping to the next round.'
                )

                if (currentRound < 5) {
                    currentRound++
                    setTimeout(playRound, 2000) // Short delay before next round
                } else {
                    declareWinner(players)
                }
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

async function getSongFromGeniusAPI() {
    const currentTime = Date.now()
    const timeSinceLastRequest = currentTime - lastRequestTime

    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await new Promise((resolve) =>
            setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest)
        )
    }

    const randomSearchTerm = getRandomElement([
        'Taylor Swift Shake It Off',
        'Imagine Dragons Believer',
        'Ed Sheeran Shape of You',
        'Billie Eilish Bad Guy',
    ])

    try {
        // Correct client instantiation (genius-api 8.0.0+)
        const geniusClient = new Genius({ accessToken: GENIUS_API_TOKEN })

        const searches = await geniusClient.songs.search(randomSearchTerm)
        lastRequestTime = Date.now()

        if (searches.length === 0) {
            console.log('No results found for:', randomSearchTerm)
            return null
        }

        const firstHit = searches[0]
        const lyrics = await geniusClient.songs.lyrics(firstHit.id)
        lastRequestTime = Date.now()

        return { lyrics: lyrics }
    } catch (error) {
        console.error('Error fetching from Genius API:', error)
        return null
    }
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)]
}

function processLyrics(fullLyrics) {
    const $ = cheerio.load(fullLyrics)
    const cleanedLyrics = $('body *')
        .contents()
        .map(function () {
            return this.type === 'text' ? $(this).text() : ''
        })
        .get()
        .join(' ')

    const lyricsWithoutHeaders = cleanedLyrics.replace(/\[.*?\]\s?/g, '')

    const normalizedLyrics = lyricsWithoutHeaders.replace(/<br>/g, '\n')

    const lyricsLines = normalizedLyrics
        .split('\n')
        .filter((line) => line.trim() !== '')

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

    return { lyrics: lyricsSnippet, correctLine: correctLine }
}
