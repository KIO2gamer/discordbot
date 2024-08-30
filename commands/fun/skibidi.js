const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  description_full:
    "This command playfully grants \"Skibidi powers\" to users who have watched Skibidi Toilet, while denying those who haven't. It reacts based on the user's response to a simple question.",
  usage: "/skibidi",
  examples: ["/skibidi", "/skibidi option:Yes"],
  data: new SlashCommandBuilder()
    .setName("skibidi")
    .setDescription("Gives you skibidi powers")
    .addStringOption((option) =>
      option
        .setName("option")
        .setDescription("Did you watch Skibidi Toilet?")
        .setRequired(true)
        .addChoices({ name: "Yes", value: "yes" }, { name: "No", value: "no" }),
    ),

  async execute(interaction) {
    const option = interaction.options.getString("option");

    if (option === "yes") {
      await interaction.reply("Skibidi powers activated successfully ✅");
      await interaction.channel.send(
        "https://tenor.com/view/eeeeeehmazin-ehmazing-amazing-gif-1173311831093611344",
      );
    } else {
      await interaction.reply(
        "***You are not worthy enough to wield the powers, mortal***",
      );
    }
  },
};
