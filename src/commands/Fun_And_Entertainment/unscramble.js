const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { handleError } = require("../../utils/errorHandler");
const fs = require("fs").promises;

// --- Constants ---
const WORD_LIST_PATH = "./assets/texts/wordList.txt";
const GAME_TIMEOUT_MS = 120000; // 2 minutes for the game
const SCRAMBLE_EMBED_COLOR = "#E67E22"; // Orange color for embed
const CORRECT_GUESS_EMOJI = "🎉";
const INCORRECT_GUESS_EMOJI = "❌";
const TIME_UP_EMOJI = "⏰";
const GAME_OVER_EMOJI = "🏁";

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("unscramble")
        .setDescription("Start a multiplayer word unscramble game!"),

    async execute(interaction) {
        await interaction.deferReply();

        const words = await loadWords();
        if (!words) {
            return interaction.editReply(
                "Could not load words for Unscramble. Please try again later.",
            );
        }

        const wordToUnscramble = selectRandomWord(words);
        const scrambledWord = scrambleWord(wordToUnscramble);
        let gameActive = true;
        let winner = null; // To track the winner

        const gameEmbed = createGameEmbed(scrambledWord);
        await interaction.editReply({ embeds: [gameEmbed] });

        const messageCollector = interaction.channel.createMessageCollector({
            filter: (m) => !m.author.bot && gameActive, // Any non-bot user can guess
            time: GAME_TIMEOUT_MS,
        });

        messageCollector.on("collect", async (message) => {
            const guess = message.content.trim().toLowerCase();

            if (guess === wordToUnscramble.toLowerCase()) {
                gameActive = false;
                winner = message.author; // Record the winner
                messageCollector.stop("win");
                return;
            } else {
                message
                    .react(INCORRECT_GUESS_EMOJI)
                    .catch((error) => handleError("Failed to react to message:", error)); // React with wrong emoji
            }
        });

        messageCollector.on("end", (_, reason) => {
            if (reason === "time") {
                const timeoutEmbed = createEndEmbed(
                    "Time's Up!",
                    `${TIME_UP_EMOJI} No one unscrambled it in time! The word was **${wordToUnscramble}**.`,
                    false,
                );
                interaction.followUp({ embeds: [timeoutEmbed] });
            } else if (reason === "win") {
                const winEmbed = createEndEmbed(
                    "We Have a Winner!",
                    `${CORRECT_GUESS_EMOJI} Congratulations **<@${winner.id}>**! You unscrambled **${scrambledWord}** to **${wordToUnscramble}**!`,
                    true,
                ); // Announce the winner
                interaction.followUp({ embeds: [winEmbed] });
            } else if (reason === "idle") {
                const gameoverEmbed = createEndEmbed(
                    "Game Over!",
                    `${GAME_OVER_EMOJI} No one guessed the word. The word was **${wordToUnscramble}**.`,
                    false,
                );
                interaction.followUp({ embeds: [gameoverEmbed] });
            }
        });
    },
};

// --- Helper Functions ---

async function loadWords() {
    try {
        const data = await fs.readFile(WORD_LIST_PATH, "utf-8");
        return data
            .split("\n")
            .map((word) => word.trim())
            .filter((word) => word);
    } catch (error) {
        handleError("Failed to load words:", error);
        return null;
    }
}

function selectRandomWord(words) {
    return words[Math.floor(Math.random() * words.length)];
}

function scrambleWord(word) {
    const letters = word.split("");
    // Fisher-Yates (Knuth) Shuffle algorithm for efficient and unbiased shuffling
    for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]]; // Swap elements
    }

    const scrambledWord = letters.join("");
    // Ensure scrambled word is different from the original
    if (scrambledWord === word && word.length > 2) {
        // For very short words, scrambling might result in the same word
        return scrambleWord(word); // Recursive call to scramble again if it's the same, for words longer than 2 chars
    }
    return scrambledWord;
}

function createGameEmbed(scrambledWord) {
    return new EmbedBuilder()
        .setColor(SCRAMBLE_EMBED_COLOR)
        .setTitle("Multiplayer Unscramble Challenge! 🔤") // Updated title for multiplayer
        .setDescription(
            `Unscramble the following word:\n\n**\`${scrambledWord.toUpperCase()}\`**\n\nType your guess in the chat! First to guess correctly wins!`,
        ) // Updated description for multiplayer
        .setFooter({
            text: `Game expires in ${GAME_TIMEOUT_MS / 60000} minutes. Good luck everyone!`,
        }); // Updated footer for multiplayer
}

function createEndEmbed(title, description, isWin) {
    return new EmbedBuilder()
        .setColor(isWin ? "#2ecc71" : "#e74c3c") // Green for win, Red for lose
        .setTitle(title)
        .setDescription(description);
}
