const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { handleError } = require("../../utils/errorHandler");
const fs = require("fs").promises;
const path = require("path");

// --- Constants ---
const WORD_LIST_PATH = path.resolve(process.cwd(), "assets/texts/wordList.txt");
const MAX_GUESSES = 6;
const GAME_TIMEOUT = 300000; // 5 minutes
const GAME_COLOR = 0x0099ff;
const GAME_OVER_COLOR = 0xff0000;
const WIN_COLOR = 0x00ff00;
const TIMEOUT_COLOR = 0xffa500;

const HANGMAN_IMAGES = [
    "https://upload.wikimedia.org/wikipedia/commons/8/8b/Hangman-0.png",
    "https://upload.wikimedia.org/wikipedia/commons/3/37/Hangman-1.png",
    "https://upload.wikimedia.org/wikipedia/commons/7/70/Hangman-2.png",
    "https://upload.wikimedia.org/wikipedia/commons/9/97/Hangman-3.png",
    "https://upload.wikimedia.org/wikipedia/commons/2/27/Hangman-4.png",
    "https://upload.wikimedia.org/wikipedia/commons/6/6b/Hangman-5.png",
    "https://upload.wikimedia.org/wikipedia/commons/d/d6/Hangman-6.png",
];

const LETTERS_A_M = "ABCDEFGHIJKLM".split("");
const LETTERS_N_Z = "NOPQRSTUVWXYZ".split("");

module.exports = {
    cooldown: 10,
    description_full:
        "Play hangman with interactive buttons. Anyone in the channel can participate!",
    usage: "/hangman",
    examples: ["/hangman"],

    data: new SlashCommandBuilder()
        .setName("hangman")
        .setDescription("Start an interactive multiplayer game of hangman"),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Load words
            const words = await loadWords();
            if (!words || words.length === 0) {
                return handleError(
                    interaction,
                    new Error("Word list is empty or missing."),
                    "CONFIGURATION",
                    "The hangman game is not properly configured. Please contact an administrator.",
                );
            }

            const word = selectWord(words);
            const state = initState(word);

            const embed = buildEmbed(state);
            const components = buildKeyboard(state, /*page*/ "A");

            const msg = await interaction.editReply({ embeds: [embed], components });

            // Component collector for this game message
            let currentPage = "A"; // "A" (A–M) or "N" (N–Z)
            const collector = msg.createMessageComponentCollector({
                time: GAME_TIMEOUT,
                filter: (i) => i.message.id === msg.id,
            });

            collector.on("collect", async (i) => {
                try {
                    const [ns, kind, payload] = i.customId.split(":");
                    if (ns !== "hangman") return; // ignore foreign components

                    if (kind === "toggle") {
                        currentPage = currentPage === "A" ? "N" : "A";
                        const updatedComponents = buildKeyboard(state, currentPage);
                        return i.update({ components: updatedComponents });
                    }

                    if (kind === "guess") {
                        const letter = String(payload || "").toUpperCase();

                        // Already guessed? Reply ephemeral
                        if (state.guessedLetters.includes(letter)) {
                            return i.reply({
                                content: `You've already guessed the letter ${letter}.`,
                                ephemeral: true,
                            });
                        }

                        // Record guess
                        state.guessedLetters.push(letter);

                        if (state.word.includes(letter)) {
                            updateMask(state);
                        } else {
                            state.remainingGuesses -= 1;
                        }

                        // Check end conditions
                        if (checkWin(state)) {
                            collector.stop("win");
                            const winEmbed = buildFinalEmbed(
                                "🎊 We have a winner!",
                                `The word was **${state.word}**. Nice job, <@${i.user.id}>!`,
                                WIN_COLOR,
                            );
                            return i.update({ embeds: [winEmbed], components: [] });
                        }

                        if (checkLose(state)) {
                            collector.stop("lose");
                            const loseEmbed = buildFinalEmbed(
                                "💀 Game Over!",
                                `You ran out of guesses. The word was **${state.word}**.`,
                                GAME_OVER_COLOR,
                            );
                            return i.update({ embeds: [loseEmbed], components: [] });
                        }

                        // Otherwise refresh board
                        const refreshed = buildEmbed(state);
                        const updatedComponents = buildKeyboard(state, currentPage);
                        return i.update({ embeds: [refreshed], components: updatedComponents });
                    }
                } catch (err) {
                    handleError(i, err);
                }
            });

            collector.on("end", async (collected, reason) => {
                if (reason === "win" || reason === "lose") return; // already updated
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(TIMEOUT_COLOR)
                    .setTitle("⏰ Time's up!")
                    .setDescription(`The word was **${state.word}**.`);
                try {
                    await msg.edit({ embeds: [timeoutEmbed], components: [] });
                } catch (e3) {
                    // Log quietly, game is over and user can't be notified.
                    handleError(null, e3);
                }
            });
        } catch (error) {
            handleError(interaction, error);
        }
    },
};

// --- Helpers ---

async function loadWords() {
    try {
        const data = await fs.readFile(WORD_LIST_PATH, "utf-8");
        return data
            .split("\n")
            .map((w) => w.trim())
            .filter((w) => w && /^[a-zA-Z]+$/.test(w))
            .map((w) => w.toUpperCase());
    } catch (err) {
        // Log the error but return null to be handled by the caller
        handleError(null, new Error(`Failed to read word list: ${err.message}`), "CONFIGURATION");
        return null;
    }
}

function selectWord(words) {
    return words[Math.floor(Math.random() * words.length)];
}

function initState(word) {
    return {
        word, // UPPERCASE
        guessedLetters: [],
        remainingGuesses: MAX_GUESSES,
        mask: maskWord(word, []),
    };
}

function maskWord(word, guessed) {
    return word
        .split("")
        .map((ch) => (guessed.includes(ch) ? ch : "_"))
        .join(" ");
}

function updateMask(state) {
    state.mask = maskWord(state.word, state.guessedLetters);
}

function checkWin(state) {
    return state.mask.replace(/\s+/g, "") === state.word;
}

function checkLose(state) {
    return state.remainingGuesses <= 0;
}

function buildEmbed(state) {
    const hearts = "❤".repeat(Math.max(0, state.remainingGuesses));
    const imgIdx = Math.max(
        0,
        Math.min(HANGMAN_IMAGES.length - 1, MAX_GUESSES - state.remainingGuesses),
    );
    return new EmbedBuilder()
        .setColor(GAME_COLOR)
        .setTitle("🎭 Hangman — Multiplayer")
        .setDescription(
            `Guess the word together by pressing letter buttons!\n\n\u200B\n${codeBlock(state.mask)}`,
        )
        .setThumbnail(HANGMAN_IMAGES[imgIdx])
        .addFields(
            { name: "Guesses left", value: hearts || "None", inline: true },
            {
                name: "Guessed letters",
                value: state.guessedLetters.length ? state.guessedLetters.join(", ") : "None",
                inline: true,
            },
        )
        .setFooter({ text: "Use the keyboard below. Toggle to see more letters." });
}

function buildFinalEmbed(title, desc, color) {
    return new EmbedBuilder().setColor(color).setTitle(title).setDescription(desc);
}

function codeBlock(text) {
    return "```" + text + "```";
}

function buildKeyboard(state, page) {
    const letters = page === "A" ? LETTERS_A_M : LETTERS_N_Z;

    // Build rows up to 3 for 13 letters (5+5+3)
    const rows = [new ActionRowBuilder(), new ActionRowBuilder(), new ActionRowBuilder()];

    letters.forEach((L, idx) => {
        const rowIdx = idx < 5 ? 0 : idx < 10 ? 1 : 2;
        rows[rowIdx].addComponents(
            new ButtonBuilder()
                .setCustomId(`hangman:guess:${L}`)
                .setLabel(L)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(state.guessedLetters.includes(L)),
        );
    });

    // Toggle page button row
    const toggle = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("hangman:toggle:")
            .setLabel(page === "A" ? "Show N–Z" : "Show A–M")
            .setStyle(ButtonStyle.Primary),
    );

    return [...rows, toggle];
}
