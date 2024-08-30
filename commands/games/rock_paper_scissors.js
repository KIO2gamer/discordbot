const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  description_full: "A classic game of Rock, Paper, Scissors against the bot.",
  usage: "/rock_paper_scissors <choice>",
  examples: [
    "/rock_paper_scissors rock",
    "/rock_paper_scissors paper",
    "/rock_paper_scissors scissors",
  ],
  data: new SlashCommandBuilder()
    .setName("rock_paper_scissors")
    .setDescription("Play Rock, Paper, Scissors!")
    .addStringOption((option) =>
      option
        .setName("choice")
        .setDescription("Choose Rock, Paper, or Scissors")
        .setRequired(true)
        .addChoices(
          { name: "Rock", value: "rock" },
          { name: "Paper", value: "paper" },
          { name: "Scissors", value: "scissors" },
        ),
    ),
  async execute(interaction) {
    const userChoice = interaction.options.getString("choice");
    const choices = ["rock", "paper", "scissors"];
    const botChoice = choices[Math.floor(Math.random() * 3)];

    let result = "";
    if (userChoice === botChoice) {
      result = "It's a tie!";
    } else if (
      (userChoice === "rock" && botChoice === "scissors") ||
      (userChoice === "paper" && botChoice === "rock") ||
      (userChoice === "scissors" && botChoice === "paper")
    ) {
      result = `You win! I chose ${botChoice}.`;
    } else {
      result = `You lose! I chose ${botChoice}.`;
    }

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Rock, Paper, Scissors")
      .setDescription(`You chose ${userChoice}. ${result}`);

    await interaction.reply({ embeds: [embed] });
  },
};
