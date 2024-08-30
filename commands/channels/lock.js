const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

module.exports = {
  description_full:
    "This command locks a specified text or announcement channel, preventing users from sending messages in it. If no channel is specified, it will lock the channel the command is used in.",
  usage: "/lock <channel>",
  examples: [
    "/lock channel:text_channel", // Locks the "text_channel" channel
    "/lock channel:announcement_channel", // Locks the "announcement_channel" channel
    "/lock", // Locks the current channel where the command is used
  ],
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock a channel")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel you want to lock")
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
          "I do not have the required permissions to lock the channel.",
        );
      await interaction.editReply({ embeds: [noPermissionEmbed] });
      return;
    }

    // Check if the channel is already locked
    if (
      channel.permissionOverwrites.cache
        .get(interaction.guild.id)
        ?.deny.has(PermissionFlagsBits.SendMessages)
    ) {
      const alreadyLockedEmbed = new EmbedBuilder()
        .setTitle("ERROR")
        .setColor("Red")
        .setDescription(`${channel} is already locked.`);
      await interaction.editReply({ embeds: [alreadyLockedEmbed] });
      return;
    }

    try {
      // Lock the channel
      await channel.permissionOverwrites.create(interaction.guild.id, {
        SendMessages: false,
      });

      const lockEmbed = new EmbedBuilder()
        .setTitle(`${channel.name} has been locked`)
        .setColor("Red")
        .setFooter({
          text: `Done by: ${interaction.user.username}`,
          iconURL: `${interaction.user.avatarURL()}`,
        })
        .setTimestamp();

      if (channel === interaction.channel) {
        await interaction.editReply({
          embeds: [lockEmbed],
        });
      } else {
        await interaction.editReply({
          content: "**Locked Successfully**",
        });
        await channel.send({
          embeds: [lockEmbed],
        });
      }
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle("ERROR")
        .setColor("Red")
        .setDescription(
          `An error occurred while trying to lock the channel: ${error.message}`,
        );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
