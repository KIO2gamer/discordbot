const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  description_full:
    "Ask a question to the magic 8-ball and receive a mystical (and often hilarious) response.",
  usage: "/8ball [question]",
  examples: [
    "/8ball Will I win the lottery today?",
    "/8ball Is this the best day of my life?",
  ],
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8ball a question.")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("The question to ask")
        .setRequired(true),
    ),

  async execute(interaction) {
    const question = interaction.options.getString("question");
    const responses = [
      "Yes.",
      "No.",
      "Maybe.",
      "Definitely!",
      "Absolutely not!",
      "Ask again later.",
      "Ayeee",
      "Nay",
      "Yessirrrrr",
      "Nuh uh",
    ];

    const embed = new EmbedBuilder()
      .setDescription(
        `# Question: ${question}\nAnswer: ***${responses[Math.floor(Math.random() * responses.length)]}***`,
      )
      .setColor("#00ff00")
      .setFooter({
        text: `Executed by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
