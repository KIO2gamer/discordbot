const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");

const cc = require("../../database/customCommands");
const { handleError } = require("../../utils/errorHandler");
const Logger = require("../../utils/logger");

const COMMANDS_PER_PAGE = 10;

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("custom")
        .setDescription("Manage and use custom commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // add
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Add a custom command")
                .addStringOption((opt) =>
                    opt
                        .setName("name")
                        .setDescription("The main name of the command")
                        .setMinLength(3)
                        .setMaxLength(20)
                        .setRequired(true),
                )
                .addStringOption((opt) =>
                    opt
                        .setName("message")
                        .setDescription("The response message of the command")
                        .setRequired(true),
                )
                .addStringOption((opt) =>
                    opt
                        .setName("alias")
                        .setDescription("The alternate name of the command")
                        .setRequired(false),
                ),
        )
        // delete
        .addSubcommand((sub) =>
            sub
                .setName("delete")
                .setDescription("Delete a custom command")
                .addStringOption((opt) =>
                    opt
                        .setName("name")
                        .setDescription("The name or alias to delete")
                        .setRequired(true),
                ),
        )
        // edit
        .addSubcommand((sub) =>
            sub
                .setName("edit")
                .setDescription("Edit a custom command")
                .addStringOption((opt) =>
                    opt
                        .setName("name")
                        .setDescription("The name or alias of the command")
                        .setRequired(true),
                )
                .addStringOption((opt) =>
                    opt
                        .setName("new_message")
                        .setDescription("The new response message")
                        .setRequired(true),
                )
                .addStringOption((opt) =>
                    opt
                        .setName("new_alias")
                        .setDescription("The new alternate name")
                        .setRequired(false),
                ),
        )
        // list
        .addSubcommand((sub) =>
            sub
                .setName("list")
                .setDescription("List custom commands")
                .addStringOption((opt) =>
                    opt.setName("search").setDescription("Search for a command").setRequired(false),
                ),
        )
        // preview
        .addSubcommand((sub) =>
            sub
                .setName("preview")
                .setDescription("Preview a custom command")
                .addStringOption((opt) =>
                    opt
                        .setName("name")
                        .setDescription("The name or alias to preview")
                        .setRequired(true),
                ),
        )
        // run
        .addSubcommand((sub) =>
            sub
                .setName("run")
                .setDescription("Run a custom command")
                .addStringOption((opt) =>
                    opt
                        .setName("name")
                        .setDescription("The name or alias of the command to run")
                        .setRequired(true),
                ),
        ),

    description_full:
        "Unified custom command suite: add, delete, edit, list, preview, and run via subcommands.",
    usage: "/custom add|delete|edit|list|preview|run",
    examples: [
        "/custom add name:hello message:Hello! alias:hi",
        "/custom edit name:greet new_message:Welcome!",
        "/custom delete name:hello",
        "/custom list",
        "/custom preview name:hello",
        "/custom run name:hello",
    ],

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        try {
            switch (sub) {
                case "add":
                    return handleAdd(interaction);
                case "delete":
                    return handleDelete(interaction);
                case "edit":
                    return handleEdit(interaction);
                case "list":
                    return handleList(interaction);
                case "preview":
                    return handlePreview(interaction);
                case "run":
                    return handleRun(interaction);
                default:
                    return interaction.reply({
                        content: "Unknown subcommand.",
                        flags: MessageFlags.Ephemeral,
                    });
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while processing the custom command.",
            );
        }
    },
};

// --- Subcommand handlers ---
async function handleAdd(interaction) {
    try {
        const name = interaction.options.getString("name");
        const message = interaction.options.getString("message");
        const alias = interaction.options.getString("alias");

        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            await handleError(
                interaction,
                new Error("Invalid command name format"),
                "VALIDATION",
                "Command name can only contain letters, numbers, underscores, and hyphens.",
            );
            return;
        }

        if (name.length < 2 || name.length > 32) {
            await handleError(
                interaction,
                new Error("Invalid command name length"),
                "VALIDATION",
                "Command name must be between 2 and 32 characters long.",
            );
            return;
        }

        if (message.length < 1 || message.length > 2000) {
            await handleError(
                interaction,
                new Error("Invalid message length"),
                "VALIDATION",
                "Message must be between 1 and 2000 characters long.",
            );
            return;
        }

        if (alias) {
            if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
                await handleError(
                    interaction,
                    new Error("Invalid alias format"),
                    "VALIDATION",
                    "Alias can only contain letters, numbers, underscores, and hyphens.",
                );
                return;
            }
            if (alias.length < 2 || alias.length > 32) {
                await handleError(
                    interaction,
                    new Error("Invalid alias length"),
                    "VALIDATION",
                    "Alias must be between 2 and 32 characters long.",
                );
                return;
            }
        }

        const existingCommand = await cc.findOne({
            $or: [{ name: name.toLowerCase() }, { alias_name: name.toLowerCase() }],
        });
        if (existingCommand) {
            await handleError(
                interaction,
                new Error("Command already exists"),
                "VALIDATION",
                `A command or alias with the name "${name}" already exists.`,
            );
            return;
        }

        if (alias) {
            const existingAlias = await cc.findOne({
                $or: [{ name: alias.toLowerCase() }, { alias_name: alias.toLowerCase() }],
            });
            if (existingAlias) {
                await handleError(
                    interaction,
                    new Error("Alias already exists"),
                    "VALIDATION",
                    `A command or alias with the name "${alias}" already exists.`,
                );
                return;
            }
        }

        const customCommand = new cc({
            name: name.toLowerCase(),
            message,
            ...(alias && { alias_name: alias.toLowerCase() }),
        });
        await customCommand.save();

        await interaction.reply({
            content: `Custom command "${name}" added successfully!${alias ? ` Alias: ${alias}` : ""}`,
            flags: MessageFlags.Ephemeral,
        });
    } catch (error) {
        if (error.code === 11000) {
            await handleError(
                interaction,
                error,
                "DATABASE",
                "A command with this name or alias already exists.",
            );
        } else if (error.name === "ValidationError") {
            await handleError(interaction, error, "VALIDATION", "Invalid command data provided.");
        } else {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while creating the custom command.",
            );
        }
    }
}

async function handleDelete(interaction) {
    try {
        const commandNameOrAlias = interaction.options.getString("name");
        let cc_record = await cc.findOne({ name: commandNameOrAlias.toLowerCase() });
        if (!cc_record)
            cc_record = await cc.findOne({ alias_name: commandNameOrAlias.toLowerCase() });

        if (!cc_record) {
            await interaction.reply({
                content: `Custom command or alias "${commandNameOrAlias}" not found!`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const isAlias = cc_record.name !== commandNameOrAlias.toLowerCase();
        const alias_name = isAlias ? commandNameOrAlias : null;
        const command_name = cc_record.name;
        const confirmMessage = isAlias
            ? `The name you provided is an alias. The main command name is "${command_name}". Do you want to delete this command?`
            : `Are you sure you want to delete the custom command "${command_name}"?`;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("delete_confirm")
                .setLabel("Yes")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("delete_cancel")
                .setLabel("No")
                .setStyle(ButtonStyle.Danger),
        );

        const replyMsg = await interaction.reply({
            content: confirmMessage,
            flags: MessageFlags.Ephemeral,
            components: [row],
        });
        const confirmation = await replyMsg
            .awaitMessageComponent({
                filter: (i) => i.user.id === interaction.user.id,
                time: 15000,
            })
            .catch(() => null);

        if (!confirmation) {
            await interaction.editReply({ content: "Command deletion timed out.", components: [] });
            return;
        }

        if (confirmation.customId === "delete_confirm") {
            await cc.deleteOne({ _id: cc_record._id });
            await interaction.editReply({
                content: `Custom command "${command_name}"${alias_name ? ` (alias: ${alias_name})` : ""} deleted successfully!`,
                components: [],
            });
        } else {
            await interaction.editReply({ content: "Command deletion cancelled.", components: [] });
        }
    } catch (error) {
        await handleError(interaction, error);
    }
}

async function handleEdit(interaction) {
    try {
        const name = interaction.options.getString("name");
        const newMessage = interaction.options.getString("new_message");
        const newAlias = interaction.options.getString("new_alias");

        if (newMessage.length < 1 || newMessage.length > 2000) {
            await handleError(
                interaction,
                new Error("Invalid message length"),
                "VALIDATION",
                "Message must be between 1 and 2000 characters long.",
            );
            return;
        }
        if (newAlias) {
            if (!/^[a-zA-Z0-9_-]+$/.test(newAlias)) {
                await handleError(
                    interaction,
                    new Error("Invalid alias format"),
                    "VALIDATION",
                    "Alias can only contain letters, numbers, underscores, and hyphens.",
                );
                return;
            }
            if (newAlias.length < 2 || newAlias.length > 32) {
                await handleError(
                    interaction,
                    new Error("Invalid alias length"),
                    "VALIDATION",
                    "Alias must be between 2 and 32 characters long.",
                );
                return;
            }
        }

        let customCommand = await cc.findOne({ name: name.toLowerCase() });
        if (!customCommand) customCommand = await cc.findOne({ alias_name: name.toLowerCase() });
        if (!customCommand) {
            await handleError(
                interaction,
                new Error("Command not found"),
                "VALIDATION",
                `Custom command or alias "${name}" not found!`,
            );
            return;
        }

        if (newAlias) {
            const existingAlias = await cc.findOne({
                $and: [
                    { _id: { $ne: customCommand._id } },
                    {
                        $or: [
                            { name: newAlias.toLowerCase() },
                            { alias_name: newAlias.toLowerCase() },
                        ],
                    },
                ],
            });
            if (existingAlias) {
                await handleError(
                    interaction,
                    new Error("Alias already exists"),
                    "VALIDATION",
                    `A command or alias with the name "${newAlias}" already exists.`,
                );
                return;
            }
        }

        const isAlias = customCommand.name !== name.toLowerCase();
        const confirmMessage = isAlias
            ? `The name you provided is an alias. The main command name is "${customCommand.name}". Do you want to edit this command?`
            : `Are you sure you want to edit the custom command "${name}"?`;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("edit_confirm")
                .setLabel("Yes")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("edit_cancel")
                .setLabel("No")
                .setStyle(ButtonStyle.Danger),
        );

        const confirmationResponse = await interaction.reply({
            content: confirmMessage,
            components: [row],
            flags: MessageFlags.Ephemeral,
        });
        try {
            const confirmation = await confirmationResponse.awaitMessageComponent({
                filter: (i) => i.user.id === interaction.user.id,
                time: 15000,
            });
            if (confirmation.customId === "edit_confirm") {
                try {
                    customCommand.message = newMessage;
                    if (newAlias) customCommand.alias_name = newAlias.toLowerCase();
                    await customCommand.save();
                    await confirmation.update({
                        content: `Custom command "${customCommand.name}" edited successfully!${newAlias ? ` New alias: ${newAlias}` : ""}`,
                        components: [],
                    });
                } catch (error) {
                    if (error.code === 11000) {
                        await handleError(
                            interaction,
                            error,
                            "DATABASE",
                            "A command with this alias already exists.",
                        );
                    } else {
                        await handleError(
                            interaction,
                            error,
                            "DATABASE",
                            "Failed to save the edited command.",
                        );
                    }
                }
            } else {
                await confirmation.update({ content: "Command edit cancelled.", components: [] });
            }
        } catch (error) {
            if (error.name === "InteractionCollectorError") {
                await interaction.editReply({ content: "Command edit timed out.", components: [] });
            } else {
                await handleError(
                    interaction,
                    error,
                    "COMMAND_EXECUTION",
                    "An error occurred while processing the confirmation.",
                );
            }
        }
    } catch (error) {
        await handleError(
            interaction,
            error,
            "COMMAND_EXECUTION",
            "An error occurred while editing the custom command.",
        );
    }
}

async function handleList(interaction) {
    try {
        await interaction.deferReply();
        const searchTerm = interaction.options.getString("search")?.toLowerCase();

        const query = searchTerm
            ? {
                  $or: [
                      { name: { $regex: searchTerm, $options: "i" } },
                      { alias_name: { $regex: searchTerm, $options: "i" } },
                      { message: { $regex: searchTerm, $options: "i" } },
                  ],
              }
            : {};

        const commands = await cc.find(query).sort({ name: 1 });
        if (commands.length === 0) {
            const noResultsEmbed = new EmbedBuilder()
                .setTitle("Custom Commands")
                .setDescription(
                    searchTerm
                        ? `No commands found matching "${searchTerm}"`
                        : "No custom commands have been created yet.",
                )
                .setColor("#FF0000")
                .setTimestamp();
            await interaction.editReply({ embeds: [noResultsEmbed] });
            return;
        }

        const totalPages = Math.ceil(commands.length / COMMANDS_PER_PAGE);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * COMMANDS_PER_PAGE;
            const end = Math.min(start + COMMANDS_PER_PAGE, commands.length);
            const pageCommands = commands.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle("Custom Commands")
                .setColor("#0099ff")
                .setFooter({
                    text: `Page ${page + 1}/${totalPages} • Total commands: ${commands.length}`,
                })
                .setTimestamp();

            if (searchTerm) embed.setDescription(`Search results for "${searchTerm}"`);

            const commandList = pageCommands
                .map((cmd) => {
                    const aliasText = cmd.alias_name ? ` (alias: ${cmd.alias_name})` : "";
                    const messagePreview =
                        cmd.message.length > 50
                            ? cmd.message.substring(0, 47) + "..."
                            : cmd.message;
                    return `• **${cmd.name}**${aliasText}\n  └ ${messagePreview}`;
                })
                .join("\n\n");

            embed.addFields({ name: "Commands", value: commandList || "No commands found." });
            return embed;
        };

        const getNavigationRow = (page) =>
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("first")
                    .setLabel("⏪ First")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("prev")
                    .setLabel("◀️ Previous")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("next")
                    .setLabel("Next ▶️")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1),
                new ButtonBuilder()
                    .setCustomId("last")
                    .setLabel("Last ⏩")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1),
            );

        const message = await interaction.editReply({
            embeds: [generateEmbed(currentPage)],
            components: totalPages > 1 ? [getNavigationRow(currentPage)] : [],
        });

        if (totalPages > 1) {
            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 300000,
            });
            collector.on("collect", async (i) => {
                try {
                    switch (i.customId) {
                        case "first":
                            currentPage = 0;
                            break;
                        case "prev":
                            currentPage = Math.max(0, currentPage - 1);
                            break;
                        case "next":
                            currentPage = Math.min(totalPages - 1, currentPage + 1);
                            break;
                        case "last":
                            currentPage = totalPages - 1;
                            break;
                    }
                    await i.update({
                        embeds: [generateEmbed(currentPage)],
                        components: [getNavigationRow(currentPage)],
                    });
                } catch (error) {
                    await handleError(
                        interaction,
                        error,
                        "COMMAND_EXECUTION",
                        "Failed to update the command list.",
                    );
                }
            });
            collector.on("end", async () => {
                try {
                    const finalEmbed = generateEmbed(currentPage);
                    finalEmbed.setFooter({
                        text: `Page ${currentPage + 1}/${totalPages} • Total commands: ${commands.length} • Navigation expired`,
                    });
                    await message.edit({ embeds: [finalEmbed], components: [] });
                } catch (error) {
                    Logger.error("Error removing buttons:", error);
                }
            });
        }
    } catch (error) {
        if (error.name === "MongoError" || error.name === "MongooseError") {
            await handleError(
                interaction,
                error,
                "DATABASE",
                "Failed to fetch custom commands from the database.",
            );
        } else {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while listing custom commands.",
            );
        }
    }
}

async function handlePreview(interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const commandNameOrAlias = interaction.options.getString("name")?.toLowerCase();
        if (!commandNameOrAlias) {
            await handleError(
                interaction,
                new Error("No command name provided"),
                "VALIDATION",
                "Please provide a command name to preview.",
            );
            return;
        }

        let customCommand = await cc.findOne({ name: commandNameOrAlias });
        if (!customCommand) customCommand = await cc.findOne({ alias_name: commandNameOrAlias });
        if (!customCommand) {
            await handleError(
                interaction,
                new Error("Command not found"),
                "VALIDATION",
                `Custom command or alias "${commandNameOrAlias}" not found.`,
            );
            return;
        }

        const messagePreview =
            customCommand.message.length > 1000
                ? customCommand.message.substring(0, 997) + "..."
                : customCommand.message;
        const embed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle(`Custom Command: ${customCommand.name}`)
            .setDescription("Below is a preview of how this command will appear when used.")
            .addFields(
                {
                    name: "📝 Command Information",
                    value: [
                        `**Name:** ${customCommand.name}`,
                        `**Alias:** ${customCommand.alias_name || "None"}`,
                        `**Message Length:** ${customCommand.message.length} characters`,
                    ].join("\n"),
                },
                { name: "📤 Output Preview", value: messagePreview },
            )
            .setFooter({
                text: `Preview requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        const usageExamples = [`\`/custom run name:${customCommand.name}\``];
        if (customCommand.alias_name)
            usageExamples.push(`\`/custom run name:${customCommand.alias_name}\``);
        embed.addFields({ name: "💻 Usage Examples", value: usageExamples.join("\n") });

        await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
        if (error.name === "MongoError" || error.name === "MongooseError") {
            await handleError(
                interaction,
                error,
                "DATABASE",
                "Failed to fetch the custom command from the database.",
            );
        } else {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while previewing the custom command.",
            );
        }
    }
}

async function handleRun(interaction) {
    try {
        const commandNameOrAlias = interaction.options.getString("name")?.toLowerCase();
        if (!commandNameOrAlias) {
            await handleError(
                interaction,
                new Error("No command name provided"),
                "VALIDATION",
                "Please provide a command name to run.",
            );
            return;
        }

        let customCommand = await cc.findOne({ name: commandNameOrAlias });
        if (!customCommand) customCommand = await cc.findOne({ alias_name: commandNameOrAlias });
        if (!customCommand) {
            await handleError(
                interaction,
                new Error("Command not found"),
                "VALIDATION",
                `Custom command or alias "${commandNameOrAlias}" not found.`,
            );
            return;
        }

        if (!customCommand.message || customCommand.message.trim().length === 0) {
            await handleError(
                interaction,
                new Error("Invalid command message"),
                "VALIDATION",
                "This command has no message content.",
            );
            return;
        }
        if (
            customCommand.message.includes("@everyone") ||
            customCommand.message.includes("@here")
        ) {
            await handleError(
                interaction,
                new Error("Disallowed mentions"),
                "VALIDATION",
                "This command contains disallowed mentions.",
            );
            return;
        }

        try {
            await interaction.reply({
                content: customCommand.message,
                allowedMentions: { parse: ["users", "roles"] },
            });
        } catch (error) {
            if (error.code === 50006) {
                await handleError(
                    interaction,
                    error,
                    "VALIDATION",
                    "Cannot send an empty message.",
                );
            } else if (error.code === 50035) {
                await handleError(interaction, error, "VALIDATION", "Message content is invalid.");
            } else {
                await handleError(
                    interaction,
                    error,
                    "COMMAND_EXECUTION",
                    "Failed to execute the custom command.",
                );
            }
        }
    } catch (error) {
        if (error.name === "MongoError" || error.name === "MongooseError") {
            await handleError(
                interaction,
                error,
                "DATABASE",
                "Failed to fetch the custom command from the database.",
            );
        } else {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while running the custom command.",
            );
        }
    }
}
