const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder,
} = require("discord.js");
const { handleError } = require("../../utils/errorHandler");
const axios = require("axios");

// API Configuration
const LRCLIB_BASE_URL = "https://lrclib.net/api";
const ITUNES_SEARCH_BASE_URL = "https://itunes.apple.com/search";
const VAGALUME_BASE_URL = "https://api.vagalume.com.br/search.php";
const LYRICS_OVH_BASE_URL = "https://api.lyrics.ovh/v1";

// API Health Check
const apiHealth = {
    lrclib: { failures: 0, lastCheck: 0 },
    vagalume: { failures: 0, lastCheck: 0 },
    lyricsOvh: { failures: 0, lastCheck: 0 },
    itunes: { failures: 0, lastCheck: 0 },
    MAX_FAILURES: 3,
    COOLDOWN_MS: 60000, // 1 minute
};

// Game Configuration
const GAME_CONFIG = {
    COLORS: {
        GAME: "#7289DA",
        CORRECT: "#4CAF50",
        WRONG: "#F44336",
        SKIP: "#FFC107",
        FINAL: "#9C27B0",
        ERROR: "#FF5722",
    },
    TIMING: {
        ROUND_DELAY: 5000,
        GUESS_TIME: 30000,
        API_TIMEOUT: 10000, // Increased from 7000 to 10000
    },
    GAME: {
        MAX_ROUNDS: 5,
        MIN_SNIPPET_LENGTH: 50,
        MAX_SNIPPET_LENGTH: 120,
        BLANK_INTERVAL: 3, // Blank every 3rd word
        MAX_SONG_ATTEMPTS: 5,
    },
    FILL_BLANK_CHAR: "_____",
};

// Genre keywords for diverse song selection
const GENRES_KEYWORDS = [
    "pop",
    "rock",
    "hip hop",
    "r&b",
    "electronic",
    "dance",
    "country",
    "latin",
    "indie",
    "metal",
    "alternative",
    "soul",
];

// ============================================================
// Main Command Export
// ============================================================
module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("lyricwhiz")
        .setDescription("Play a lyric fill-in-the-blanks guessing game!")
        .addIntegerOption((option) =>
            option
                .setName("rounds")
                .setDescription(`Number of rounds to play (1-${GAME_CONFIG.GAME.MAX_ROUNDS})`)
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(GAME_CONFIG.GAME.MAX_ROUNDS),
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const gameState = {
            rounds: Math.min(interaction.options.getInteger("rounds"), GAME_CONFIG.GAME.MAX_ROUNDS),
            currentRound: 0,
            score: 0,
            userId: interaction.user.id,
        };

        await runGame(interaction, gameState);
    },
};

// ============================================================
// Game Logic
// ============================================================

/**
 * Main game loop - handles multiple rounds
 */
async function runGame(interaction, gameState) {
    while (gameState.currentRound < gameState.rounds) {
        gameState.currentRound++;

        try {
            const songData = await fetchSongData();
            const roundResult = await playRound(interaction, gameState, songData);

            if (roundResult === "error") {
                await sendErrorEmbed(interaction);
                return;
            }

            if (roundResult === "correct") {
                gameState.score++;
            }

            // Delay between rounds (except after last round)
            if (gameState.currentRound < gameState.rounds) {
                await sleep(GAME_CONFIG.TIMING.ROUND_DELAY);
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "LyricWhiz failed to run this round.",
            );
            await sendErrorEmbed(interaction);
            return;
        }
    }

    await sendFinalScore(interaction, gameState);
}

/**
 * Plays a single round and returns the result
 */
async function playRound(interaction, gameState, songData) {
    const { artist, title, fillInLyrics, hintWords } = songData;

    // Send round question
    const questionEmbed = createRoundEmbed(gameState, fillInLyrics);
    const skipButton = createSkipButton();

    await interaction.editReply({
        embeds: [questionEmbed],
        components: [skipButton],
    });

    // Collect user responses
    const result = await collectUserResponse(interaction, gameState.userId, {
        artist,
        title,
        hintWords,
    });

    // Send round result
    await sendRoundResult(interaction, result, { artist, title, gameState });

    return result.type;
}

/**
 * Collects user responses (messages and button clicks) with proper handling
 */
async function collectUserResponse(interaction, userId, answerData) {
    return new Promise((resolve) => {
        let answered = false;
        const { artist, title, hintWords } = answerData;

        // Create collectors
        const messageCollector = interaction.channel.createMessageCollector({
            filter: (m) => m.author.id === userId,
            time: GAME_CONFIG.TIMING.GUESS_TIME,
        });

        const buttonCollector = interaction.channel.createMessageComponentCollector({
            filter: (i) => i.user.id === userId && i.customId === "skip_round",
            time: GAME_CONFIG.TIMING.GUESS_TIME,
        });

        // Handle message guesses
        messageCollector.on("collect", (message) => {
            if (answered) return;

            if (checkAnswer(message.content, { artist, title, hintWords })) {
                answered = true;
                cleanup("correct");
            }
        });

        // Handle skip button
        buttonCollector.on("collect", async (i) => {
            if (answered) return;
            answered = true;
            await i.deferUpdate().catch(() => {});
            cleanup("skipped");
        });

        // Handle timeout
        messageCollector.on("end", (collected, reason) => {
            if (!answered && reason === "time") {
                answered = true;
                cleanup("timeout");
            }
        });

        function cleanup(type) {
            messageCollector.stop();
            buttonCollector.stop();
            resolve({ type });
        }
    });
}

/**
 * Enhanced answer checking with fuzzy matching and multiple formats
 */
function checkAnswer(guess, { artist, title, hintWords = [] }) {
    const normalized = normalizeText(guess);
    const normalizedTitle = normalizeText(title);
    const normalizedArtist = normalizeText(artist);

    // Use hintWords (if provided) to allow quicker matches: if any hint word appears in the guess, accept it.
    const normalizedHintWords = (hintWords || []).map(normalizeText).filter(Boolean);
    if (normalizedHintWords.length > 0) {
        if (normalizedHintWords.some((hw) => normalized.includes(hw))) return true;
    }

    // Exact title match
    if (normalized === normalizedTitle) return true;

    // Title by Artist
    if (normalized === `${normalizedTitle} by ${normalizedArtist}`) return true;

    // Artist - Title
    if (normalized === `${normalizedArtist} ${normalizedTitle}`) return true;

    // Check if guess contains all hint words and title words (fuzzy match)
    const guessWords = normalized.split(/\s+/);
    const titleWords = normalizedTitle.split(/\s+/).filter((w) => w.length > 2);

    if (titleWords.length > 0) {
        const titleWordsMatched = titleWords.every((word) =>
            guessWords.some((gw) => gw.includes(word) || word.includes(gw)),
        );
        if (titleWordsMatched && guessWords.length <= titleWords.length + 2) {
            return true;
        }
    }

    return false;
}

/**
 * Normalizes text for comparison
 */
function normalizeText(text) {
    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// ============================================================
// Data Fetching
// ============================================================

/**
 * Checks if an API is healthy (not in cooldown)
 */
function isApiHealthy(apiName) {
    const health = apiHealth[apiName];
    if (!health) return true;

    const now = Date.now();
    if (health.failures >= apiHealth.MAX_FAILURES) {
        if (now - health.lastCheck < apiHealth.COOLDOWN_MS) {
            return false;
        }
        // Reset after cooldown
        health.failures = 0;
    }
    return true;
}

/**
 * Records API failure
 */
function recordApiFailure(apiName) {
    const health = apiHealth[apiName];
    if (health) {
        health.failures++;
        health.lastCheck = Date.now();
    }
}

/**
 * Records API success
 */
function recordApiSuccess(apiName) {
    const health = apiHealth[apiName];
    if (health) {
        health.failures = Math.max(0, health.failures - 1);
    }
}

/**
 * Fetches song data with lyrics from multiple sources
 */
async function fetchSongData() {
    const genre = selectRandomGenre();

    // Get candidate tracks from iTunes
    const tracks = await fetchTracksFromItunes(genre);
    if (!tracks.length) {
        throw new Error(`No tracks found for genre: ${genre}`);
    }

    // Try to find a track with lyrics
    for (let i = 0; i < Math.min(GAME_CONFIG.GAME.MAX_SONG_ATTEMPTS, tracks.length); i++) {
        const track = selectRandomTrack(tracks);
        const { artist, title, durationSec } = track;

        // Try multiple lyrics sources
        const lyrics = await fetchLyrics({ artist, title, durationSec });

        if (lyrics) {
            const { snippet, hintWords } = createLyricSnippet(lyrics);
            return {
                artist,
                title,
                lyrics,
                fillInLyrics: snippet,
                hintWords,
            };
        }
    }

    throw new Error("Could not find lyrics for any song");
}

/**
 * Fetches tracks from iTunes API
 */
async function fetchTracksFromItunes(genre) {
    if (!isApiHealthy("itunes")) {
        throw new Error("iTunes API is temporarily unavailable. Please try again later.");
    }

    try {
        const response = await axios.get(ITUNES_SEARCH_BASE_URL, {
            params: {
                term: genre,
                media: "music",
                entity: "song",
                limit: 50,
            },
            timeout: GAME_CONFIG.TIMING.API_TIMEOUT,
            headers: {
                "User-Agent": "Discord-Bot-LyricWhiz",
            },
        });

        if (!response.data || !response.data.results) {
            throw new Error("Invalid response from iTunes API");
        }

        const tracks = (response.data.results || []).map((track) => ({
            artist: sanitizeText(track.artistName),
            title: sanitizeText(track.trackName),
            durationSec: track.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : null,
        }));

        if (tracks.length === 0) {
            throw new Error("No tracks found from iTunes API");
        }

        recordApiSuccess("itunes");
        return tracks;
    } catch (error) {
        recordApiFailure("itunes");
        console.error(`iTunes API error while fetching tracks: ${error.message || error}`);

        if (error.code === "ECONNABORTED") {
            throw new Error("iTunes API request timed out. Please try again.");
        }
        if (error.response?.status === 429) {
            throw new Error("iTunes API rate limit exceeded. Please wait a moment.");
        }

        throw error;
    }
}

/**
 * Attempts to fetch lyrics from multiple sources
 */
async function fetchLyrics({ artist, title, durationSec }) {
    let lastError = null;

    // Try LRCLIB first (best quality)
    if (isApiHealthy("lrclib")) {
        try {
            const lyrics = await fetchLyricsFromLRCLIB({ artist, title, durationSec });
            if (lyrics) {
                recordApiSuccess("lrclib");
                return lyrics;
            }
        } catch (error) {
            recordApiFailure("lrclib");
            lastError = error;
        }
    }

    // Try Vagalume if API key is available
    const vagalumeKey = process.env.VAGALUME_API_KEY;
    if (vagalumeKey && isApiHealthy("vagalume")) {
        try {
            const lyrics = await fetchLyricsFromVagalume({ artist, title, apikey: vagalumeKey });
            if (lyrics) {
                recordApiSuccess("vagalume");
                return lyrics;
            }
        } catch (error) {
            recordApiFailure("vagalume");
            lastError = error;
        }
    }

    // Last resort: lyrics.ovh
    if (isApiHealthy("lyricsOvh")) {
        try {
            const lyrics = await fetchLyricsFromLyricsOVH({ artist, title });
            if (lyrics) {
                recordApiSuccess("lyricsOvh");
                return lyrics;
            }
        } catch (error) {
            recordApiFailure("lyricsOvh");
            lastError = error;
        }
    }

    if (lastError) {
        console.error(`All lyrics APIs failed for "${title}" by ${artist}:`, lastError.message);
    }

    return null;
}

/**
 * Fetches lyrics from LRCLIB API
 */
async function fetchLyricsFromLRCLIB({ artist, title, durationSec }) {
    try {
        const params = new URLSearchParams({
            track_name: title,
            artist_name: artist,
        });

        if (typeof durationSec === "number" && Number.isFinite(durationSec)) {
            params.append("duration", String(durationSec));
        }

        const response = await axios.get(`${LRCLIB_BASE_URL}/get?${params.toString()}`, {
            timeout: GAME_CONFIG.TIMING.API_TIMEOUT,
            headers: {
                "User-Agent": "Discord-Bot-LyricWhiz",
            },
        });

        const lyrics = response.data?.plainLyrics;
        if (!lyrics || typeof lyrics !== "string") {
            return null;
        }

        const trimmed = lyrics.trim();
        return trimmed.length > 50 ? trimmed : null;
    } catch (error) {
        if (error.code === "ECONNABORTED") {
            console.warn("LRCLIB API timeout");
        } else if (error.response?.status === 404) {
            // Song not found is expected, not an error
            return null;
        } else {
            console.error("LRCLIB API error:", error.message);
        }
        return null;
    }
}

/**
 * Fetches lyrics from Vagalume API
 */
async function fetchLyricsFromVagalume({ artist, title, apikey }) {
    if (!apikey || typeof apikey !== "string") {
        return null;
    }

    try {
        const response = await axios.get(VAGALUME_BASE_URL, {
            params: { art: artist, mus: title, apikey },
            timeout: GAME_CONFIG.TIMING.API_TIMEOUT,
            headers: {
                "User-Agent": "Discord-Bot-LyricWhiz",
            },
        });

        const musArray = response.data?.mus;
        const lyrics = Array.isArray(musArray) && musArray[0]?.text;

        if (!lyrics || typeof lyrics !== "string") {
            return null;
        }

        const trimmed = lyrics.trim();
        return trimmed.length > 50 ? trimmed : null;
    } catch (error) {
        if (error.code === "ECONNABORTED") {
            console.warn("Vagalume API timeout");
        } else if (error.response?.status === 403) {
            console.error("Vagalume API: Invalid API key");
        } else if (error.response?.status === 404) {
            return null; // Song not found is expected
        } else {
            console.error("Vagalume API error:", error.message);
        }
        return null;
    }
}

/**
 * Fetches lyrics from Lyrics.ovh API
 */
async function fetchLyricsFromLyricsOVH({ artist, title }) {
    try {
        const url = `${LYRICS_OVH_BASE_URL}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
        const response = await axios.get(url, {
            timeout: GAME_CONFIG.TIMING.API_TIMEOUT,
            headers: {
                "User-Agent": "Discord-Bot-LyricWhiz",
            },
        });

        const lyrics = response.data?.lyrics;

        if (!lyrics || typeof lyrics !== "string") {
            return null;
        }

        const trimmed = lyrics.trim();
        return trimmed.length > 50 ? trimmed : null;
    } catch (error) {
        if (error.code === "ECONNABORTED") {
            console.warn("Lyrics.ovh API timeout");
        } else if (error.response?.status === 404) {
            return null; // Song not found is expected
        } else {
            console.error("Lyrics.ovh API error:", error.message);
        }
        return null;
    }
}

// ============================================================
// Lyric Processing
// ============================================================

/**
 * Creates a fill-in-the-blank snippet from lyrics with intelligent word selection
 */
function createLyricSnippet(lyrics) {
    const snippet = selectBestSnippet(lyrics);
    const { blankedSnippet, hintWords } = blankWordsIntelligently(snippet);

    return {
        snippet: blankedSnippet,
        hintWords,
    };
}

/**
 * Selects the best lyric snippet based on length and content quality
 */
function selectBestSnippet(lyrics) {
    const lines = lyrics
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length === 0) return "";

    const { MIN_SNIPPET_LENGTH, MAX_SNIPPET_LENGTH } = GAME_CONFIG.GAME;

    // Try to find a good consecutive snippet
    for (let attempt = 0; attempt < 5; attempt++) {
        const startIdx = Math.floor(Math.random() * Math.max(1, lines.length - 1));

        // Combine lines until we reach desired length
        let snippet = "";
        let lineCount = 0;

        for (let i = startIdx; i < lines.length && lineCount < 3; i++) {
            const line = lines[i];

            // Skip very short lines or repetitive lines
            if (line.length < 10 || isLikelyChorus(line)) continue;

            snippet += (snippet ? " " : "") + line;
            lineCount++;

            // Check if snippet is in acceptable range
            if (snippet.length >= MIN_SNIPPET_LENGTH && snippet.length <= MAX_SNIPPET_LENGTH) {
                return addEllipses(snippet);
            }

            // If too long, trim to word boundary
            if (snippet.length > MAX_SNIPPET_LENGTH) {
                const lastSpace = snippet.lastIndexOf(" ", MAX_SNIPPET_LENGTH);
                if (lastSpace > MIN_SNIPPET_LENGTH) {
                    return addEllipses(snippet.slice(0, lastSpace));
                }
            }
        }

        if (snippet.length >= MIN_SNIPPET_LENGTH) {
            return addEllipses(snippet);
        }
    }

    // Fallback: use first suitable line
    const suitableLine = lines.find((l) => l.length >= MIN_SNIPPET_LENGTH);
    return addEllipses(
        suitableLine
            ? suitableLine.slice(0, MAX_SNIPPET_LENGTH)
            : lines[0].slice(0, MAX_SNIPPET_LENGTH),
    );
}

/**
 * Checks if a line is likely a chorus (repetitive pattern)
 */
function isLikelyChorus(line) {
    const lower = line.toLowerCase();
    return (
        lower.includes("chorus") ||
        lower.includes("repeat") ||
        /(.+)\1{2,}/.test(lower) || // Repeated patterns
        lower.split(" ").filter((w, i, arr) => arr.indexOf(w) !== i).length > 3 // Many repeated words
    );
}

/**
 * Intelligently blanks words - prioritizes nouns, verbs, and meaningful words
 */
function blankWordsIntelligently(text) {
    const tokens = text.split(/(\s+)/); // Preserve whitespace
    const words = [];
    const wordIndices = [];

    // Identify actual words (not whitespace or punctuation)
    tokens.forEach((token, idx) => {
        if (/[a-zA-Z]{2,}/.test(token)) {
            words.push(token);
            wordIndices.push(idx);
        }
    });

    if (words.length === 0) return { blankedSnippet: text, hintWords: [] };

    // Score words based on importance (longer words, less common words)
    const wordScores = words.map((word) => ({
        word,
        score: calculateWordImportance(word),
    }));

    // Sort by importance and select words to blank
    wordScores.sort((a, b) => b.score - a.score);
    const numToBlank = Math.max(2, Math.floor(words.length / GAME_CONFIG.GAME.BLANK_INTERVAL));
    const wordsToBlank = new Set(
        wordScores.slice(0, numToBlank).map((ws) => ws.word.toLowerCase()),
    );

    // Keep track of hint words (words that remain visible)
    const hintWords = words
        .filter((w) => !wordsToBlank.has(w.toLowerCase()))
        .map((w) => normalizeText(w))
        .filter((w) => w.length > 2);

    // Build blanked snippet
    let blankedSnippet = "";

    tokens.forEach((token) => {
        if (/[a-zA-Z]{2,}/.test(token)) {
            if (wordsToBlank.has(token.toLowerCase())) {
                blankedSnippet += GAME_CONFIG.FILL_BLANK_CHAR;
            } else {
                blankedSnippet += token;
            }
        } else {
            blankedSnippet += token;
        }
    });

    return { blankedSnippet, hintWords };
}

/**
 * Calculates word importance for blanking decisions
 */
function calculateWordImportance(word) {
    const lower = word.toLowerCase();
    let score = word.length; // Longer words are more important

    // Common words get lower scores
    const commonWords = new Set([
        "the",
        "and",
        "but",
        "for",
        "with",
        "from",
        "this",
        "that",
        "what",
        "when",
        "where",
        "who",
        "how",
        "can",
        "will",
        "are",
        "was",
        "been",
        "have",
        "has",
        "had",
        "not",
        "you",
        "your",
        "like",
        "just",
        "know",
    ]);

    if (commonWords.has(lower)) {
        score -= 10;
    }

    // Proper nouns (capitalized) get bonus
    if (word[0] === word[0].toUpperCase() && word.length > 1) {
        score += 5;
    }

    return score;
}

// ============================================================
// UI Components
// ============================================================

/**
 * Creates the round question embed
 */
function createRoundEmbed(gameState, fillInLyrics) {
    return new EmbedBuilder()
        .setColor(GAME_CONFIG.COLORS.GAME)
        .setTitle(`🎵 Lyric Whiz - Round ${gameState.currentRound}/${gameState.rounds}`)
        .setDescription(
            `Fill in the blanks and guess the song:\n\n\`\`\`${fillInLyrics}\`\`\`\n\n` +
                `**💡 Hint:** Type the song title or "title by artist"`,
        )
        .setFooter({
            text: `⏱️ You have ${GAME_CONFIG.TIMING.GUESS_TIME / 1000} seconds | Score: ${gameState.score}/${gameState.currentRound - 1}`,
        });
}

/**
 * Creates the skip button
 */
function createSkipButton() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("skip_round")
            .setLabel("⏭️ Skip")
            .setStyle(ButtonStyle.Secondary),
    );
}

/**
 * Sends the result of a round
 */
async function sendRoundResult(interaction, result, { artist, title, gameState }) {
    const embeds = {
        correct: new EmbedBuilder()
            .setColor(GAME_CONFIG.COLORS.CORRECT)
            .setTitle("🎉 Correct!")
            .setDescription(
                `**Awesome!** You got it right!\n\n` +
                    `🎵 **"${title}"** by **${artist}**\n\n` +
                    `📊 Current Score: **${gameState.score}/${gameState.currentRound}**`,
            ),

        timeout: new EmbedBuilder()
            .setColor(GAME_CONFIG.COLORS.WRONG)
            .setTitle("⏰ Time's Up!")
            .setDescription(
                `**Out of time!** Better luck next round.\n\n` +
                    `🎵 The song was **"${title}"** by **${artist}**\n\n` +
                    `📊 Current Score: **${gameState.score}/${gameState.currentRound}**`,
            ),

        skipped: new EmbedBuilder()
            .setColor(GAME_CONFIG.COLORS.SKIP)
            .setTitle("⏭️ Skipped!")
            .setDescription(
                `**No worries!** Moving to the next round.\n\n` +
                    `🎵 The song was **"${title}"** by **${artist}**\n\n` +
                    `📊 Current Score: **${gameState.score}/${gameState.currentRound}**`,
            ),
    };

    await interaction.followUp({
        embeds: [embeds[result.type]],
        components: [], // Remove buttons
    });
}

/**
 * Sends the final score embed
 */
async function sendFinalScore(interaction, gameState) {
    const percentage = (gameState.score / gameState.rounds) * 100;
    const message = getFinalMessage(percentage);
    const emoji = getScoreEmoji(percentage);

    const finalEmbed = new EmbedBuilder()
        .setColor(GAME_CONFIG.COLORS.FINAL)
        .setTitle(`${emoji} Game Over!`)
        .setDescription(
            `**Final Score: ${gameState.score}/${gameState.rounds}** (${percentage.toFixed(0)}%)\n\n${message}`,
        )
        .setFooter({
            text: "Thanks for playing Lyric Whiz! Play again anytime!",
        })
        .setTimestamp();

    await interaction.followUp({
        embeds: [finalEmbed],
        components: [],
    });
}

/**
 * Sends error embed
 */
async function sendErrorEmbed(interaction) {
    const errorEmbed = new EmbedBuilder()
        .setColor(GAME_CONFIG.COLORS.ERROR)
        .setTitle("❌ Game Error")
        .setDescription(
            "Oops! Something went wrong while fetching a song.\n" +
                "Please try again in a moment. If the issue persists, contact support.",
        )
        .setFooter({ text: "Error: Unable to fetch song data" });

    await interaction.editReply({
        embeds: [errorEmbed],
        components: [],
    });
}

// ============================================================
// Helper Functions
// ============================================================

function selectRandomGenre() {
    return GENRES_KEYWORDS[Math.floor(Math.random() * GENRES_KEYWORDS.length)];
}

function selectRandomTrack(tracks) {
    const idx = Math.floor(Math.random() * tracks.length);
    return tracks.splice(idx, 1)[0];
}

function sanitizeText(text) {
    return String(text || "")
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .trim();
}

function addEllipses(text) {
    return text.trim() ? `… ${text.trim()} …` : text;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getScoreEmoji(percentage) {
    if (percentage === 100) return "🏆";
    if (percentage >= 80) return "🌟";
    if (percentage >= 60) return "🎵";
    if (percentage >= 40) return "🎧";
    return "🎼";
}

function getFinalMessage(percentage) {
    if (percentage === 100) {
        return "🎤 **Perfect score!** You're a true Lyric Whiz champion! Absolutely incredible!";
    } else if (percentage >= 80) {
        return "✨ **Amazing!** You're a lyrical superstar! Your music knowledge is impressive!";
    } else if (percentage >= 60) {
        return "🎶 **Great job!** You really know your music! Keep jamming!";
    } else if (percentage >= 40) {
        return "🎸 **Not bad!** You have a good ear for music! Keep practicing!";
    } else if (percentage >= 20) {
        return "📻 **Room to grow!** Time to update that playlist and try again!";
    } else {
        return "🎹 **Keep trying!** Everyone starts somewhere. More music, more fun!";
    }
}
