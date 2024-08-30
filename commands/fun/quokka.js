const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  description_full:
    "Prepare for a cuteness overload! This command summons a delightful GIF of a quokka, guaranteed to brighten your day.",
  usage: "/quokka",
  examples: ["/quokka"],
  data: new SlashCommandBuilder()
    .setName("quokka")
    .setDescription("Send a pic of a quokka because it is cute."),

  async execute(interaction) {
    // Defer the reply to give more time for processing
    await interaction.deferReply();

    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=quokka&limit=10`,
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.data.length);
        const quokkaGif = data.data[randomIndex].images.original.url; // Adjust as necessary for the correct URL

        const embed = new EmbedBuilder()
          .setTitle("You have been blessed by the powers of a quokka!")
          .setImage(quokkaGif);

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply("Sorry, I could not find a quokka GIF.");
      }
    } catch (error) {
      console.error("Error fetching quokka GIF:", error);
      await interaction.editReply(
        "There was an error trying to fetch a quokka GIF.",
      );
    }
  },
};
