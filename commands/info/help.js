const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("View the help menu")
        .addStringOption((option) =>
            option
                .setName("category")
                .setRequired(false)
                .setDescription("What command category do you want to view?")
                .addChoices(
                    { name: "Fun", value: "fun" },
                    { name: "Info", value: "info" },
                    { name: "Moderation", value: "moderation" },
                    { name: "Utility", value: "utility" },
                ),
        )
        .addStringOption((option) =>
            option
                .setName("search")
                .setRequired(false)
                .setDescription("Search for a command by name or description")
        ),
    category: "info",
    async execute(interaction) {
        await interaction.deferReply(); // Immediately acknowledge the interaction

        const category = interaction.options.getString("category");
        const searchQuery = interaction.options.getString("search")?.toLowerCase();

        const getCategoryNameForMainMenu = (choice) => {
            const categories = {
                fun: "\n> **🎉 Fun**\n> Commands which can be used for fun activities.\n> ",
                info: "> **📖 Info**\n> Commands for getting information.\n> ",
                moderation: "> **🛡️ Moderation**\n> Commands for server moderation.\n> ",
                utility: "> **🛠️ Utility**\n> Commands for various utilities.\n",
            };
            return categories[choice];
        };

        const getCategoryTitle = (choice) => {
            const titles = {
                fun: "🎉 Fun Commands",
                info: "📖 Info Commands",
                moderation: "🛡️ Moderation Commands",
                utility: "🛠️ Utility Commands",
            };
            return titles[choice];
        };

        const fetchCommands = async (folder) => {
            const folderPath = path.join("C:\\Users\\KIO2gamer\\OneDrive\\Documents\\discordbot\\commands", `${folder}`);
            if (!fs.existsSync(folderPath)) {
                console.error(`Directory ${folderPath} does not exist`);
                return [];
            }

            const files = fs
                .readdirSync(folderPath)
                .filter((file) => file.endsWith(".js"));

            const commands = [];
            for (const file of files) {
                const command = require(path.join(folderPath, file));
                const name = command.data.name;
                try {
                    const commandId = await interaction.guild.commands.fetch()
                        .then((cmds) => cmds.find((cmd) => cmd.name === name)?.id);

                    if (commandId) {
                        commands.push({ name, id: commandId, description: command.data.description });
                    }
                } catch (error) {
                    console.error(`Error fetching ID for ${name}: ${error.message}`);
                }
            }
            return commands;
        };

        const commandFolders = ['fun','info', 'moderation', 'utility'];

        const [funCommands, infoCommands, modCommands, utilCommands] = await Promise.all([
            fetchCommands('fun'),
            fetchCommands('info'),
            fetchCommands('moderation'),
            fetchCommands('utility'),
        ]);

        const allCommands = {
            fun: funCommands,
            info: infoCommands,
            moderation: modCommands,
            utility: utilCommands,
        };

        const buildCommandFields = (commands) => {
            const chunks = [];
            let currentChunk = [];

            commands.forEach((cmd) => {
                const cmdStr = `</${cmd.name}:${cmd.id}> - ${cmd.description}`;
                if (currentChunk.join("\n").length + cmdStr.length > 1024) {
                    chunks.push(currentChunk.join("\n"));
                    currentChunk = [];
                }
                currentChunk.push(cmdStr);
            });

            if (currentChunk.length > 0) {
                chunks.push(currentChunk.join("\n"));
            }

            return chunks;
        };

        const cmdListEmbed = new EmbedBuilder()
            .setColor("#3498db")
            .setTitle("📜 Command List")
            .setDescription(
                "`/help [category] - View commands in a specific category`\n`/help [search] - Search commands from all categories`\n`/help [category] [search] - Search commands from a specific category`"
            )
            .setAuthor({
                name: "Kiyo Bot HelpDesk",
                iconURL: interaction.client.user.avatarURL(),
            })
            .setThumbnail(interaction.client.user.avatarURL());

        buildCommandFields(allCommands.fun).forEach((chunk, index) => {
            cmdListEmbed.addFields({ name: index === 0 ? "**🎉 Fun**" : "\u200B", value: chunk });
        });

        buildCommandFields(allCommands.info).forEach((chunk, index) => {
            cmdListEmbed.addFields({ name: index === 0 ? "**📖 Info**" : "\u200B", value: chunk });
        });

        buildCommandFields(allCommands.moderation).forEach((chunk, index) => {
            cmdListEmbed.addFields({ name: index === 0 ? "**🛡️ Moderation**" : "\u200B", value: chunk });
        });

        buildCommandFields(allCommands.utility).forEach((chunk, index) => {
            cmdListEmbed.addFields({ name: index === 0 ? "**🛠️ Utility**" : "\u200B", value: chunk });
        });


        cmdListEmbed.setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        }).setTimestamp();

        if (searchQuery) {
            const searchResults = [];
            if (category) {
                allCommands[category].forEach(cmd => {
                    if (cmd.name.toLowerCase().includes(searchQuery) || cmd.description.toLowerCase().includes(searchQuery)) {
                        searchResults.push(cmd);
                    }
                });
            } else {
                for (const key in allCommands) {
                    allCommands[key].forEach(cmd => {
                        if (cmd.name.toLowerCase().includes(searchQuery) || cmd.description.toLowerCase().includes(searchQuery)) {
                            searchResults.push(cmd);
                        }
                    });
                }
            }

            const searchEmbed = new EmbedBuilder()
                .setColor("#f39c12")
                .setTitle(`🔍 Search Results: ${searchQuery}`)
                .setDescription(searchResults.map(cmd => `</${cmd.name}:${cmd.id}> - ${cmd.description}`).join("\n") || "No commands found")
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                })
                .setTimestamp();

            return await interaction.editReply({ embeds: [searchEmbed] });
        }

        if (!category) {
            const mainMenuEmbed = new EmbedBuilder()
                .setColor("#2ecc71")
                .setDescription("`/help [category] - View commands in a specific category`\n`/help [search] - Search commands from all categories`\n`/help [category] [search] - Search commands from a specific category`")
                .setAuthor({
                    name: "Kiyo Bot HelpDesk",
                    iconURL: interaction.client.user.avatarURL(),
                })
                .setThumbnail(interaction.client.user.avatarURL())
                .addFields([
                    {
                        name: `📂 Categories`,
                        value: commandFolders.map(getCategoryNameForMainMenu).join("\n"),
                    },
                ])
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                })
                .setTimestamp();

            const cmdListButton = new ButtonBuilder()
                .setLabel("📜 Command List")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("cmdList");

            const mainMenuBtn = new ButtonBuilder()
                .setLabel("🏠 Home")
                .setStyle(ButtonStyle.Secondary)
                .setCustomId("home");

            const rowWithCmdBtn = new ActionRowBuilder().addComponents(cmdListButton);
            const rowWithHomeBtn = new ActionRowBuilder().addComponents(mainMenuBtn);

            const reply = await interaction.editReply({
                embeds: [mainMenuEmbed],
                components: [rowWithCmdBtn],
            });

            const collector = reply.createMessageComponentCollector({
                time: 60_000 * 5,
            });

            collector.on("collect", async (i) => {
                if (i.user.id === interaction.user.id) {
                    if (i.customId === "cmdList") {
                        await i.update({
                            embeds: [cmdListEmbed],
                            components: [rowWithHomeBtn],
                        });
                    }
                    if (i.customId === "home") {
                        await i.update({
                            embeds: [mainMenuEmbed],
                            components: [rowWithCmdBtn],
                        });
                    }
                } else {
                    await i.reply({
                        content: "You should run the command to use this interaction.",
                        ephemeral: true,
                    });
                }
            });

            collector.on("end", async (collected, reason) => {
                if (reason === "time") {
                    await reply.edit({ components: [] });
                }
            });

            return;
        }

        if (commandFolders.includes(category)) {
            const commands = allCommands[category];
            const embedDescription = commands.map(cmd => `</${cmd.name}:${cmd.id}> - ${cmd.description}`).join("\n") || "No commands available";

            const categoryEmbed = new EmbedBuilder()
                .setColor("#e74c3c")
                .setTitle(getCategoryTitle(category))
                .setDescription(embedDescription)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                })
                .setTimestamp();

            return await interaction.editReply({ embeds: [categoryEmbed] });
        } else {
            await interaction.editReply({
                content: "Invalid category.",
                ephemeral: true,
            });
        }
    },
};