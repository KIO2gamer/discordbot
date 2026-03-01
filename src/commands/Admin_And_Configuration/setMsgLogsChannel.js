const {
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");

const MsgLogsConfig = require("./../../database/msgLogsConfig");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 15,
    description_full:
        'Sets which channel each message-log event will be sent to. Requires the "Administrator" permission.',
    usage: "/set_msg_logs_channel <event:string> <channel:channel>",
    examples: [
        "/set_msg_logs_channel event:all_message_events channel:#logs",
        "/set_msg_logs_channel event:message_deletions channel:#delete-logs",
        "/set_msg_logs_channel event:message_edits channel:#edit-logs",
        "/set_msg_logs_channel event:message_bulk_deletions channel:#bulk-logs",
        "/set_msg_logs_channel event:member_joins channel:#join-logs",
        "/set_msg_logs_channel event:member_leaves channel:#leave-logs",
        "/set_msg_logs_channel event:member_bans channel:#ban-logs",
        "/set_msg_logs_channel event:member_unbans channel:#ban-logs",
        "/set_msg_logs_channel event:channel_changes channel:#channel-logs",
        "/set_msg_logs_channel event:role_changes channel:#role-logs",
    ],
    data: new SlashCommandBuilder()
        .setName("set_msg_logs_channel")
        .setDescription("Set which channel receives a specific message-log event.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
            option
                .setName("event")
                .setDescription("Which event should be sent to this log channel")
                .setRequired(true)
                .addChoices(
                    { name: "All message events (default)", value: "message_all" },
                    { name: "Message deletions", value: "message_delete" },
                    { name: "Message edits", value: "message_update" },
                    { name: "Message bulk deletions", value: "message_bulk_delete" },
                    { name: "Member joins", value: "member_join" },
                    { name: "Member leaves", value: "member_leave" },
                    { name: "Member bans", value: "member_ban" },
                    { name: "Member unbans", value: "member_unban" },
                    { name: "Channel creates", value: "channel_create" },
                    { name: "Channel deletes", value: "channel_delete" },
                    { name: "Role creates", value: "role_create" },
                    { name: "Role deletes", value: "role_delete" },
                ),
        )
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The channel to show message logs to.")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText),
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const eventKey = interaction.options.getString("event");
            const channel = interaction.options.getChannel("channel");

            const friendlyEventNames = {
                message_all: "All message events",
                message_delete: "Message deletions",
                message_update: "Message edits",
                message_bulk_delete: "Message bulk deletions",
                member_join: "Member joins",
                member_leave: "Member leaves",
                member_ban: "Member bans",
                member_unban: "Member unbans",
                channel_create: "Channel creates",
                channel_delete: "Channel deletes",
                role_create: "Role creates",
                role_delete: "Role deletes",
            };

            // Validate channel
            if (!channel) {
                await handleError(
                    interaction,
                    new Error("No channel provided"),
                    "VALIDATION",
                    "Please provide a valid text channel.",
                );
                return;
            }

            // Check if channel is in the same guild
            if (channel.guildId !== interaction.guildId) {
                await handleError(
                    interaction,
                    new Error("Invalid channel guild"),
                    "VALIDATION",
                    "The channel must be in this server.",
                );
                return;
            }

            // Check bot permissions in the channel
            const botMember = interaction.guild.members.me;
            const requiredPermissions = [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ReadMessageHistory,
            ];

            const missingPermissions = requiredPermissions.filter(
                (perm) => !channel.permissionsFor(botMember).has(perm),
            );

            if (missingPermissions.length > 0) {
                const permissionNames = missingPermissions.map((perm) =>
                    Object.keys(PermissionFlagsBits)
                        .find((key) => PermissionFlagsBits[key] === perm)
                        .replace(/_/g, " ")
                        .toLowerCase(),
                );

                await handleError(
                    interaction,
                    new Error("Missing channel permissions"),
                    "PERMISSION",
                    `I need the following permissions in ${channel}: ${permissionNames.join(", ")}`,
                );
                return;
            }

            try {
                // Build update payload to target specific event key
                const updatePayload = {};

                if (eventKey === "message_all") {
                    updatePayload.channelId = channel.id; // legacy default for all message logs
                    updatePayload["channels.message_delete"] = channel.id;
                    updatePayload["channels.message_update"] = channel.id;
                    updatePayload["channels.message_bulk_delete"] = channel.id;
                    updatePayload["channels.member_join"] = channel.id;
                    updatePayload["channels.member_leave"] = channel.id;
                    updatePayload["channels.member_ban"] = channel.id;
                    updatePayload["channels.member_unban"] = channel.id;
                    updatePayload["channels.channel_create"] = channel.id;
                    updatePayload["channels.channel_delete"] = channel.id;
                    updatePayload["channels.role_create"] = channel.id;
                    updatePayload["channels.role_delete"] = channel.id;
                } else {
                    updatePayload[`channels.${eventKey}`] = channel.id;
                }

                await MsgLogsConfig.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { $set: updatePayload },
                    { upsert: true, new: true, setDefaultsOnInsert: true },
                );

                const embed = new EmbedBuilder()
                    .setTitle("Message Logs Channel Set")
                    .setDescription(
                        `${friendlyEventNames[eventKey] || "Selected event"} will be sent to ${channel}`,
                    )
                    .addFields(
                        { name: "Channel", value: channel.name, inline: true },
                        {
                            name: "Event",
                            value: friendlyEventNames[eventKey] || eventKey,
                            inline: true,
                        },
                        { name: "Channel ID", value: channel.id, inline: true },
                    )
                    .setColor("Green")
                    .setFooter({
                        text: `Set by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral,
                });

                // Send test message to verify permissions
                const testEmbed = new EmbedBuilder()
                    .setTitle("Message Logs Setup")
                    .setDescription(
                        `This channel has been set up for: ${friendlyEventNames[eventKey] || eventKey}.`,
                    )
                    .setColor("Blue")
                    .addFields({
                        name: "Test Log",
                        value: "This is a test message to verify permissions.",
                    })
                    .setTimestamp();

                await channel.send({ embeds: [testEmbed] });
            } catch (error) {
                if (error.code === 11000) {
                    await handleError(
                        interaction,
                        error,
                        "DATABASE",
                        "Failed to update the message logs channel configuration.",
                    );
                } else {
                    throw error;
                }
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while setting up the message logs channel.",
            );
        }
    },
};
