const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");

const { handleError } = require("../../utils/errorHandler");

// Component IDs for routing
const COMPONENT_IDS = {
    CATEGORY_SELECT: "help_category_select",
    COMMAND_SELECT: "help_command_select",
    OVERVIEW_BUTTON: "help_overview",
    BACK_BUTTON: "help_back",
    SEARCH_BUTTON: "help_search",
    REFRESH_BUTTON: "help_refresh",
    SEARCH_MODAL: "help_search_modal",
};

// Enhanced color scheme
const COLORS = {
    PRIMARY: "#5865F2",
    SUCCESS: "#57F287",
    INFO: "#3498DB",
    WARNING: "#FEE75C",
    DANGER: "#ED4245",
};

const COMMAND_LINK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Display comprehensive help information about commands")
        .addStringOption((option) =>
            option
                .setName("command")
                .setDescription("Get detailed information about a specific command")
                .setRequired(false)
                .setAutocomplete(true),
        ),

    description_full:
        "Browse and search through all available bot commands with an interactive, user-friendly interface. View commands by category, search for specific functionality, or get detailed information about individual commands including usage examples and required permissions.",
    usage: "/help [command: optional command name]",
    examples: ["/help", "/help ping", "/help embed", "/help play", "/help ban"],

    async execute(interaction) {
        try {
            const commandName = interaction.options.getString("command");

            if (commandName) {
                await this.displayCommandHelp(interaction, commandName);
            } else {
                await this.displayOverview(interaction);
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "Failed to display help information.",
            );
        }
    },

    /**
     * Display the main help overview with all categories
     */
    async displayOverview(interaction) {
        const client = interaction.client;
        const categories = this.getCategorizedCommands(client.commands);
        const totalCategories = Object.keys(categories).length;
        const commandLinks = await this.getCommandLinkMap(interaction);

        const embed = new EmbedBuilder()
            .setAuthor({
                name: "Command Help Center",
                iconURL: client.user.displayAvatarURL(),
            })
            .setTitle("🚀 Welcome to the Help Menu")
            .setDescription(
                `Navigate through the bot's features using the interactive menu below.\n\n` +
                    `╭─────────────────────────────╮\n` +
                    `│ 📊 **Total Commands:** ${client.commands.size.toString().padEnd(8)}│\n` +
                    `│ 📁 **Categories:** ${totalCategories.toString().padEnd(13)}│\n` +
                    `╰─────────────────────────────╯\n\n` +
                    `**Quick Tips:**\n` +
                    `• Select a category from the dropdown to browse commands\n` +
                    `• Use the search button to find specific commands\n` +
                    `• Click on any command to see detailed information`,
            )
            .setColor(COLORS.PRIMARY)
            .setFooter({
                text: `Type /help <command> for quick access • Last updated`,
                iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp();

        // Sort and display categories
        const sortedCategories = Object.entries(categories).sort(([a], [b]) =>
            this.formatCategoryName(a).localeCompare(this.formatCategoryName(b)),
        );

        for (const [categoryName, commands] of sortedCategories) {
            if (commands.length > 0) {
                const formattedName = this.formatCategoryName(categoryName);
                const category = this.getCategory(client, categoryName);
                const preview = commands
                    .slice(0, 4)
                    .map((cmd) => this.getCommandMention(commandLinks, cmd.data.name))
                    .join(" • ");
                const more = commands.length > 4 ? ` *+${commands.length - 4} more*` : "";

                embed.addFields({
                    name: `${category.emoji} ${formattedName}`,
                    value: `${commands.length} command${commands.length !== 1 ? "s" : ""}\n${preview}${more}`,
                    inline: false,
                });
            }
        }

        const categoryOptions = Object.keys(categories)
            .filter((category) => categories[category].length > 0)
            .sort((a, b) => this.formatCategoryName(a).localeCompare(this.formatCategoryName(b)))
            .map((categoryName) => {
                const category = this.getCategory(client, categoryName);
                const cmdCount = categories[categoryName].length;
                return {
                    label: this.formatCategoryName(categoryName),
                    value: categoryName,
                    description: `${cmdCount} command${cmdCount !== 1 ? "s" : ""} • ${category.description || "View all commands"}`,
                    emoji: category.emoji,
                };
            });

        const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(COMPONENT_IDS.CATEGORY_SELECT)
                .setPlaceholder("📂 Select a category to explore")
                .addOptions(categoryOptions),
        );

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(COMPONENT_IDS.SEARCH_BUTTON)
                .setLabel("Search Commands")
                .setEmoji("🔍")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(COMPONENT_IDS.REFRESH_BUTTON)
                .setLabel("Refresh")
                .setEmoji("🔄")
                .setStyle(ButtonStyle.Secondary),
        );

        if (interaction.isChatInputCommand()) {
            await interaction.reply({
                embeds: [embed],
                components: [selectRow, buttonRow],
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.update({
                content: null,
                embeds: [embed],
                components: [selectRow, buttonRow],
            });
        }
    },

    /**
     * Get commands organized by category
     */
    getCategorizedCommands(commands) {
        const categories = {};

        for (const command of commands.values()) {
            let category;

            if (command.category) {
                category = command.category;
            } else if (command.filePath) {
                const folderMatch = command.filePath.match(/([^/\\]+)[/\\][^/\\]+\.js$/);
                category = folderMatch ? folderMatch[1].toLowerCase() : "misc";
            } else {
                category = "misc";
            }

            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(command);
        }

        // Sort commands within each category
        for (const category in categories) {
            categories[category].sort((a, b) => a.data.name.localeCompare(b.data.name));
        }

        // Filter out empty categories
        const filteredCategories = {};
        for (const [categoryName, commandList] of Object.entries(categories)) {
            if (commandList.length > 0) {
                filteredCategories[categoryName] = commandList;
            }
        }

        return filteredCategories;
    },

    /**
     * Display detailed help for a specific command
     */
    async displayCommandHelp(interaction, commandName) {
        const command = interaction.client.commands.get(commandName.toLowerCase());
        const commandLinks = await this.getCommandLinkMap(interaction);

        if (!command) {
            const embed = new EmbedBuilder()
                .setColor(COLORS.DANGER)
                .setTitle("❌ Command Not Found")
                .setDescription(
                    `The command \`${commandName}\` doesn't exist.\n\n` +
                        `💡 **Suggestions:**\n` +
                        `• Use \`/help\` to see all available commands\n` +
                        `• Check for typos in the command name\n` +
                        `• Try using the search feature`,
                )
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(COMPONENT_IDS.OVERVIEW_BUTTON)
                    .setLabel("View All Commands")
                    .setEmoji("📚")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(COMPONENT_IDS.SEARCH_BUTTON)
                    .setLabel("Search")
                    .setEmoji("🔍")
                    .setStyle(ButtonStyle.Secondary),
            );

            const msgWithFlags = {
                embeds: [embed],
                components: [row],
                flags: MessageFlags.Ephemeral,
            };

            return interaction.replied || interaction.deferred
                ? interaction.followUp(msgWithFlags)
                : interaction.reply(msgWithFlags);
        }

        const embed = new EmbedBuilder()
            .setAuthor({
                name: "Command Information",
                iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setTitle(`📌 /${command.data.name}`)
            .setDescription(
                `${this.getCommandMention(commandLinks, command.data.name)}\n\n${command.description_full || command.data.description}\n\n${"─".repeat(40)}`,
            )
            .setColor(COLORS.INFO)
            .setTimestamp();

        // Category information
        if (command.category) {
            const category = this.getCategory(interaction.client, command.category);
            embed.addFields({
                name: "📂 Category",
                value: `${category.emoji} ${this.formatCategoryName(command.category)}`,
                inline: true,
            });
        }

        // Permissions
        const permissions = this.getCommandPermissions(command);
        if (permissions) {
            embed.addFields({
                name: "🔒 Required Permissions",
                value: permissions,
                inline: true,
            });
        } else {
            embed.addFields({
                name: "🔓 Required Permissions",
                value: "None (Everyone)",
                inline: true,
            });
        }

        // Usage section
        if (command.usage) {
            embed.addFields({
                name: "💻 Usage",
                value: `\`\`\`\n${command.usage}\n\`\`\``,
                inline: false,
            });
        }

        // Examples section
        if (command.examples?.length > 0) {
            const exampleText = command.examples
                .map((example, index) => `**${index + 1}.** ${example}`)
                .join("\n");

            embed.addFields({
                name: "📝 Examples",
                value: exampleText,
                inline: false,
            });
        }

        // Additional info
        const additionalInfo = [];
        if (command.cooldown) {
            additionalInfo.push(`⏱️ **Cooldown:** ${command.cooldown}s`);
        }
        if (command.guildOnly) {
            additionalInfo.push(`🏠 **Server Only:** Yes`);
        }
        if (command.ownerOnly) {
            additionalInfo.push(`👑 **Owner Only:** Yes`);
        }

        if (additionalInfo.length > 0) {
            embed.addFields({
                name: "ℹ️ Additional Information",
                value: additionalInfo.join("\n"),
                inline: false,
            });
        }

        embed.setFooter({
            text: `Tip: Use /help to browse all commands`,
            iconURL: interaction.client.user.displayAvatarURL(),
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(COMPONENT_IDS.OVERVIEW_BUTTON)
                .setLabel("Back to Overview")
                .setEmoji("◀️")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(COMPONENT_IDS.REFRESH_BUTTON)
                .setLabel("Refresh")
                .setEmoji("🔄")
                .setStyle(ButtonStyle.Secondary),
        );

        if (interaction.isChatInputCommand()) {
            await interaction.reply({
                embeds: [embed],
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.update({
                embeds: [embed],
                components: [row],
            });
        }
    },

    /**
     * Format category name for display
     */
    formatCategoryName(category) {
        if (!category) return "Miscellaneous";
        return category
            .replace(/_/g, " ")
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    },

    /**
     * Get category metadata
     */
    getCategory(client, categoryName) {
        const defaultCategory = {
            emoji: "📄",
            description: "General commands",
        };

        if (!client.categories) return defaultCategory;

        return client.categories.get(categoryName.toLowerCase()) || defaultCategory;
    },

    /**
     * Get formatted permission requirements
     */
    getCommandPermissions(command) {
        if (!command.data.default_member_permissions) return null;

        const permFlag = BigInt(command.data.default_member_permissions);
        const permissions = [];

        const permissionMap = {
            3n: "Administrator",
            5n: "Manage Server",
            6n: "Manage Channels",
            7n: "Kick Members",
            8n: "Ban Members",
            10n: "Manage Nicknames",
            13n: "Manage Messages",
            14n: "Embed Links",
            17n: "Mute Members",
            22n: "Deafen Members",
            23n: "Move Members",
            25n: "Manage Webhooks",
            28n: "Manage Roles",
            29n: "Manage Emojis and Stickers",
        };

        for (const [bit, name] of Object.entries(permissionMap)) {
            if (permFlag & (1n << BigInt(bit))) {
                permissions.push(`🔹 ${name}`);
            }
        }

        return permissions.length > 0 ? permissions.join("\n") : null;
    },

    /**
     * Autocomplete handler for command names
     */
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const commands = interaction.client.commands;

        let filtered;

        if (focusedValue) {
            // Search in command names and descriptions
            filtered = Array.from(commands.values())
                .filter(
                    (cmd) =>
                        cmd.data.name.toLowerCase().includes(focusedValue) ||
                        cmd.data.description.toLowerCase().includes(focusedValue),
                )
                .slice(0, 25)
                .map((cmd) => ({
                    name: `/${cmd.data.name} - ${cmd.data.description.substring(0, 60)}`,
                    value: cmd.data.name,
                }));
        } else {
            // Show popular/frequently used commands
            filtered = Array.from(commands.keys())
                .slice(0, 25)
                .map((name) => ({ name, value: name }));
        }

        await interaction.respond(filtered);
    },

    /**
     * Display commands in a specific category
     */
    async displayCategory(interaction, categoryName) {
        const client = interaction.client;
        const categories = this.getCategorizedCommands(client.commands);
        const commands = categories[categoryName] || [];
        const commandLinks = await this.getCommandLinkMap(interaction);

        if (commands.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle("⚠️ Empty Category")
                .setDescription("No commands found in this category.")
                .setTimestamp();

            await interaction.update({
                embeds: [embed],
                components: [],
            });
            return;
        }

        const category = this.getCategory(client, categoryName);
        const formattedName = this.formatCategoryName(categoryName);

        const embed = new EmbedBuilder()
            .setAuthor({
                name: `${formattedName} Category`,
                iconURL: client.user.displayAvatarURL(),
            })
            .setTitle(`${category.emoji} ${formattedName}`)
            .setDescription(
                `${category.description || "Browse commands in this category"}\n\n` +
                    `**${commands.length} command${commands.length !== 1 ? "s" : ""} available**\n` +
                    `${"─".repeat(40)}\n`,
            )
            .setColor(COLORS.INFO)
            .setTimestamp();

        // Group commands in a clean format
        const commandList = commands
            .map((cmd, index) => {
                const num = `${index + 1}.`.padEnd(4);
                return `${num}${this.getCommandMention(commandLinks, cmd.data.name)} - ${cmd.data.description}`;
            })
            .join("\n");

        embed.addFields({
            name: "📋 Available Commands",
            value: commandList.length > 1024 ? commandList.substring(0, 1021) + "..." : commandList,
            inline: false,
        });

        // Command selection dropdown
        const commandOptions = commands.slice(0, 25).map((cmd) => {
            const desc = cmd.data.description.substring(0, 97);
            return {
                label: cmd.data.name,
                value: cmd.data.name,
                description: desc.length === 97 ? desc + "..." : desc,
                emoji: "▫️",
            };
        });

        const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(COMPONENT_IDS.COMMAND_SELECT)
                .setPlaceholder("🔍 Select a command for detailed information")
                .addOptions(commandOptions),
        );

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(COMPONENT_IDS.OVERVIEW_BUTTON)
                .setLabel("Back to Overview")
                .setEmoji("◀️")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(COMPONENT_IDS.SEARCH_BUTTON)
                .setLabel("Search")
                .setEmoji("🔍")
                .setStyle(ButtonStyle.Primary),
        );

        await interaction.update({
            embeds: [embed],
            components: [selectRow, buttonRow],
        });
    },

    /**
     * Handle select menu interactions
     */
    async handleSelectMenu(interaction) {
        switch (interaction.customId) {
            case COMPONENT_IDS.CATEGORY_SELECT:
                await this.displayCategory(interaction, interaction.values[0]);
                break;
            case COMPONENT_IDS.COMMAND_SELECT:
                await this.displayCommandHelp(interaction, interaction.values[0]);
                break;
        }
    },

    /**
     * Handle button interactions
     */
    async handleButton(interaction) {
        switch (interaction.customId) {
            case COMPONENT_IDS.OVERVIEW_BUTTON:
                await this.displayOverview(interaction);
                break;

            case COMPONENT_IDS.SEARCH_BUTTON:
                await this.handleSearchButton(interaction);
                break;

            case COMPONENT_IDS.REFRESH_BUTTON:
                await this.handleRefreshButton(interaction);
                break;
        }
    },

    /**
     * Handle refresh button with smart context detection
     */
    async handleRefreshButton(interaction) {
        const title = interaction.message.embeds[0]?.title ?? "";
        const author = interaction.message.embeds[0]?.author?.name ?? "";

        // Command detail view
        if (title.startsWith("📌 /")) {
            const commandName = title.replace("📌 /", "");
            await this.displayCommandHelp(interaction, commandName);
        }
        // Category view
        else if (author.includes("Category")) {
            const categoryMatch = title.match(/^[^\s]+ (.+)$/);
            if (categoryMatch) {
                const categoryName = categoryMatch[1].toLowerCase().replace(/\s+/g, "_");
                await this.displayCategory(interaction, categoryName);
            } else {
                await this.displayOverview(interaction);
            }
        }
        // Default to overview
        else {
            await this.displayOverview(interaction);
        }
    },

    /**
     * Handle search button - show search modal
     */
    async handleSearchButton(interaction) {
        const modal = new ModalBuilder()
            .setCustomId(COMPONENT_IDS.SEARCH_MODAL)
            .setTitle("🔍 Search Commands");

        const searchInput = new TextInputBuilder()
            .setCustomId("search_term")
            .setLabel("Search Term")
            .setPlaceholder("Enter command name, keyword, or description...")
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(100)
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(searchInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    },

    /**
     * Handle search modal submission
     */
    async handleSearchModal(interaction) {
        const searchTerm = interaction.fields.getTextInputValue("search_term").toLowerCase().trim();
        const commands = interaction.client.commands;
        const results = [];
        const commandLinks = await this.getCommandLinkMap(interaction);

        // Search through commands
        for (const command of commands.values()) {
            const name = command.data.name.toLowerCase();
            const description = (command.data.description || "").toLowerCase();
            const fullDesc = (command.description_full || "").toLowerCase();
            const category = (command.category || "").toLowerCase();

            // Calculate relevance score
            let score = 0;
            if (name === searchTerm) score += 100;
            else if (name.includes(searchTerm)) score += 50;
            if (description.includes(searchTerm)) score += 30;
            if (fullDesc.includes(searchTerm)) score += 20;
            if (category.includes(searchTerm)) score += 10;

            if (score > 0) {
                results.push({ command, score });
            }
        }

        // Sort by relevance
        results.sort((a, b) => b.score - a.score);

        const embed = new EmbedBuilder()
            .setAuthor({
                name: "Search Results",
                iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setTitle(`🔍 Search: "${searchTerm}"`)
            .setColor(results.length > 0 ? COLORS.SUCCESS : COLORS.WARNING)
            .setTimestamp()
            .setFooter({
                text: `Found ${results.length} matching command${results.length !== 1 ? "s" : ""}`,
                iconURL: interaction.client.user.displayAvatarURL(),
            });

        if (results.length === 0) {
            embed.setDescription(
                `No commands found matching **"${searchTerm}"**\n\n` +
                    `💡 **Search Tips:**\n` +
                    `• Try different keywords\n` +
                    `• Check for typos\n` +
                    `• Use more general terms\n` +
                    `• Browse categories instead`,
            );
        } else {
            embed.setDescription(
                `Found **${results.length}** command${results.length !== 1 ? "s" : ""} matching your search.\n` +
                    `Showing top ${Math.min(results.length, 10)} results:\n` +
                    `${"─".repeat(40)}`,
            );

            // Display top results
            const topResults = results.slice(0, 10);
            topResults.forEach((result, index) => {
                const cmd = result.command;
                const category = cmd.category
                    ? this.getCategory(interaction.client, cmd.category)
                    : null;
                const categoryText = category
                    ? `${category.emoji} ${this.formatCategoryName(cmd.category)}`
                    : "Misc";

                embed.addFields({
                    name: `${index + 1}. ${this.getCommandMention(commandLinks, cmd.data.name)}`,
                    value: `${cmd.data.description}\n*Category: ${categoryText}*`,
                    inline: false,
                });
            });

            if (results.length > 10) {
                embed.addFields({
                    name: "More Results",
                    value: `*...and ${results.length - 10} more command${results.length - 10 !== 1 ? "s" : ""}*`,
                    inline: false,
                });
            }
        }

        const components = [];

        // Add command selection dropdown if results found
        if (results.length > 0) {
            const commandOptions = results.slice(0, 25).map((result) => {
                const cmd = result.command;
                const desc = cmd.data.description.substring(0, 97);
                return {
                    label: cmd.data.name,
                    value: cmd.data.name,
                    description: desc.length === 97 ? desc + "..." : desc,
                    emoji: "🔹",
                };
            });

            const selectRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(COMPONENT_IDS.COMMAND_SELECT)
                    .setPlaceholder("📋 Select a command to view details")
                    .addOptions(commandOptions),
            );
            components.push(selectRow);
        }

        // Navigation buttons
        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(COMPONENT_IDS.OVERVIEW_BUTTON)
                .setLabel("Back to Overview")
                .setEmoji("◀️")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(COMPONENT_IDS.SEARCH_BUTTON)
                .setLabel("New Search")
                .setEmoji("🔍")
                .setStyle(ButtonStyle.Primary),
        );
        components.push(buttonRow);

        await interaction.reply({
            embeds: [embed],
            components,
            flags: MessageFlags.Ephemeral,
        });
    },

    /**
     * Build a guild-scoped map of command mentions for quick reuse
     */
    async getCommandLinkMap(interaction) {
        if (!interaction.guild) return null;

        const client = interaction.client;
        if (!client.commandLinkCache) {
            client.commandLinkCache = new Map();
        }

        const cacheEntry = client.commandLinkCache.get(interaction.guild.id);
        const now = Date.now();

        if (cacheEntry && now - cacheEntry.timestamp < COMMAND_LINK_CACHE_TTL) {
            return cacheEntry.map;
        }

        try {
            const guildCommands = await interaction.guild.commands.fetch();
            const linkMap = new Map();

            guildCommands.forEach((cmd) => {
                linkMap.set(cmd.name, `</${cmd.name}:${cmd.id}>`);
            });

            client.commandLinkCache.set(interaction.guild.id, {
                map: linkMap,
                timestamp: now,
            });

            return linkMap;
        } catch {
            return null;
        }
    },

    /**
     * Return a clickable command mention when available, otherwise fallback to /command text
     */
    getCommandMention(commandLinks, commandName) {
        if (commandLinks?.has(commandName)) {
            return commandLinks.get(commandName);
        }

        return `/${commandName}`;
    },
};
