const { SlashCommandBuilder, MessageFlags, PollLayoutType, EmbedBuilder } = require("discord.js");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 15,
    description_full: "Poll utilities: create a poll, end a poll, or fetch current/final results.",
    usage: "/poll create question:<text> answers:<comma-separated> [multi_select] [duration] | /poll end message_id:<id> channel:<channel> | /poll fetch message_id:<id> channel:<channel>",
    examples: [
        '/poll create question:"Favorite color?" answers:"Red,Blue,Green" multi_select:false duration:24',
        '/poll end message_id:"123456789012345678" channel:#general',
        '/poll fetch message_id:"123456789012345678" channel:#polls',
    ],

    data: new SlashCommandBuilder()
        .setName("poll")
        .setDescription("Create, end, or fetch poll results")
        .addSubcommand((sub) =>
            sub
                .setName("create")
                .setDescription("Create an interactive poll")
                .addStringOption((option) =>
                    option
                        .setName("question")
                        .setDescription("The poll question (max 300 characters)")
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("answers")
                        .setDescription("Poll answers separated by commas (1-10 answers)")
                        .setRequired(true),
                )
                .addBooleanOption((option) =>
                    option
                        .setName("multi_select")
                        .setDescription("Allow multiple answers")
                        .setRequired(false),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("duration")
                        .setDescription("Poll duration in hours (1-768)")
                        .setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("end")
                .setDescription("End a poll")
                .addStringOption((option) =>
                    option
                        .setName("message_id")
                        .setDescription("Message ID of the poll")
                        .setRequired(true),
                )
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Channel where the poll is created")
                        .setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("fetch")
                .setDescription("Fetch poll answers/results")
                .addStringOption((option) =>
                    option
                        .setName("message_id")
                        .setDescription("Message ID of the poll")
                        .setRequired(true),
                )
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Channel where the poll is created")
                        .setRequired(true),
                ),
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "create") {
            try {
                const question = interaction.options.getString("question");
                const answersInput = interaction.options.getString("answers");
                const multiSelect = interaction.options.getBoolean("multi_select") ?? false;
                const durationHours = interaction.options.getInteger("duration") ?? 24;

                const CONSTRAINTS = {
                    MAX_POLL_DURATION_HOURS: 32 * 24,
                    MIN_ANSWERS: 1,
                    MAX_ANSWERS: 10,
                    MAX_QUESTION_LENGTH: 300,
                    MAX_ANSWER_LENGTH: 55,
                };

                // Parse and validate answers
                const answers = answersInput
                    .split(",")
                    .map((answer) => answer.trim())
                    .filter((answer) => answer.length > 0);

                if (answers.length < CONSTRAINTS.MIN_ANSWERS) {
                    return interaction.reply({
                        content: `❌ Please provide at least ${CONSTRAINTS.MIN_ANSWERS} answer for the poll.`,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                if (answers.length > CONSTRAINTS.MAX_ANSWERS) {
                    return interaction.reply({
                        content: `❌ Maximum ${CONSTRAINTS.MAX_ANSWERS} answers allowed. You provided ${answers.length} answers.`,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const tooLongAnswers = answers.filter(
                    (answer) => answer.length > CONSTRAINTS.MAX_ANSWER_LENGTH,
                );
                if (tooLongAnswers.length > 0) {
                    return interaction.reply({
                        content:
                            `❌ Answer text too long (max ${CONSTRAINTS.MAX_ANSWER_LENGTH} characters):\n` +
                            tooLongAnswers
                                .map((a) => `• "${a.substring(0, 50)}..." (${a.length} chars)`) // safe preview
                                .join("\n"),
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const pollData = {
                    question: { text: question },
                    answers: answers.map((answer) => ({ text: answer })),
                    allowMultiselect: multiSelect,
                    duration: durationHours,
                    layoutType: PollLayoutType.Default,
                };

                await interaction.reply({
                    content: `📊 **Poll Created!**\n> **Duration:** ${durationHours} hour${durationHours !== 1 ? "s" : ""}\n> **Multi-select:** ${multiSelect ? "Enabled" : "Disabled"}`,
                    poll: pollData,
                });
                return;
            } catch (error) {
                return handleError(
                    interaction,
                    error,
                    "POLL_CREATION",
                    "Failed to create poll. Please check your inputs and try again.",
                );
            }
        }

        if (sub === "end") {
            try {
                await interaction.deferReply();
                const messageId = interaction.options.getString("message_id");
                const channel = interaction.options.getChannel("channel");

                const message = await channel.messages.fetch(messageId);

                if (!message?.poll) {
                    return interaction.editReply({
                        content: "❌ Poll not found or the message does not contain a poll.",
                    });
                }

                if (message.poll.resultsFinalized) {
                    return interaction.editReply({ content: "❌ This poll has already ended." });
                }

                await message.poll.end();

                const questionText = message.poll.question.text;
                const totalVotes = message.poll.answers.reduce(
                    (sum, answer) => sum + answer.voteCount,
                    0,
                );
                const expiresAt = message.poll.expiresAt
                    ? `<t:${Math.floor(message.poll.expiresAt.getTime() / 1000)}:R>`
                    : "N/A";

                await interaction.editReply({
                    content: `✅ **Poll Ended Successfully!**\n\n**Question:** ${questionText}\n**Total Votes:** ${totalVotes}\n**Was scheduled to end:** ${expiresAt}\n**Poll Message:** [Jump to Poll](${message.url})`,
                });
                return;
            } catch (error) {
                return handleError(
                    interaction,
                    error,
                    "POLL_END",
                    "Failed to end poll. Make sure the message ID and channel are correct.",
                );
            }
        }

        if (sub === "fetch") {
            try {
                await interaction.deferReply();

                const messageId = interaction.options.getString("message_id");
                const channel = interaction.options.getChannel("channel");
                const message = await channel.messages.fetch(messageId);

                if (!message?.poll) {
                    return interaction.editReply({
                        content: "❌ Poll not found or the message does not contain a poll.",
                    });
                }

                const poll = message.poll;
                const totalVotes = poll.answers.reduce((sum, a) => sum + a.voteCount, 0);

                const embed = new EmbedBuilder()
                    .setColor(poll.resultsFinalized ? 0x5865f2 : 0x57f287)
                    .setTitle(`📊 ${poll.question.text}`)
                    .setURL(message.url)
                    .setFooter({
                        text: poll.resultsFinalized
                            ? "Poll has ended • Results are finalized"
                            : "Poll is active • Results may change",
                    })
                    .setTimestamp();

                const statusLines = [
                    `**Total Votes:** ${totalVotes}`,
                    `**Multi-Select:** ${poll.allowMultiselect ? "✅ Enabled" : "❌ Disabled"}`,
                ];
                if (poll.expiresAt) {
                    const expiresTs = `<t:${Math.floor(poll.expiresAt.getTime() / 1000)}:R>`;
                    statusLines.push(
                        `**${poll.resultsFinalized ? "Ended" : "Ends"}:** ${expiresTs}`,
                    );
                }
                embed.addFields({ name: "📈 Poll Information", value: statusLines.join("\n") });

                const createBar = (percentage, length = 20) => {
                    const filled = Math.round((percentage / 100) * length);
                    const empty = length - filled;
                    return "█".repeat(filled) + "░".repeat(empty);
                };

                const sortedAnswers = [...poll.answers.values()].sort(
                    (a, b) => b.voteCount - a.voteCount,
                );

                const resultsText = sortedAnswers
                    .map((answer, index) => {
                        const percentage =
                            totalVotes > 0 ? (answer.voteCount / totalVotes) * 100 : 0;
                        const bar = createBar(percentage);
                        const rank =
                            index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "▫️";
                        const answerText = answer.text || "No text";
                        const emoji = answer.emoji ? `${answer.emoji} ` : "";
                        return (
                            `${rank} **${emoji}${answerText}**\n` +
                            `${bar} ${percentage.toFixed(1)}% (${answer.voteCount} vote${answer.voteCount !== 1 ? "s" : ""})`
                        );
                    })
                    .join("\n\n");

                embed.addFields({ name: "🗳️ Results", value: resultsText || "No votes yet" });

                await interaction.editReply({ embeds: [embed] });
                return;
            } catch (error) {
                return handleError(
                    interaction,
                    error,
                    "POLL_FETCH",
                    "Failed to fetch poll results. Make sure the message ID and channel are correct.",
                );
            }
        }

        return interaction.reply({ content: "Unknown subcommand.", flags: MessageFlags.Ephemeral });
    },
};
