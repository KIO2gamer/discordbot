const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment');

module.exports = {
  description_full:
    "Provides various statistics about the server, including member count, channels, messages sent, reactions given, and more, within a specified timeframe or for the server’s entire history.",
  usage: "/serverstats [timeframe]",
  examples: ["/serverstats", "/serverstats 7d", "/serverstats 1M"],
  data: new SlashCommandBuilder()
    .setName("serverstats")
    .setDescription("Displays various statistics about this server.")
    .addStringOption((option) =>
      option
        .setName("timeframe")
        .setDescription(
          'The timeframe to calculate stats for (e.g., "7d", "1M"). Defaults to all-time.',
        )
        .setRequired(false)
        .addChoices(
          { name: "Last 24 Hours", value: "24h" },
          { name: "Last 7 Days", value: "7d" },
          { name: "Last 30 Days", value: "30d" },
          { name: "Last Month", value: "1M" },
          { name: "All Time", value: "all" },
        ),
    ),
  async execute(interaction) {
    try {
      // Acknowledge the interaction immediately:
      await interaction.deferReply();

      const timeframe = interaction.options.getString("timeframe") || "all";
      let startDate;

      switch (timeframe) {
        case "24h":
          startDate = moment().subtract(1, "day").toDate();
          break;
        case "7d":
          startDate = moment().subtract(7, "days").toDate();
          break;
        case "30d":
          startDate = moment().subtract(30, "days").toDate();
          break;
        case "1M":
          startDate = moment().subtract(1, "month").toDate();
          break;
        case "all":
          startDate = new Date(0); // Beginning of time
          break;
        default:
          startDate = new Date(0); // Default to all time
      }

      const guild = interaction.guild;
      const members = await guild.members.fetch();

      // Filter functions for timeframe:
      const messageFilter = (msg) => msg.createdAt >= startDate;
      const memberFilter = (member) => member.joinedAt >= startDate;

      let totalMessages = 0;
      let totalReactions = 0;

      const channelStatsPromises = guild.channels.cache.map(async (channel) => {
        if (channel.isTextBased()) {
          let messages = [];
          let lastMessage = null;

          // Fetch messages in batches of 100:
          do {
            const fetchedMessages = await channel.messages.fetch({
              limit: 100,
              before: lastMessage?.id,
            });
            messages = messages.concat(fetchedMessages);
            lastMessage = fetchedMessages.last();
          } while (lastMessage && lastMessage.createdAt > startDate);

          const filteredMessages = messages.filter(messageFilter);
          totalMessages += filteredMessages.size;

          filteredMessages.forEach((msg) => {
            totalReactions += msg.reactions.cache.size;
          });
        }
      });

      await Promise.all(channelStatsPromises);

      const embed = new EmbedBuilder()
        .setTitle(`Server Stats for ${guild.name}`)
        .setDescription(
          `Statistics from ${timeframe === "all" ? "the server creation" : `the past ${timeframe}`}`,
        )
        .addFields(
          {
            name: "Members",
            value: `${members.filter(memberFilter).size}`,
            inline: true,
          },
          {
            name: "Total Members (all-time)",
            value: `${members.size}`,
            inline: true,
          },
          { name: "\u200B", value: "\u200B", inline: true }, // Empty field for formatting
          {
            name: "Text Channels",
            value: `${guild.channels.cache.filter((c) => c.isTextBased()).size}`,
            inline: true,
          },
          {
            name: "Voice Channels",
            value: `${guild.channels.cache.filter((c) => c.type === "GUILD_VOICE").size}`,
            inline: true,
          },
          { name: "\u200B", value: "\u200B", inline: true }, // Empty field for formatting
          { name: "Roles", value: `${guild.roles.cache.size}`, inline: true },
          { name: "Emojis", value: `${guild.emojis.cache.size}`, inline: true },
          { name: "\u200B", value: "\u200B", inline: true }, // Empty field for formatting
          { name: "Messages Sent", value: `${totalMessages}`, inline: true },
          { name: "Reactions Given", value: `${totalReactions}`, inline: true },
          { name: "\u200B", value: "\u200B", inline: true }, // Empty field for formatting
        )
        .setTimestamp();

      // Edit the deferred reply with the embed:
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error executing serverstats:", error);

      // Handle errors gracefully:
      if (interaction.deferred) {
        await interaction.editReply(
          "An error occurred while fetching server stats.",
        );
      } else {
        await interaction.reply(
          "An error occurred while fetching server stats.",
        );
      }
    }
  },
};
