const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const ModerationLog = require("../../bot_utils/ModerationLog");

const ACTION_CHOICES = [
  { name: "Warn", value: "warn" },
  { name: "Ban", value: "ban" },
  { name: "Timeout", value: "timeout" },
  { name: "Kick", value: "kick" },
  { name: "Tempban", value: "tempban" },
  { name: "Unban", value: "unban" },
];

module.exports = {
  description_full:
    "Displays the moderation logs with various filtering options.",
  usage: "/logs [limit] [user] [lognumber] [logrange] [action] [moderator]",
  examples: [
    "/logs",
    "/logs limit:10",
    "/logs user:@user123",
    "/logs lognumber:5",
    "/logs logrange:1-5",
    "/logs action:ban",
    "/logs moderator:@mod456",
  ],
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Show the moderation logs.")
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("The number of logs per page")
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false),
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to filter logs by")
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("lognumber")
        .setDescription("The log number to search for")
        .setMinValue(1)
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("logrange")
        .setDescription("The range of log numbers to search for (e.g., 1-5)")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("The action to filter logs by")
        .setRequired(false)
        .addChoices(...ACTION_CHOICES),
    )
    .addUserOption((option) =>
      option
        .setName("moderator")
        .setDescription("The moderator to filter logs by")
        .setRequired(false),
    ),

  async execute(interaction) {
    const limit = interaction.options.getInteger("limit") || 5;
    const user = interaction.options.getUser("user");
    const logNumber = interaction.options.getInteger("lognumber");
    const logRange = interaction.options.getString("logrange");
    const action = interaction.options.getString("action");
    const moderator = interaction.options.getUser("moderator");

    try {
      const query = {};

      if (logNumber) {
        query.logNumber = logNumber;
      }

      if (logRange) {
        const [start, end] = logRange
          .split("-")
          .map((num) => parseInt(num.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          query.logNumber = { $gte: start, $lte: end };
        } else {
          return interaction.reply({
            content:
              'Invalid log range. Please use the format "start-end" (e.g., 1-5).',
            ephemeral: true,
          });
        }
      }

      if (user) {
        query.user = user.id;
      }
      if (action) {
        query.action = action;
      }
      if (moderator) {
        query.moderator = moderator.id;
      }

      const logs = await ModerationLog.find(query).sort({ logNumber: -1 });

      if (logs.length === 0) {
        return interaction.reply({
          content: "No moderation logs found.",
          ephemeral: true,
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
        fetchReply: true,
      });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button, // Listen for button interactions
        filter: (i) => i.user.id === interaction.user.id,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "prevPage") {
          currentPage--;
        } else if (i.customId === "nextPage") {
          currentPage++;
        }
        const newEmbed = createEmbed(currentPage);
        const newButtons = createButtons(currentPage);

        await i.update({ embeds: [newEmbed], components: newButtons });
      });

      collector.on("end", () => {
        message.edit({ components: [] }); // Update, not reply
      });
    } catch (error) {
      console.error("Error retrieving logs:", error);
      // Only one reply if an error occurs:
      await interaction.reply({
        content: "Failed to retrieve logs.",
        ephemeral: true,
      });
    }
  },
};
