const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    MessageFlags,
} = require("discord.js");
const moderationLogs = require("./../../database/moderationLogs");
const { parseRange } = require("../../utils/rangeParser");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 10,
    description_full:
        "Moderation logs utilities: view logs with filters, edit reasons, or delete logs.",
    usage: "/mod_logs view [filters] | /mod_logs edit reason:<text> [lognumber|logrange] | /mod_logs delete [lognumber|logrange]",
    examples: [
        "/mod_logs view limit:10",
        '/mod_logs edit reason:"Updated" lognumber:5',
        "/mod_logs delete logrange:10-15",
    ],

    data: new SlashCommandBuilder()
        .setName("mod_logs")
        .setDescription("View, edit, or delete moderation logs")
        .addSubcommand((sub) =>
            sub
                .setName("view")
                .setDescription("View moderation logs with filters")
                .addIntegerOption((option) =>
                    option
                        .setName("limit")
                        .setDescription("The number of logs per page")
                        .setMinValue(1)
                        .setMaxValue(25),
                )
                .addUserOption((option) =>
                    option.setName("user").setDescription("Filter logs by user"),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("lognumber")
                        .setDescription("Filter by log number")
                        .setMinValue(1),
                )
                .addStringOption((option) =>
                    option.setName("logrange").setDescription("Filter by log range (e.g., 1-5)"),
                )
                .addStringOption((option) =>
                    option
                        .setName("action")
                        .setDescription("Filter by action")
                        .addChoices(
                            { name: "Warn", value: "warn" },
                            { name: "Ban", value: "ban" },
                            { name: "Timeout", value: "timeout" },
                            { name: "Kick", value: "kick" },
                            { name: "Tempban", value: "tempban" },
                            { name: "Unban", value: "unban" },
                        ),
                )
                .addUserOption((option) =>
                    option.setName("moderator").setDescription("Filter logs by moderator"),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("edit")
                .setDescription("Edit reason for a specific log or a range")
                .addStringOption((option) =>
                    option.setName("reason").setDescription("New reason").setRequired(true),
                )
                .addIntegerOption((option) =>
                    option.setName("lognumber").setDescription("Log number"),
                )
                .addStringOption((option) =>
                    option.setName("logrange").setDescription("Log range (e.g., 1-5)"),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("delete")
                .setDescription("Delete a log or a range")
                .addIntegerOption((option) =>
                    option.setName("lognumber").setDescription("Log number"),
                )
                .addStringOption((option) =>
                    option.setName("logrange").setDescription("Log range (e.g., 1-5)"),
                ),
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === "view") {
            const limit = interaction.options.getInteger("limit") || 5;
            const user = interaction.options.getUser("user");
            const logNumber = interaction.options.getInteger("lognumber");
            const logRange = interaction.options.getString("logrange");
            const action = interaction.options.getString("action");
            const moderator = interaction.options.getUser("moderator");

            try {
                const query = {};
                if (logNumber) query.logNumber = logNumber;
                if (user) query.user = user.id;
                if (action) query.action = action;
                if (moderator) query.moderator = moderator.id;

                if (logRange) {
                    const range = parseRange(logRange);
                    if (!range) {
                        return interaction.reply({
                            content: "Invalid log range. Please provide a valid range (e.g., 1-5).",
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                    const { start, end } = range;
                    Object.assign(query, { logNumber: { $gte: start, $lte: end } });
                }

                const logs = await moderationLogs.find(query).sort({ logNumber: -1 });
                if (logs.length === 0) {
                    return interaction.reply({
                        content: "No moderation logs found.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                let currentPage = 1;
                const totalPages = Math.ceil(logs.length / limit);

                const createEmbed = (page = 1) => {
                    const startIndex = (page - 1) * limit;
                    const endIndex = Math.min(page * limit, logs.length);

                    const embed = new EmbedBuilder()
                        .setTitle("Moderation Logs")
                        .setColor("#FF0000")
                        .setTimestamp()
                        .setFooter({ text: `Page ${page} of ${totalPages}` });

                    const logDescriptions = logs
                        .slice(startIndex, endIndex)
                        .map((log) => {
                            const moderatorMention = `<@${log.moderator}>`;
                            const userMention = `<@${log.user}>`;
                            const timestamp = new Date(log.timestamp).toLocaleString();
                            return `**Log #${log.logNumber}**\n**Action:** ${log.action}\n**Moderator:** ${moderatorMention}\n**User:** ${userMention}\n**Reason:** ${log.reason}\n**Timestamp:** ${timestamp}`;
                        })
                        .join("\n\n");

                    embed.setDescription(logDescriptions);
                    return embed;
                };

                const createButtons = (page) => {
                    const row = new ActionRowBuilder();
                    if (page > 1) {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId("prevPage")
                                .setLabel("Previous")
                                .setStyle(ButtonStyle.Primary),
                        );
                    }
                    if (page < totalPages) {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId("nextPage")
                                .setLabel("Next")
                                .setStyle(ButtonStyle.Primary),
                        );
                    }
                    return row.components.length > 0 ? [row] : [];
                };

                const initialEmbed = createEmbed(currentPage);
                const initialButtons = createButtons(currentPage);
                const message = await interaction.reply({
                    embeds: [initialEmbed],
                    components: initialButtons,
                    flags: MessageFlags.Ephemeral,
                });

                const collector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter: (i) => i.user.id === interaction.user.id,
                    time: 60000,
                });

                collector.on("collect", async (i) => {
                    if (i.customId === "prevPage") currentPage--;
                    else if (i.customId === "nextPage") currentPage++;
                    const newEmbed = createEmbed(currentPage);
                    const newButtons = createButtons(currentPage);
                    await i.update({ embeds: [newEmbed], components: newButtons });
                });

                collector.on("end", () => {
                    message.edit({ components: [] });
                });
                return;
            } catch (error) {
                return handleError(interaction, error, "MOD_LOGS_VIEW", "Failed to retrieve logs.");
            }
        }

        if (sub === "edit") {
            try {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const logNumber = interaction.options.getInteger("lognumber");
                const logRange = interaction.options.getString("logrange");
                const newReason = interaction.options.getString("reason");

                if (!logNumber && !logRange) {
                    return handleError(
                        interaction,
                        new Error(
                            "Please provide either a log number or a range of log numbers to edit.",
                        ),
                        "VALIDATION",
                    );
                }

                if (logNumber) {
                    const log = await moderationLogs.findOne({ logNumber });
                    if (log) {
                        log.reason = newReason;
                        await log.save();
                        await interaction.editReply(
                            `Successfully updated reason for log #${logNumber} to: ${newReason}`,
                        );
                    } else {
                        return handleError(
                            interaction,
                            new Error(`No log found with log number ${logNumber}.`),
                            "VALIDATION",
                        );
                    }
                } else if (logRange) {
                    const range = parseRange(logRange);
                    if (!range) {
                        return handleError(
                            interaction,
                            new Error(
                                "Invalid log range. Please provide a valid range (e.g., 1-5).",
                            ),
                            "VALIDATION",
                        );
                    }
                    const { start, end } = range;
                    const result = await moderationLogs.updateMany(
                        { logNumber: { $gte: start, $lte: end } },
                        { $set: { reason: newReason } },
                    );
                    if (result.matchedCount > 0) {
                        await interaction.editReply(
                            `Successfully updated reason for ${result.matchedCount} logs in the range #${start}-#${end} to: ${newReason}`,
                        );
                    } else {
                        await interaction.editReply(
                            `No logs found in the range #${start}-#${end}.`,
                        );
                    }
                }
                return;
            } catch (error) {
                const category = error.name?.includes("Mongo") ? "DATABASE" : "COMMAND_EXECUTION";
                return handleError(
                    interaction,
                    error,
                    category,
                    category === "DATABASE"
                        ? "Failed to update the log(s) in the database."
                        : "An error occurred while updating the log(s).",
                );
            }
        }

        if (sub === "delete") {
            try {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const logNumber = interaction.options.getInteger("lognumber");
                const logRange = interaction.options.getString("logrange");

                if (!logNumber && !logRange) {
                    return handleError(
                        interaction,
                        new Error(
                            "Please provide either a log number or a range of log numbers to delete.",
                        ),
                        "VALIDATION",
                    );
                }

                if (logNumber) {
                    const log = await moderationLogs.findOneAndDelete({ logNumber });
                    if (log) {
                        await interaction.editReply(`Successfully deleted log #${logNumber}.`);
                    } else {
                        return handleError(
                            interaction,
                            new Error(`No log found with log number ${logNumber}.`),
                            "VALIDATION",
                        );
                    }
                } else if (logRange) {
                    const range = parseRange(logRange);
                    if (!range) {
                        return handleError(
                            interaction,
                            new Error(
                                "Invalid log range. Please provide a valid range (e.g., 1-5).",
                            ),
                            "VALIDATION",
                        );
                    }
                    const { start, end } = range;
                    const deletedLogs = await moderationLogs.deleteMany({
                        logNumber: { $gte: start, $lte: end },
                    });
                    if (deletedLogs.deletedCount > 0) {
                        await interaction.editReply(
                            `Successfully deleted ${deletedLogs.deletedCount} logs in the range #${start}-#${end}.`,
                        );
                    } else {
                        await interaction.editReply(
                            `No logs found in the range #${start}-#${end}.`,
                        );
                    }
                }
                return;
            } catch (error) {
                const category = error.name?.includes("Mongo") ? "DATABASE" : "COMMAND_EXECUTION";
                return handleError(
                    interaction,
                    error,
                    category,
                    category === "DATABASE"
                        ? "Failed to delete the log(s) from the database."
                        : "An error occurred while deleting the log(s).",
                );
            }
        }

        return interaction.reply({ content: "Unknown subcommand.", ephemeral: true });
    },
};
