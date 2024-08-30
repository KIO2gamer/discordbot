const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  description_full:
    "Posts a predefined image header to the channel. Useful for sending visual guides or announcements related to specific server sections (like welcome, rules, etc.).",
  usage: "/image_headers <options> [caption]",
  examples: [
    "/image_headers welcome 'Welcome to our server!'",
    "/image_headers rules",
    "/image_headers forms 'Check out our new application form!'",
  ],
  data: new SlashCommandBuilder()
    .setName("image_headers")
    .setDescription("Posts an image.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers,
    )
    .addStringOption((option) =>
      option
        .setName("options")
        .setDescription("Select an image to send")
        .setRequired(true)
        .addChoices(
          { name: "Welcome", value: "welcome" },
          { name: "Self Roles", value: "self_roles" },
          { name: "Rules", value: "rules" },
          { name: "Roles", value: "roles" },
          { name: "Forms", value: "forms" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("caption")
        .setDescription("Add a caption to the image")
        .setRequired(false),
    ),

  async execute(interaction) {
    const options = interaction.options.getString("options");
    const caption = interaction.options.getString("caption") || null;

    const imagePaths = {
      welcome: "./assets/headers/welcome-header.png",
      self_roles: "./assets/headers/self-roles-header.png",
      rules: "./assets/headers/rule-header.png",
      roles: "./assets/headers/role-header.png",
      forms: "./assets/headers/forms-header.png",
    };

    try {
      if (options in imagePaths) {
        await interaction.channel.send({
          content: caption,
          files: [imagePaths[options]],
        });
        console.log(`Image posted by ${interaction.user.tag}: ${options}`);
        await interaction.reply({
          content: `Image successfully posted: ${options}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There is no such option available",
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Error posting image:", error);
      await interaction.reply({
        content: `An error occurred: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
