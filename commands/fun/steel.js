const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  description_full: "Tells the user they have been steeled.",
  usage: "/steel",
  examples: ["/steel"],
  data: new SlashCommandBuilder().setName("steel").setDescription("steel"),

  async execute(interaction) {
    await interaction.reply(
      "Guess wat? you just got steeled.\n*metal pipe drop sound*",
    );
  },
};
