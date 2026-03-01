const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 10,
    description_full:
        "The bot chooses a random number between 1 and 100. The user has 7 tries to guess it.",
    usage: "/guess_the_number",
    examples: ["/guess_the_number"],

    data: new SlashCommandBuilder()
        .setName("guess_the_number")
        .setDescription("Try to guess the secret number between 1 and 100!"),

    async execute(interaction) {
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        let guessesLeft = 7;
        let gameWon = false;
        let gameFinished = false;

        const COLORS = {
            info: 0x0099ff,
            warn: 0xffa000,
            success: 0x00c853,
            error: 0xe53935,
        };

        const buildEmbed = (title, description, color) =>
            new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setTimestamp();

        await interaction.reply({
            embeds: [
                buildEmbed(
                    "🎯 Guess the Number",
                    "I've chosen a secret number between 1 and 100. You have 7 guesses!",
                    COLORS.info,
                ),
            ],
        });

        // Timer message
        let timeLeft = 30;
        const timerMessage = await interaction.followUp({
            embeds: [buildEmbed("⏳ Timer", `Time Remaining: ${timeLeft} seconds`, COLORS.info)],
        });
        let timerMessageActive = true;

        const safeEditTimer = async (content) => {
            if (!timerMessageActive) return;
            try {
                await timerMessage.edit({
                    embeds: [buildEmbed("⏳ Timer", content, COLORS.info)],
                });
            } catch (err) {
                // If the timer message is gone (Unknown Message 10008), stop future edits
                if (err?.code === 10008) {
                    timerMessageActive = false;
                    clearInterval(countdown);
                    return;
                }
                await handleError(err);
            }
        };

        const finishGame = async (reason, authorId) => {
            if (gameFinished) return;
            gameFinished = true;
            clearInterval(countdown);
            await timerMessage.delete().catch((err) => {
                if (err?.code === 10008) return; // already gone
                handleError(err);
            });
            timerMessageActive = false;

            if (reason === "win") {
                await interaction.followUp({
                    embeds: [
                        buildEmbed(
                            "🎉 Correct!",
                            `<@${authorId}> guessed the number! It was ${randomNumber}!`,
                            COLORS.success,
                        ),
                    ],
                });
                return;
            }

            if (reason === "out-of-guesses") {
                await interaction.followUp({
                    embeds: [
                        buildEmbed(
                            "Out of guesses",
                            `The number was ${randomNumber}. Better luck next time!`,
                            COLORS.error,
                        ),
                    ],
                });
                return;
            }

            await interaction.followUp({
                embeds: [
                    buildEmbed("⏰ Time's up!", `The number was ${randomNumber}.`, COLORS.warn),
                ],
            });
        };

        const countdown = setInterval(async () => {
            if (gameFinished) return;

            if (!gameWon) {
                timeLeft--;
                if (timeLeft >= 0) {
                    await safeEditTimer(`Time Remaining: ${timeLeft} seconds`);
                }
            }

            if (timeLeft <= 0 && !gameWon) {
                await finishGame("timeout");
            }
        }, 1000);

        // Guess collection
        const filter = (m) => !isNaN(m.content) && m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({
            filter,
            max: guessesLeft,
            time: 30000,
        });

        collector.on("collect", async (msg) => {
            const guess = parseInt(msg.content);

            if (guess === randomNumber) {
                gameWon = true;
                await finishGame("win", msg.author.id);
            } else if (guess < randomNumber) {
                guessesLeft--;
                interaction.followUp({
                    embeds: [
                        buildEmbed("Too low", `You have ${guessesLeft} guesses left.`, COLORS.warn),
                    ],
                });
            } else {
                guessesLeft--;
                interaction.followUp({
                    embeds: [
                        buildEmbed(
                            "Too high",
                            `You have ${guessesLeft} guesses left.`,
                            COLORS.warn,
                        ),
                    ],
                });
            }

            if (guessesLeft <= 0 && !gameWon) {
                await finishGame("out-of-guesses");
                collector.stop("out-of-guesses");
            }
        });

        collector.on("end", async (_, reason) => {
            if (gameFinished) return;
            if (reason === "time") {
                await finishGame("timeout");
            }
        });
    },
};
