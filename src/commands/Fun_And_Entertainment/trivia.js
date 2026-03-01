const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder,
    MessageFlags,
} = require("discord.js");
const { handleError } = require("../../utils/errorHandler");
const he = require("he");
const Logger = require("../../utils/logger");

// Constants for styling and timeouts
const PRIMARY_COLOR = "#7289DA"; // Discord Blurple
const CORRECT_COLOR = "#4CAF50"; // Green
const WRONG_COLOR = "#F44336"; // Red
const TIMEOUT_COLOR = "#FFA000"; // Orange/Amber
const TRIVIA_TIMEOUT = 20000; // 20 seconds for answering
const ANSWER_BUTTON_LABELS = ["A", "B", "C", "D"];
const API_ENDPOINT = "https://opentdb.com/api.php?amount=1&type=multiple";
const API_TIMEOUT = 10000; // 10 seconds for API request

// Simple cache for trivia questions (helps with rate limiting)
const questionCache = {
    questions: [],
    lastFetch: 0,
    CACHE_DURATION: 300000, // 5 minutes
    MAX_CACHE_SIZE: 50,
};

module.exports = {
    cooldown: 10,
    description_full: "Tests your knowledge with a multiple-choice trivia question.",
    usage: "/trivia",
    examples: ["/trivia"],

    data: new SlashCommandBuilder()
        .setName("trivia")
        .setDescription("Start a trivia game and answer a question!"),

    async execute(interaction) {
        try {
            await interaction.deferReply(); // Defer reply for potential API delay
            const questionData = await fetchTriviaQuestion();
            if (!questionData) {
                return interaction.editReply({
                    content: "⚠️ Failed to fetch trivia question. Please try again later.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const questionAskedAt = Date.now();
            const { triviaEmbed, correctIndex } = createTriviaEmbed(questionData); // Get correctIndex from createTriviaEmbed
            const answerRow = createAnswerRow();

            const reply = await interaction.editReply({
                embeds: [triviaEmbed],
                components: [answerRow],
            }); // Get the message object after editReply

            const collector = createButtonCollector(interaction);
            handleCollectorEvents(
                collector,
                interaction,
                reply,
                questionData,
                triviaEmbed.data.fields,
                correctIndex,
                questionAskedAt,
            ); // Pass correctIndex
        } catch (error) {
            handleError("Trivia command error:", error);
            await interaction.editReply({
                content: "🤖 Uh oh! Something went wrong with the trivia game. Please try again.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

// --- Helper Functions ---

async function fetchTriviaQuestion() {
    // Check cache first
    if (questionCache.questions.length > 0) {
        const question = questionCache.questions.shift();
        Logger.debug(`Using cached trivia question. ${questionCache.questions.length} remaining.`);
        return question;
    }

    // Fetch new batch of questions
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(
            `https://opentdb.com/api.php?amount=${questionCache.MAX_CACHE_SIZE}&type=multiple`,
            { signal: controller.signal },
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
            Logger.error(`Trivia API HTTP error! status: ${response.status}`);
            return await fetchFallbackQuestion();
        }

        const data = await response.json();

        // Handle API response codes
        if (data.response_code === 1) {
            Logger.warn("No trivia questions available from API.");
            return null;
        }
        if (data.response_code === 2) {
            Logger.error("Invalid parameter in trivia API request.");
            return null;
        }
        if (data.response_code === 3 || data.response_code === 4) {
            Logger.warn("Trivia API token issues or rate limit.");
            return await fetchFallbackQuestion();
        }

        if (!data.results || data.results.length === 0) {
            Logger.warn("No trivia questions returned from API.");
            return null;
        }

        // Cache questions and return first one
        questionCache.questions = data.results.slice(1);
        questionCache.lastFetch = Date.now();
        Logger.debug(`Cached ${questionCache.questions.length} trivia questions.`);

        return data.results[0];
    } catch (error) {
        if (error.name === "AbortError") {
            Logger.error("Trivia API request timed out.");
        } else {
            Logger.error("Error fetching trivia question from API:", error);
        }
        return await fetchFallbackQuestion();
    }
}

/**
 * Fetches a single question as fallback (when batch fetch fails)
 */
async function fetchFallbackQuestion() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(API_ENDPOINT, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) return null;

        const data = await response.json();
        return data.results?.[0] || null;
    } catch (error) {
        Logger.error("Fallback trivia fetch also failed:", error);
        return null;
    }
}

function decodeHtmlEntities(text) {
    return he.decode(text);
}

function createTriviaEmbed(questionData) {
    const decodedQuestion = decodeHtmlEntities(questionData.question);
    const incorrectAnswers = questionData.incorrect_answers.map(decodeHtmlEntities);
    const correctAnswer = decodeHtmlEntities(questionData.correct_answer);
    const allAnswers = [...incorrectAnswers, correctAnswer].sort(() => Math.random() - 0.5);
    const correctIndex = allAnswers.indexOf(correctAnswer);

    Logger.debug(`Correct Answer from API: ${correctAnswer}`);
    Logger.debug(`All Answers Array: ${JSON.stringify(allAnswers)}`);
    Logger.debug(`Correct Index (calculated): ${correctIndex}`);

    const embed = new EmbedBuilder()
        .setColor(PRIMARY_COLOR)
        .setTitle("🎲 Trivia Time! 🧠")
        .setDescription(
            `**${decodedQuestion}**\n\n*Choose the correct answer below! You have ${TRIVIA_TIMEOUT / 1000} seconds.*`,
        )
        .setFooter({
            text: `Category: ${questionData.category} | Difficulty: ${questionData.difficulty.charAt(0).toUpperCase() + questionData.difficulty.slice(1)}`,
        })
        .addFields(createAnswerFields(allAnswers));

    return { triviaEmbed: embed, correctIndex };
}

function createAnswerFields(answers) {
    return answers.map((answer, index) => ({
        name: `Option ${ANSWER_BUTTON_LABELS[index]}`,
        value: answer || "*Error: Answer Missing*", // Handle potential undefined answer
        inline: true,
    }));
}

function createAnswerRow(disabled = false) {
    return new ActionRowBuilder().addComponents(
        ANSWER_BUTTON_LABELS.map((letter) =>
            new ButtonBuilder()
                .setCustomId(letter)
                .setLabel(letter)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled),
        ),
    );
}

function createButtonCollector(interaction) {
    const filter = (i) =>
        ANSWER_BUTTON_LABELS.includes(i.customId) && i.user.id === interaction.user.id;
    return interaction.channel.createMessageComponentCollector({
        filter,
        time: TRIVIA_TIMEOUT,
    });
}

function handleCollectorEvents(
    collector,
    interaction,
    reply,
    questionData,
    answerFields,
    correctAnswerIndex,
    askedAt,
) {
    let answered = false;
    const answers = answerFields.map((field) => field.value);

    collector.on("collect", async (i) => {
        answered = true;
        collector.stop(); // Stop collector immediately after an answer is collected
        const userAnswerIndex = ANSWER_BUTTON_LABELS.indexOf(i.customId); // userAnswerIndex from button click
        const isCorrect = userAnswerIndex === correctAnswerIndex;
        const answeredAt = Date.now();

        const resultEmbed = createResultEmbed(
            isCorrect,
            answers,
            correctAnswerIndex,
            userAnswerIndex,
            interaction,
            answeredAt - askedAt,
        );
        await i.update({ embeds: [resultEmbed], components: [] });
    });

    collector.on("end", async () => {
        if (!answered) {
            const timeoutEmbed = createTimeoutEmbed(answers, correctAnswerIndex);
            await reply.edit({ components: [createAnswerRow(true)] });
            await interaction.followUp({ embeds: [timeoutEmbed], components: [] }); // Use followUp for timeout message
        }
    });
}

function createResultEmbed(
    isCorrect,
    answers,
    correctAnswerIndex,
    userAnswerIndex,
    interaction,
    timeTakenMs,
) {
    Logger.debug(`createResultEmbed - Correct Answer Index: ${correctAnswerIndex}`);
    Logger.debug(`createResultEmbed - Answers Array: ${JSON.stringify(answers)}`);

    const timeTakenSeconds = Math.max(timeTakenMs || 0, 0) / 1000;

    const resultEmbed = new EmbedBuilder()
        .setColor(isCorrect ? CORRECT_COLOR : WRONG_COLOR)
        .setTitle(
            isCorrect
                ? "🎉 Correct Answer! You're a Trivia Star! 🎉"
                : "😢 Not quite, but keep trying! 🌟",
        )
        .setDescription(
            `The right answer is **${answers?.[correctAnswerIndex] || "*Error: Correct Answer Missing*"}**.`,
        ) // Safe access and fallback
        .addFields(
            {
                name: "Your Choice",
                value: answers?.[userAnswerIndex] || "*Error: Your Answer Missing*", // Safe access and fallback
                inline: true,
            },
            {
                name: "Correct Choice",
                value: answers?.[correctAnswerIndex] || "*Error: Correct Answer Missing*", // Safe access and fallback
                inline: true,
            },
        )
        .setFooter({
            text: `Answered in ${timeTakenSeconds.toFixed(2)} seconds!`,
        });
    return resultEmbed;
}

function createTimeoutEmbed(answers, correctAnswerIndex) {
    Logger.debug(`createTimeoutEmbed - Correct Answer Index: ${correctAnswerIndex}`);
    Logger.debug(`createTimeoutEmbed - Answers Array: ${JSON.stringify(answers)}`);
    return new EmbedBuilder()
        .setColor(TIMEOUT_COLOR)
        .setTitle("⏰ Time's Up! No answer in time. ⏱️")
        .setDescription(
            `The correct answer was **${answers?.[correctAnswerIndex] || "*Error: Correct Answer Missing*"}**.`,
        ) // Safe access and fallback
        .setFooter({ text: "Don't worry, there's always next question!" });
}
