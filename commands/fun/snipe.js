const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const cooldowns = new Map();

module.exports = {
  description_full:
    'This command simulates a "sniping" action on a mentioned user, sending a GIF and an embed message to the channel. It includes a 5-minute cooldown to prevent spamming.',
  usage: "/snipe <user>",
  examples: ["/snipe @username", "/snipe @anotherUser"],
  data: new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("Snipes the user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to snipe")
        .setRequired(true),
    ),

  async execute(interaction) {
    const cooldownAmount = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const timestamps = cooldowns.get(interaction.user.id);

    if (timestamps && now < timestamps + cooldownAmount) {
      const timeLeft = (timestamps + cooldownAmount - now) / 1000;
      return interaction.reply(
        `Please wait ${timeLeft.toFixed(1)} more seconds before using the \`snipe\` command again.`,
      );
    }

    const userOption = interaction.options.getUser("user");
    const userId = userOption.id;

    if (!userOption) {
      return interaction.reply("You need to mention a user to snipe!");
    }

    const embed = new EmbedBuilder()
      .setTitle("Sniped Successfully")
      .setDescription(`Your target (<@${userId}>) has been sniped.`)
      .setColor("#00ff00")
      .setFooter({
        text: `Executed by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    try {
      await interaction.channel.send({
        content: `https://tenor.com/view/family-guy-peter-griffin-gun-point-sniper-rifle-gif-16445332`,
      });
      await interaction.channel.send({ embeds: [embed] });
      cooldowns.set(interaction.user.id, now);
      console.log(
        `${interaction.user.tag} sniped ${userOption.tag} at ${new Date(now).toISOString()}`,
      );
    } catch (error) {
      console.error("Error executing snipe command:", error);
      interaction.reply("There was an error while executing this command.");
    }
  },
};
