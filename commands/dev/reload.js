const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  description_full:
    "Reloads a specific command, or all commands if no command is specified.",
  usage: "/reload [command name]",
  examples: ["/reload", "/reload ban"],
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reloads a command.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("The command to reload.")
        .setRequired(false),
    ),
  async execute(interaction) {
    const commandName = interaction.options.getString("command");

    const foldersPath = path.join(__dirname, "..");
    const commandFolders = fs.readdirSync(foldersPath);

    if (commandName) {
      const commandPath = commandFolders
        .map((folder) => {
          const commandsPath = path.join(foldersPath, folder, "commands");
          if (fs.existsSync(commandsPath)) {
            const commandFiles = fs
              .readdirSync(commandsPath)
              .filter((file) => file.endsWith(".js"));
            const commandFile = commandFiles.find(
              (file) => file === `${commandName}.js`,
            );
            if (commandFile) {
              return path.join(commandsPath, commandFile);
            }
          }
        })
        .find((path) => path !== undefined);

      if (!commandPath) {
        return interaction.reply({
          content: `There is no command with name \`${commandName}\`!`,
          ephemeral: true,
        });
      }

      delete require.cache[require.resolve(commandPath)];

      try {
        interaction.client.commands.delete(commandName);
        const newCommand = require(commandPath);
        interaction.client.commands.set(newCommand.data.name, newCommand);
        await interaction.reply({
          content: `Command \`${commandName}\` was reloaded!`,
          ephemeral: true,
        });
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: `There was an error while reloading a command \`${commandName}\`:\n\`${error.message}\``,
          ephemeral: true,
        });
      }
    } else {
      commandFolders.forEach((folder) => {
        const commandsPath = path.join(foldersPath, folder, "commands");
        if (fs.existsSync(commandsPath)) {
          const commandFiles = fs
            .readdirSync(commandsPath)
            .filter((file) => file.endsWith(".js"));
          for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            delete require.cache[require.resolve(filePath)];

            try {
              const command = require(filePath);
              if ("data" in command && "execute" in command) {
                interaction.client.commands.set(command.data.name, command);
              } else {
                console.log(
                  `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
                );
              }
            } catch (error) {
              console.error(error);
            }
          }
        }
      });

      await interaction.reply({
        content: "All commands reloaded!",
        ephemeral: true,
      });
    }
  },
};
