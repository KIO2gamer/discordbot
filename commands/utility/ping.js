const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  description_full:
    "Measures the bot's response time (latency) and displays its uptime (how long it's been running).",
  usage: "/ping",
  examples: ["/ping"],
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Checks the bot's latency and uptime"), // More descriptive

  async execute(interaction) {
    const sent = await interaction.reply({
      content: "Pinging...", // Initial simple message
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    // Improved uptime formatting
    const uptime = formatUptime(process.uptime());

    const embed = new EmbedBuilder()
      .setTitle("🏓 Pong!") // More fun title
      .setColor("Green")
      .addFields(
        { name: "Bot Latency", value: `${latency}ms`, inline: true },
        { name: "API Latency", value: `${apiLatency}ms`, inline: true },
        { name: "Uptime", value: uptime, inline: false },
      )
      .setTimestamp()
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      });

    await sent.edit({ content: "", embeds: [embed] }); // Edit initial message with embed
  },
};

// Helper function for better uptime formatting
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
}
