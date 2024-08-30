const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

module.exports = {
  description_full:
    "This command unlocks a specified channel or the current channel if no channel is specified.",
  usage: "/unlock <channel?>",
  examples: ["/unlock", "/unlock #general"],
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock a channel")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel you want to unlock")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false),
    ),

  async execute(interaction) {
    const channel =
      interaction.options.getChannel("channel") || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    // Check if the bot has the required permissions
    if (
      !channel
        .permissionsFor(interaction.client.user)
        .has(PermissionFlagsBits.ManageChannels)
    ) {
      const noPermissionEmbed = new EmbedBuilder()
        .setTitle("ERROR")
        .setColor("Red")
        .setDescription(
          "I do not have the required permissions to unlock the channel.",
        );
      await interaction.editReply({ embeds: [noPermissionEmbed] });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${channel} has been unlocked`)
      .setColor("Green")
      .setFooter({
        text: `Done by: ${interaction.user.username}`,
        iconURL: `${interaction.user.avatarURL()}`,
      });

    const errorEmbed = new EmbedBuilder()
      .setTitle("ERROR")
      .setColor("Red")
      .setDescription(`${channel} is already unlocked`);

    // Check if the channel is already unlocked
    if (
      !channel.permissionOverwrites.cache
        .get(interaction.guild.id)
        ?.deny.has(PermissionFlagsBits.SendMessages)
    ) {
      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    try {
      // Unlock the channel
      await channel.permissionOverwrites.create(interaction.guild.id, {
        SendMessages: null,
      });

      if (channel === interaction.channel) {
        await interaction.editReply({
          embeds: [embed],
        });
      } else {
        await interaction.editReply({
          content: "**Unlocked Successfully**",
        });
        await channel.send({
          embeds: [embed],
        });
      }
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle("ERROR")
        .setColor("Red")
        .setDescription(
          `An error occurred while trying to unlock the channel: ${error.message}`,
        );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
