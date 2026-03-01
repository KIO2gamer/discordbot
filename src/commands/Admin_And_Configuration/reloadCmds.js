const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");

const { handleError } = require("../../utils/errorHandler");
const path = require("path");
const fs = require("fs");

module.exports = {
    cooldown: 30,
    description_full:
        "Reloads bot commands without restarting. Can reload a specific command or all commands.",
    usage: "/reload [command:command_name]",
    examples: ["/reload command:ping", "/reload"],

    data: new SlashCommandBuilder()
        .setName("reload")
        .setDescription("Reloads bot commands")
        .addStringOption((option) =>
            option
                .setName("command")
                .setDescription("Specific command to reload")
                .setRequired(false),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const commandName = interaction.options.getString("command");
            const foldersPath = path.join(__dirname, "..");
            const commandFolders = fs.readdirSync(foldersPath).filter((folder) => {
                return fs.statSync(path.join(foldersPath, folder)).isDirectory();
            });

            if (commandName) {
                // Command name is provided, reload specific command
                await this.reloadSingleCommand(
                    interaction,
                    commandName,
                    foldersPath,
                    commandFolders,
                );
            } else {
                // No command name provided, reload all commands
                await this.reloadAllCommands(interaction, foldersPath, commandFolders);
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while reloading commands.",
            );
        }
    },

    async reloadSingleCommand(interaction, commandName, foldersPath, commandFolders) {
        try {
            const commandPath = this.findCommandPath(commandName, foldersPath, commandFolders);

            if (!commandPath) {
                await handleError(
                    interaction,
                    new Error(`Command "${commandName}" not found`),
                    "VALIDATION",
                    `There is no command with name \`${commandName}\`!`,
                );
                return;
            }

            try {
                // Load the new command first before removing the old one
                delete require.cache[require.resolve(commandPath)];
                const newCommand = require(commandPath);

                // Validate command structure
                if (!newCommand.data || !newCommand.execute) {
                    throw new Error("Invalid command structure");
                }

                // Only after validation, remove old command and add new one
                interaction.client.commands.delete(commandName);
                interaction.client.commands.set(newCommand.data.name, newCommand);

                const successEmbed = new EmbedBuilder()
                    .setTitle("Command Reloaded")
                    .setDescription(`Successfully reloaded command \`${commandName}\``)
                    .setColor("Green")
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });
            } catch (error) {
                await handleError(
                    interaction,
                    error,
                    "COMMAND_EXECUTION",
                    `Failed to reload command \`${commandName}\`: ${error.message}`,
                );
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while reloading the command.",
            );
        }
    },

    findCommandPath(commandName, foldersPath, commandFolders) {
        for (const folder of commandFolders) {
            const folderPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith(".js"));

            for (const file of commandFiles) {
                try {
                    const filePath = path.join(folderPath, file);
                    const command = require(filePath);

                    if (command.data && command.data.name === commandName) {
                        return filePath;
                    }
                } catch (error) {
                    console.error(`Error loading command file ${file}:`, error);
                }
            }
        }
        return null;
    },

    async reloadAllCommands(interaction, foldersPath, commandFolders) {
        try {
            let reloadedCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const folder of commandFolders) {
                const folderPath = path.join(foldersPath, folder);
                const commandFiles = fs
                    .readdirSync(folderPath)
                    .filter((file) => file.endsWith(".js"));

                for (const file of commandFiles) {
                    try {
                        const filePath = path.join(folderPath, file);
                        delete require.cache[require.resolve(filePath)];

                        const command = require(filePath);
                        if (command.data && command.execute) {
                            interaction.client.commands.set(command.data.name, command);
                            reloadedCount++;
                        } else {
                            errorCount++;
                            errors.push(`${file}: Missing required "data" or "execute" property`);
                        }
                    } catch (error) {
                        errorCount++;
                        errors.push(`${file}: ${error.message}`);
                    }
                }
            }

            const statusEmbed = new EmbedBuilder()
                .setTitle("Commands Reload Status")
                .setDescription(`Successfully reloaded ${reloadedCount} commands.`)
                .setColor(errorCount > 0 ? "Yellow" : "Green")
                .setTimestamp();

            if (errorCount > 0) {
                statusEmbed.addFields({
                    name: "⚠️ Errors",
                    value: `Failed to reload ${errorCount} commands:\n${errors.map((e) => `• ${e}`).join("\n")}`,
                });
            }

            await interaction.editReply({ embeds: [statusEmbed] });
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while reloading all commands.",
            );
        }
    },
};
