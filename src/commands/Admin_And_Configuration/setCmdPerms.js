const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");

const { handleError } = require("../../utils/errorHandler");
const CommandPermissionsSchema = require("./../../database/commandPermissions");

module.exports = {
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName("set_cmd_perms")
        .setDescription("Set permissions for commands")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
            option
                .setName("command")
                .setDescription("The command to set permissions for")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addBooleanOption((option) =>
            option
                .setName("allowed")
                .setDescription("Whether to allow or deny the permission")
                .setRequired(true),
        )
        .addRoleOption((option) =>
            option
                .setName("role")
                .setDescription("The role to set permissions for")
                .setRequired(false),
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to set permissions for")
                .setRequired(false),
        ),
    description_full:
        "Set custom permissions for commands, allowing or denying access for specific roles or users. These permissions are stored in the database and persist between bot restarts.",
    usage: "/set_cmd_perms <command> <allowed> [role] [user]",
    examples: [
        "/set_cmd_perms command:ping allowed:true role:@Moderator",
        "/set_cmd_perms command:kick allowed:false user:@JohnDoe",
        "/set_cmd_perms command:ban allowed:true role:@Admin",
    ],

    // Handle autocomplete for command names
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = Array.from(interaction.client.commands.keys());

        const filtered = choices.filter((choice) => choice.toLowerCase().includes(focusedValue));

        await interaction.respond(
            filtered.slice(0, 25).map((choice) => ({ name: choice, value: choice })),
        );
    },

    /**
     * Executes the setCmdPerms command to set permissions for a specific command.
     * Stores permissions in database for persistence between bot restarts.
     */
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Check if user is bot owner
            if (interaction.user.id !== process.env.OWNER_ID) {
                return await interaction.editReply({
                    content: "Only the bot owner can use this command!",
                });
            }

            const commandName = interaction.options.getString("command").toLowerCase();
            const role = interaction.options.getRole("role");
            const user = interaction.options.getUser("user");
            const allowed = interaction.options.getBoolean("allowed");

            if (!role && !user) {
                return await interaction.editReply({
                    content: "You must specify either a role or user!",
                });
            }

            // Verify command exists
            const command = interaction.client.commands.get(commandName);
            if (!command) {
                return await interaction.editReply({
                    content: `Command "${commandName}" does not exist!`,
                });
            }

            // Find or create permissions document
            let permissionsDoc = await CommandPermissionsSchema.findOne({
                guildId: interaction.guild.id,
                commandName: commandName,
            });

            if (!permissionsDoc) {
                permissionsDoc = new CommandPermissionsSchema({
                    guildId: interaction.guild.id,
                    commandName: commandName,
                    permissions: {
                        roles: new Map(),
                        users: new Map(),
                    },
                });
            }

            // Update permissions
            if (role) {
                permissionsDoc.permissions.roles.set(role.id, allowed);
            }

            if (user) {
                permissionsDoc.permissions.users.set(user.id, allowed);
            }

            // Save to database
            await permissionsDoc.save();

            // Also update in-memory permissions for immediate effect
            if (!command.permissions) command.permissions = {};

            if (role) {
                if (!command.permissions.roles) command.permissions.roles = {};
                command.permissions.roles[role.id] = allowed;
            }

            if (user) {
                if (!command.permissions.users) command.permissions.users = {};
                command.permissions.users[user.id] = allowed;
            }

            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle("Command Permissions Updated")
                .setColor(allowed ? "#00FF00" : "#FF0000")
                .setDescription(
                    `Permissions for command \`${commandName}\` have been updated in the database.`,
                )
                .addFields([
                    {
                        name: "Target",
                        value: role
                            ? `Role: ${role.name} (${role.id})`
                            : `User: ${user.tag} (${user.id})`,
                        inline: true,
                    },
                    {
                        name: "Permission",
                        value: allowed ? "✅ Allowed" : "❌ Denied",
                        inline: true,
                    },
                ])
                .setFooter({
                    text: "Changes will persist after bot restart",
                    iconURL: interaction.client.user.displayAvatarURL(),
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await handleError(
                interaction,
                error,
                error.name === "MongooseError" ? "DATABASE" : "COMMAND_EXECUTION",
                "An error occurred while setting command permissions.",
            );
        }
    },
};
