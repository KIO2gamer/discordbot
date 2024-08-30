/**
 * Provides a command that displays a list of all available commands or provides detailed information about a specific command.
 *
 * The command is registered as a slash command in Discord and can be used by users to get help with the bot's commands.
 *
 * When the command is executed without any arguments, it displays a paginated list of all available commands, showing the command name and description for each command.
 *
 * When the command is executed with a command name as an argument, it displays detailed information about that specific command, including the command usage and any provided examples.
 *
 * The command uses Discord.js features like embeds and buttons to provide a user-friendly help interface.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  description_full:
    "Displays a list of all available commands or provides detailed information about a specific command.",
  usage: "/help [command name]",
  examples: ["/help", "/help ban"],
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Displays all available commands.")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("The name of the command to get help with.")
        .setRequired(false),
    ),
  async execute(interaction) {
    const commandName = interaction.options.getString("command")?.toLowerCase();

    if (commandName) {
      const command = getCommands().get(commandName);

      if (!command) {
        return interaction.reply({
          content: `No command with the name \`${commandName}\` was found.`,
          ephemeral: true, // Only visible to the user
        });
      }

      // Improved embed for single command help
      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle(`Command: \`${command.data.name}\``)
        .setDescription(command.description_full || command.data.description)
        .addFields(
          {
            name: "Usage",
            value: `\`${command.usage ? `${command.usage.trim()}` : ""}\``,
            inline: false,
          },
          {
            name: "Examples",
            value: command.examples
              ? `\`\`\`${command.examples.join("\n")}\`\`\``
              : "No examples provided.",
            inline: false,
          },
        );

      return interaction.reply({ embeds: [embed], ephemeral: true }); // Ephemeral reply
    } else {
      // Pagination for all commands
      const commandFolders = fs.readdirSync("./commands");
      const categories = commandFolders.map((folder) => {
        const commandFiles = fs
          .readdirSync(`./commands/${folder}`)
          .filter((file) => file.endsWith(".js"));

        const commands = commandFiles.map((file) => {
          const command = require(`../${folder}/${file}`);
          return {
            name: command.data.name,
            description: command.data.description,
            commandId: interaction.client.application.commands.cache.find(
              (cmd) => cmd.name === command.data.name,
            )?.id,
          };
        });

        return {
          name: folder.charAt(0).toUpperCase() + folder.slice(1),
          commands: commands,
        };
      });

      let currentIndex = 0;

      const generateEmbed = (index) => {
        return new EmbedBuilder()
          .setTitle(`${categories[index].name} Commands`)
          .setDescription(
            categories[index].commands
              .map((cmd) =>
                cmd.commandId
                  ? `</${cmd.name}:${cmd.commandId}> - ${cmd.description}`
                  : `\`/${cmd.name}\` - ${cmd.description}`,
              )
              .join("\n"),
          )
          .setColor(0x00ae86)
          .setFooter({
            text: `Page ${index + 1} of ${categories.length}`,
          });
      };

      const generateButtons = (index) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("previous")
            .setLabel("Previous")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(index === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(index === categories.length - 1),
        );
      };

      const embed = generateEmbed(currentIndex);
      const buttons = generateButtons(currentIndex);

      const message = await interaction.reply({
        embeds: [embed],
        components: [buttons],
        fetchReply: true,
        ephemeral: true, // Pagination is also ephemeral
      });

      const collector = message.createMessageComponentCollector({
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: "This button isn't for you!",
            ephemeral: true,
          });
        }

        if (i.customId === "next" && currentIndex < categories.length - 1) {
          currentIndex++;
        } else if (i.customId === "previous" && currentIndex > 0) {
          currentIndex--;
        }

        await i.update({
          embeds: [generateEmbed(currentIndex)],
          components: [generateButtons(currentIndex)],
        });
      });

      collector.on("end", () => {
        if (message.editable) {
          message
            .edit({ components: [] }) // Remove buttons after timeout
            .catch((error) => console.error("Error disabling buttons:", error));
        }
      });
    }
  },
};

function getCommands() {
  const commands = new Collection();
  const commandsPath = path.join(__dirname, ".."); // Base path

  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const categoryPath = path.join(commandsPath, folder);

    if (fs.statSync(categoryPath).isDirectory()) {
      const commandFiles = fs
        .readdirSync(categoryPath)
        .filter((file) => file.endsWith(".js"));

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, folder, file);
        const command = require(filePath); // Use the constructed path directly
        commands.set(command.data.name, command);
      }
    }
  }

  return commands;
}
