const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

module.exports = {
  description_full:
    "The bot will shuffle the letters of a randomly chosen word. Users have 30 seconds to unscramble the word and guess correctly.",
  usage: "/unscramble",
  examples: ["/unscramble"],
  data: new SlashCommandBuilder()
    .setName("unscramble")
    .setDescription("Unscramble the word and win!"),
  async execute(interaction) {
    fs.readFile(
      "./assets/texts/hangmanWords.txt",
      "utf-8",
      async (err, data) => {
        if (err) {
          console.error("Failed to read the word list:", err);
          return interaction.reply(
            "An error occurred while loading the words.",
          );
        }

        const words = data
          .split("\n")
          .map((word) => word.trim())
          .filter((word) => word);
        if (words.length === 0) {
          return interaction.reply("The word list is empty!");
        }

        const chosenWord = words[Math.floor(Math.random() * words.length)];
        const shuffledWord = shuffleWord(chosenWord);

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle("Unscramble the Word!")
          .setDescription(`\`\`\`${shuffledWord}\`\`\``)
          .setFooter({ text: "You have 30 seconds to guess!" });

        await interaction.reply({ embeds: [embed] });

        const filter = (m) => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({
          filter,
          time: 30000,
        });

        collector.on("collect", async (msg) => {
          if (msg.content.toLowerCase() === chosenWord) {
            embed
              .setColor(0x00ff00)
              .setTitle("Correct!")
              .setDescription(
                `You got it right! The word was **${chosenWord}**. 🎉`,
              )
              .setFooter({ text: "" }); // Remove timer footer
            await interaction.editReply({ embeds: [embed] });
            collector.stop();
          } else {
            await msg.reply("Incorrect, try again!");
          }
        });

        collector.on("end", (collected, reason) => {
          if (reason === "time") {
            embed
              .setColor(0xff0000)
              .setTitle("Time Up!")
              .setDescription(`The word was **${chosenWord}**.`);
            interaction.editReply({ embeds: [embed] });
          }
        });
      },
    );
  },
};

function shuffleWord(word) {
  const wordArray = word.split("");
  for (let i = wordArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wordArray[i], wordArray[j]] = [wordArray[j], wordArray[i]];
  }
  return wordArray.join("");
}
