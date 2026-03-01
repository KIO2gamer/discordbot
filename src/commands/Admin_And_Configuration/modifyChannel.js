const {
    ChannelType,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    MessageFlags,
} = require("discord.js");

const { handleError } = require("../../utils/errorHandler");

async function handleChannelUpdate(channel, newName, permissionChoice, toggleChoice, role) {
    let response = "";
    let updated = false;

    // Handle name change if provided
    if (newName && newName !== channel.name) {
        try {
            await channel.setName(newName);
            response += `• Channel name changed to \`${newName}\`\n`;
            updated = true;
        } catch (error) {
            throw new Error(`Failed to update channel name: ${error.message}`);
        }
    }

    // Handle permission changes if provided
    if (permissionChoice && role) {
        try {
            const newPerms = {};

            switch (permissionChoice) {
                case "view":
                    newPerms.ViewChannel = toggleChoice;
                    break;
                case "send":
                    newPerms.SendMessages = toggleChoice;
                    break;
                case "manage":
                    newPerms.ManageMessages = toggleChoice;
                    break;
                default:
                    throw new Error("Invalid permission choice");
            }

            await channel.permissionOverwrites.edit(role, newPerms);
            response += `• ${toggleChoice ? "Enabled" : "Disabled"} \`${permissionChoice}\` permission for role \`${role.name}\`\n`;
            updated = true;
        } catch (error) {
            throw new Error(`Failed to update permissions: ${error.message}`);
        }
    }

    return { response, updated };
}

module.exports = {
    cooldown: 15,
    description_full: "Modify channel settings including name and permissions.",
    usage: "/modifychannel <subcommand> <channel> [options]",
    examples: [
        "/modifychannel text #general new_name:announcements",
        '/modifychannel voice "Voice Chat" permission:view toggle:true role:@Member',
    ],

    data: new SlashCommandBuilder()
        .setName("modifychannel")
        .setDescription("Modify channel settings")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("text")
                .setDescription("Modify a text channel")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("The text channel to modify")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("new_name")
                        .setDescription("New name for the channel")
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("permission")
                        .setDescription("Permission to modify")
                        .setRequired(false)
                        .addChoices(
                            { name: "View Channel", value: "view" },
                            { name: "Send Messages", value: "send" },
                            { name: "Manage Messages", value: "manage" },
                        ),
                )
                .addBooleanOption((option) =>
                    option
                        .setName("toggle")
                        .setDescription("Enable or disable the permission")
                        .setRequired(false),
                )
                .addRoleOption((option) =>
                    option
                        .setName("role")
                        .setDescription("Role to modify permissions for")
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("voice")
                .setDescription("Modify a voice channel")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("The voice channel to modify")
                        .addChannelTypes(ChannelType.GuildVoice)
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("new_name")
                        .setDescription("New name for the channel")
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("permission")
                        .setDescription("Permission to modify")
                        .setRequired(false)
                        .addChoices(
                            { name: "View Channel", value: "view" },
                            { name: "Connect", value: "connect" },
                            { name: "Speak", value: "speak" },
                        ),
                )
                .addBooleanOption((option) =>
                    option
                        .setName("toggle")
                        .setDescription("Enable or disable the permission")
                        .setRequired(false),
                )
                .addRoleOption((option) =>
                    option
                        .setName("role")
                        .setDescription("Role to modify permissions for")
                        .setRequired(false),
                ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const channel = interaction.options.getChannel("channel");
            const newChannelName = interaction.options.getString("new_name");
            const permissionChoice = interaction.options.getString("permission");
            const toggleChoice = interaction.options.getBoolean("toggle");
            const role = interaction.options.getRole("role");

            // Validate inputs
            if (!newChannelName && !permissionChoice) {
                await handleError(
                    interaction,
                    new Error("No modifications specified"),
                    "VALIDATION",
                    "Please specify either a new name or permission changes.",
                );
                return;
            }

            if (permissionChoice && (toggleChoice === null || !role)) {
                await handleError(
                    interaction,
                    new Error("Incomplete permission options"),
                    "VALIDATION",
                    "When modifying permissions, both toggle and role options are required.",
                );
                return;
            }

            if (newChannelName && (newChannelName.length < 1 || newChannelName.length > 100)) {
                await handleError(
                    interaction,
                    new Error("Invalid channel name length"),
                    "VALIDATION",
                    "Channel name must be between 1 and 100 characters.",
                );
                return;
            }

            // Check bot permissions
            if (
                !channel
                    .permissionsFor(interaction.guild.members.me)
                    .has(PermissionFlagsBits.ManageChannels)
            ) {
                await handleError(
                    interaction,
                    new Error("Missing permissions"),
                    "PERMISSION",
                    "I do not have permission to modify this channel.",
                );
                return;
            }

            // Attempt to modify channel
            const { response, updated } = await handleChannelUpdate(
                channel,
                newChannelName,
                permissionChoice,
                toggleChoice,
                role,
            );

            if (updated) {
                const successEmbed = new EmbedBuilder()
                    .setTitle("Channel Modified")
                    .setDescription(`Successfully modified ${channel}:\n${response}`)
                    .setColor("Green")
                    .setFooter({
                        text: `Modified by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });
            } else {
                await handleError(
                    interaction,
                    new Error("No changes made"),
                    "VALIDATION",
                    "No changes were made to the channel.",
                );
            }
        } catch (error) {
            if (error.code === 50013) {
                await handleError(
                    interaction,
                    error,
                    "PERMISSION",
                    "I do not have permission to modify this channel.",
                );
            } else if (error.code === 50035) {
                await handleError(
                    interaction,
                    error,
                    "VALIDATION",
                    "Invalid channel settings provided.",
                );
            } else {
                await handleError(
                    interaction,
                    error,
                    "COMMAND_EXECUTION",
                    "An error occurred while modifying the channel.",
                );
            }
        }
    },
};
