const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const ModerationLog = require("../../bot_utils/ModerationLog");
const ms = require("ms"); // Use ms library to parse duration strings

module.exports = {
  description_full:
    "Temporarily bans a member for the specified duration and reason.",
  usage: '/tempban target:@user duration:"duration" [reason:"ban reason"]',
  examples: [
    '/tempban target:@user123 duration:"1d"',
    '/tempban target:@user123 duration:"2h" reason:"Spamming"',
  ],
  data: new SlashCommandBuilder()
    .setName("tempban")
    .setDescription("Temporarily ban a member for a specified duration.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The member to ban")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("The duration of the ban (e.g., 1h, 1d)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("The reason for banning"),
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers,
    )
    .setDMPermission(false),

  async execute(interaction) {
    const targetUser = interaction.options.getMember("target");
    const duration = interaction.options.getString("duration");
    const reason =
      interaction.options.getString("reason") ?? "No reason provided";

    // Defer the reply to allow time for the operation
    await interaction.deferReply();

    // Check if the target user exists
    if (!targetUser) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("ERROR")
            .setDescription("User not found")
            .setColor("Red")
            .setFooter({
              text: `Done by: ${interaction.user.username}`,
              iconURL: `${interaction.user.displayAvatarURL()}`,
            }),
        ],
      });
      return;
    }

    // Check if the target user is the server owner
    if (targetUser.id === interaction.guild.ownerId) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("ERROR")
            .setDescription("You cannot ban the owner of the server")
            .setColor("Red")
            .setFooter({
              text: `Done by: ${interaction.user.username}`,
              iconURL: `${interaction.user.displayAvatarURL()}`,
            }),
        ],
      });
      return;
    }

    // Get role positions
    const targetUserRolePosition = targetUser.roles.highest.position;
    const requestUserRolePosition = interaction.member.roles.highest.position;
    const botRolePosition = interaction.guild.members.me.roles.highest.position;

    // Check if the user trying to ban has a higher role than the target
    if (targetUserRolePosition >= requestUserRolePosition) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("ERROR")
            .setDescription(
              "You cannot ban someone with a higher or equal role than you",
            )
            .setColor("Red")
            .setFooter({
              text: `Done by: ${interaction.user.username}`,
              iconURL: `${interaction.user.displayAvatarURL()}`,
            }),
        ],
      });
      return;
    }

    // Check if the bot has a higher role than the target
    if (targetUserRolePosition >= botRolePosition) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("ERROR")
            .setDescription(
              "I cannot ban someone with a higher or equal role than myself",
            )
            .setColor("Red")
            .setFooter({
              text: `Done by: ${interaction.user.username}`,
              iconURL: `${interaction.user.displayAvatarURL()}`,
            }),
        ],
      });
      return;
    }

    // Parse duration
    const durationMs = ms(duration);
    if (!durationMs) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("ERROR")
            .setDescription(
              "Invalid duration format. Please use formats like 1h, 1d, etc.",
            )
            .setColor("Red")
            .setFooter({
              text: `Done by: ${interaction.user.username}`,
              iconURL: `${interaction.user.displayAvatarURL()}`,
            }),
        ],
      });
      return;
    }

    // Attempt to ban the user
    try {
      const logEntry = new ModerationLog({
        action: "tempban",
        moderator: interaction.user.id,
        user: targetUser.id,
        reason: reason,
        duration: durationMs,
      });

      await logEntry.save();

      await targetUser.ban({ reason: reason });
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("TEMPORARY BAN")
            .setDescription(
              `<@${targetUser.id}> has been banned for ${duration} for: \`${reason}\``,
            )
            .setColor("Green")
            .setFooter({
              text: `Done by: ${interaction.user.username}`,
              iconURL: `${interaction.user.displayAvatarURL()}`,
            }),
        ],
      });

      // Schedule unban
      setTimeout(async () => {
        try {
          await interaction.guild.members.unban(targetUser.id);
          console.log(
            `Successfully unbanned ${targetUser.tag} after ${duration}`,
          );
        } catch (error) {
          console.error(`Failed to unban ${targetUser.tag}: ${error}`);
        }
      }, durationMs);
    } catch (error) {
      console.error("Error banning user:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("ERROR")
            .setDescription("An error occurred while trying to ban the user")
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
