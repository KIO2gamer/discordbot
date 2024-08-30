const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');

module.exports = {
  description_full:
    "Shows information about a user, either the user who executed the command or a specified user. This includes their username, ID, roles, join date, status, activity, and more.",
  usage: "/userinfo [target]",
  examples: ["/userinfo", "/userinfo @user"],
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays information about a user.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to get information about")
        .setRequired(false),
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("target") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);

    // Early return if member is not found (e.g., left the server)
    if (!member) {
      return interaction.reply({
        content: "That user is not a member of this server.",
        ephemeral: true,
      });
    }

    function getActivityName(activity) {
      switch (activity.type) {
        case ActivityType.Playing:
          return `Playing ${activity.name}`;
        case ActivityType.Streaming:
          return `Streaming ${activity.name}`;
        case ActivityType.Listening:
          return `Listening to ${activity.name}`;
        case ActivityType.Watching:
          return `Watching ${activity.name}`;
        case ActivityType.Competing:
          return `Competing in ${activity.name}`;
        case ActivityType.Custom:
          return activity.state
            ? `${activity.emoji} ${activity.state}`
            : "Custom Status";
        default:
          return "Unknown Activity";
      }
    }

    // Prepare data for embed fields
    const fields = [
      { name: "Username", value: user.tag, inline: true },
      { name: "User ID", value: user.id, inline: true },
      { name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
      {
        name: "Account Created",
        value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
        inline: true,
      },
      {
        name: "Joined Server",
        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
        inline: true,
      },
      {
        name: "Presence",
        value: member.presence?.status || "Offline",
        inline: true,
      },
      {
        name: "Highest Role",
        value: member.roles.highest.toString(),
        inline: true,
      },
      {
        name: "Roles",
        value:
          member.roles.cache.size > 1 // Show roles only if there's more than @everyone
            ? member.roles.cache
                .filter((role) => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map((role) => role.toString())
                .join(", ")
            : "None",
      },
      {
        name: "Current Activity",
        value: member.presence?.activities.length
          ? member.presence.activities.map(getActivityName).join("\n") // Use helper function
          : "None",
      },
      {
        name: "Server Booster Since",
        value: member.premiumSince
          ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:F>`
          : "No",
        inline: true,
      },
      {
        name: "Client Status",
        value: member.presence?.clientStatus
          ? Object.keys(member.presence.clientStatus).join(", ")
          : "Unknown",
        inline: true,
      },
      {
        name: "Display Color",
        value:
          member.displayHexColor === "#000000"
            ? "Default"
            : member.displayHexColor,
        inline: true,
      },
    ];

    const userInfoEmbed = new EmbedBuilder()
      .setTitle(`User Information - ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor(member.displayHexColor) // Use member's display color
      .addFields(fields);

    await interaction.reply({ embeds: [userInfoEmbed] });
  },
};
