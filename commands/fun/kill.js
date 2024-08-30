const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  description_full:
    'Send a playfully threatening (but ultimately harmless) assassin message. Get ready to be "assassinated" with laughter!',
  usage: "/kill",
  examples: ["/kill"],
  data: new SlashCommandBuilder()
    .setName("kill")
    .setDescription("Sends a humorous assassin message to the user."),

  async execute(interaction) {
    const assassinMessages = [
      "An assassin has been dispatched to your location... just kidding!",
      "The hitman is on his way... to give you a high five!",
      "Watch out! A ninja is coming... to steal your snacks!",
      "A secret agent is en route... to prank you with a water balloon!",
      "Beware! A spy is nearby... to tell you a funny joke!",
      `i got yr home address\nalso get rekt bozo coz im sending a hitman to yeet ya`,
    ];

    const randomMessage =
      assassinMessages[Math.floor(Math.random() * assassinMessages.length)];

    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("🔪 Assassin Alert!")
      .setDescription(randomMessage)
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({
          dynamic: true,
        }),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
