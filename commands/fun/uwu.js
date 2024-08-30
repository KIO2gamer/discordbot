const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  description_full: "Displays a random uwu GIF from Tenor.",
  usage: "/uwu",
  examples: ["/uwu"],
  data: new SlashCommandBuilder().setName("uwu").setDescription("uwu"),

  async execute(interaction) {
    // Defer the reply to give more time for processing
    await interaction.deferReply();

    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=uwu&key=${process.env.TENOR_API_KEY}&limit=5`,
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.results.length);
        const uwuGif = data.results[randomIndex].media_formats.gif.url; // Adjust as necessary for the correct URL

        const embed = new EmbedBuilder()
          .setTitle("***Notice me, senpai!***")
          .setImage(uwuGif);

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply("Sorry, I could not find a uwu GIF.");
      }
    } catch (error) {
      console.error("Error fetching uwu GIF:", error);
      await interaction.editReply(
        "There was an error trying to fetch a uwu GIF.",
      );
    }
  },
};
