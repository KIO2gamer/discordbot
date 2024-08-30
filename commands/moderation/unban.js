const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const ModerationLog = require("../../bot_utils/ModerationLog");

module.exports = {
  description_full:
    "Unbans a member from the server with the specified reason.",
  usage: '/unban userid:"user ID" [reason:"unban reason"]',
  examples: [
    '/unban userid:"123456789012345678"',
    '/unban userid:"123456789012345678" reason:"Ban was a mistake"',
  ],
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a member from the server.")
    .addStringOption((option) =>
      option
        .setName("userid")
        .setDescription("The ID of the member to unban")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("The reason for unbanning"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  async execute(interaction) {
    const userId = interaction.options.getString("userid");
    const reason =
      interaction.options.getString("reason") ?? "No reason provided";

    // Defer the reply to allow time for the operation
    await interaction.deferReply();

    try {
      // Fetch the ban to ensure the user is banned
      const ban = await interaction.guild.bans.fetch(userId);

      if (!ban) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("ERROR")
              .setDescription("User is not banned or not found")
              .setColor("Red")
              .setFooter({
                text: `Done by: ${interaction.user.username}`,
                iconURL: `${interaction.user.displayAvatarURL()}`,
              }),
          ],
        });
        return;
      }

      const logEntry = new ModerationLog({
        action: "unban",
        moderator: interaction.user.id,
        user: userId,
        reason: reason,
      });

      await logEntry.save();

      // Attempt to unban the user
      await interaction.guild.members.unban(userId, reason);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("UNBANNED!!!")
            .setDescription(
              `<@${userId}> has been unbanned for reason: \`${reason}\``,
            )
            .setColor("Green")
            .setFooter({
              text: `Done by: ${interaction.user.username}`,
              iconURL: `${interaction.user.displayAvatarURL()}`,
            }),
        ],
      });
    } catch (error) {
      console.error("Error unbanning user:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("ERROR")
            .setDescription("An error occurred while trying to unban the user")
            .setColor("Red")
            .setFooter({
              text: `Done by: ${interaction.user.username}`,
              iconURL: `${interaction.user.displayAvatarURL()}`,
            }),
        ],
      });
    }
  },
};
