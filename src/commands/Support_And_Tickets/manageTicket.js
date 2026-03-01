const {
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    MessageFlags,
} = require("discord.js");
const TicketStorage = require("../../database/ticketStorage");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 15,
    description_full: "View and manage ticket information, priority, and staff assignment",
    usage: "/ticket [action:info|priority|assign] [priority:level] [user:user]",
    examples: [
        "/ticket action:info",
        "/ticket action:priority priority:high",
        "/ticket action:assign user:@staff",
    ],

    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Manage and view ticket information")
        .addSubcommand((subcommand) =>
            subcommand.setName("info").setDescription("View current ticket information"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("priority")
                .setDescription("Set ticket priority")
                .addStringOption((option) =>
                    option
                        .setName("level")
                        .setDescription("Priority level")
                        .setRequired(true)
                        .addChoices(
                            { name: "Low", value: "low" },
                            { name: "Medium", value: "medium" },
                            { name: "High", value: "high" },
                        ),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("assign")
                .setDescription("Assign staff to ticket")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("Staff member to assign")
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("unassign")
                .setDescription("Unassign staff from ticket")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("Staff member to unassign")
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("close")
                .setDescription("Close the ticket")
                .addStringOption((option) =>
                    option.setName("reason").setDescription("Reason for closing"),
                ),
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Find ticket
            const ticket = await TicketStorage.findOne({
                channelId: interaction.channel.id,
            });

            if (!ticket) {
                return await interaction.editReply(
                    "⚠️ This command can only be used in ticket channels.",
                );
            }

            const subcommand = interaction.options.getSubcommand();

            // Check permissions for assign/unassign/close subcommands
            if (
                (subcommand === "assign" || subcommand === "unassign" || subcommand === "close") &&
                !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)
            ) {
                return await interaction.editReply(
                    "⚠️ You need the Manage Channels permission to use this subcommand.",
                );
            }

            if (subcommand === "info") {
                return await this.handleInfo(interaction, ticket);
            } else if (subcommand === "priority") {
                return await this.handlePriority(interaction, ticket);
            } else if (subcommand === "assign") {
                return await this.handleAssign(interaction, ticket);
            } else if (subcommand === "unassign") {
                return await this.handleUnassign(interaction, ticket);
            } else if (subcommand === "close") {
                return await this.handleClose(interaction, ticket);
            }
        } catch (error) {
            console.error("Error managing ticket:", error);
            await handleError(interaction, error, "DATABASE", "Failed to manage ticket.");
        }
    },

    async handleInfo(interaction, ticket) {
        // Get the ticket creator
        const ticketCreator = await interaction.guild.members
            .fetch(ticket.userId)
            .catch(() => null);

        // Calculate duration
        const duration = this.formatDuration(ticket.createdAt, ticket.closedAt || new Date());

        // Build status and priority indicators
        const statusEmoji = {
            open: "🟢",
            closed: "🔴",
            archived: "⚫",
        }[ticket.status];

        const priorityEmoji = {
            low: "🟢",
            medium: "🟡",
            high: "🔴",
        }[ticket.priority];

        // Create info embed
        const infoEmbed = new EmbedBuilder()
            .setTitle(`🎫 Ticket Information`)
            .setColor(
                ticket.status === "open"
                    ? 0x5865f2
                    : ticket.status === "closed"
                      ? 0xff0000
                      : 0x808080,
            )
            .addFields(
                { name: "Ticket ID", value: ticket.ticketId, inline: true },
                {
                    name: "Status",
                    value: `${statusEmoji} ${ticket.status.toUpperCase()}`,
                    inline: true,
                },
                {
                    name: "Priority",
                    value: `${priorityEmoji} ${ticket.priority.toUpperCase()}`,
                    inline: true,
                },
                {
                    name: "Created By",
                    value: ticketCreator
                        ? `${ticketCreator.user.tag}`
                        : `Unknown (${ticket.userId})`,
                    inline: true,
                },
                {
                    name: "Created At",
                    value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`,
                    inline: true,
                },
                { name: "Duration", value: duration, inline: true },
                { name: "Message Count", value: `${ticket.messageCount}`, inline: true },
            )
            .setTimestamp();

        // Add assigned staff if any
        if (ticket.assignedStaff && ticket.assignedStaff.length > 0) {
            const staffMembers = [];
            for (const staffId of ticket.assignedStaff) {
                const staffMember = await interaction.guild.members
                    .fetch(staffId)
                    .catch(() => null);
                staffMembers.push(staffMember ? staffMember.user.tag : `Unknown (${staffId})`);
            }
            infoEmbed.addFields({
                name: "Assigned Staff",
                value: staffMembers.join("\n"),
                inline: false,
            });
        }

        // Add closure info if closed
        if (ticket.status === "closed") {
            const closedBy = await interaction.guild.members
                .fetch(ticket.closedBy)
                .catch(() => null);
            infoEmbed.addFields(
                {
                    name: "Closed By",
                    value: closedBy ? closedBy.user.tag : `Unknown (${ticket.closedBy})`,
                    inline: true,
                },
                {
                    name: "Closed At",
                    value: `<t:${Math.floor(ticket.closedAt.getTime() / 1000)}:F>`,
                    inline: true,
                },
                { name: "Close Reason", value: ticket.closeReason, inline: false },
            );
        }

        await interaction.editReply({ embeds: [infoEmbed] });
    },

    async handlePriority(interaction, ticket) {
        const priority = interaction.options.getString("level");
        ticket.priority = priority;
        await ticket.save();

        const priorityEmoji = { low: "🟢", medium: "🟡", high: "🔴" }[priority];

        const updateEmbed = new EmbedBuilder()
            .setTitle("✅ Priority Updated")
            .setDescription(`Priority set to ${priorityEmoji} ${priority.toUpperCase()}`)
            .setColor(0x5865f2)
            .setTimestamp();

        await interaction.editReply({ embeds: [updateEmbed] });

        // Notify in ticket channel
        const notifyEmbed = new EmbedBuilder()
            .setTitle("📝 Ticket Updated")
            .setDescription(`Priority updated to ${priorityEmoji} ${priority.toUpperCase()}`)
            .setColor(0x5865f2)
            .setFooter({
                text: `Updated by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.channel.send({ embeds: [notifyEmbed] });
    },

    async handleAssign(interaction, ticket) {
        const user = interaction.options.getUser("user");

        if (ticket.assignedStaff.includes(user.id)) {
            return await interaction.editReply(
                `⚠️ ${user.tag} is already assigned to this ticket.`,
            );
        }

        ticket.assignedStaff.push(user.id);
        await ticket.save();

        // Give assigned staff access to the channel
        try {
            await interaction.channel.permissionOverwrites.create(user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
            });
        } catch (e) {
            console.error("Failed to update permissions:", e);
        }

        const updateEmbed = new EmbedBuilder()
            .setTitle("✅ Staff Assigned")
            .setDescription(`${user.tag} has been assigned to this ticket`)
            .setColor(0x5865f2)
            .setTimestamp();

        await interaction.editReply({ embeds: [updateEmbed] });

        // Notify in ticket channel
        const notifyEmbed = new EmbedBuilder()
            .setTitle("📝 Ticket Updated")
            .setDescription(`${user} has been assigned to this ticket`)
            .setColor(0x5865f2)
            .setFooter({
                text: `Updated by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.channel.send({ embeds: [notifyEmbed] });
    },

    async handleUnassign(interaction, ticket) {
        const user = interaction.options.getUser("user");

        if (!ticket.assignedStaff.includes(user.id)) {
            return await interaction.editReply(`⚠️ ${user.tag} is not assigned to this ticket.`);
        }

        ticket.assignedStaff = ticket.assignedStaff.filter((id) => id !== user.id);
        await ticket.save();

        // Remove access from the channel
        try {
            await interaction.channel.permissionOverwrites.delete(user.id);
        } catch (e) {
            console.error("Failed to update permissions:", e);
        }

        const updateEmbed = new EmbedBuilder()
            .setTitle("✅ Staff Unassigned")
            .setDescription(`${user.tag} has been unassigned from this ticket`)
            .setColor(0x5865f2)
            .setTimestamp();

        await interaction.editReply({ embeds: [updateEmbed] });

        // Notify in ticket channel
        const notifyEmbed = new EmbedBuilder()
            .setTitle("📝 Ticket Updated")
            .setDescription(`${user} has been unassigned from this ticket`)
            .setColor(0x5865f2)
            .setFooter({
                text: `Updated by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.channel.send({ embeds: [notifyEmbed] });
    },

    formatDuration(startDate, endDate) {
        const seconds = Math.floor((endDate - startDate) / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    },

    async handleClose(interaction, ticket) {
        const reason = interaction.options.getString("reason") ?? "No reason provided";

        if (ticket.status === "closed") {
            return await interaction.editReply("⚠️ This ticket is already closed.");
        }

        // Update ticket status in database
        ticket.status = "closed";
        ticket.closedAt = new Date();
        ticket.closedBy = interaction.user.id;
        ticket.closeReason = reason;
        await ticket.save();

        // Create closure summary embed
        const closureEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle(`🔒 Ticket Closed`)
            .setDescription(`Ticket has been closed.`)
            .addFields(
                { name: "Closed By", value: `${interaction.user}`, inline: true },
                { name: "Reason", value: reason, inline: false },
                {
                    name: "Duration",
                    value: this.formatDuration(ticket.createdAt, new Date()),
                    inline: true,
                },
                { name: "Messages", value: `${ticket.messageCount}`, inline: true },
            )
            .setTimestamp();

        // Send closure notification to the channel
        await interaction.channel.send({ embeds: [closureEmbed] });

        // Notify the ticket creator
        const ticketCreator = await interaction.guild.members
            .fetch(ticket.userId)
            .catch(() => null);

        if (ticketCreator) {
            const userNotificationEmbed = new EmbedBuilder()
                .setTitle("🔒 Your Ticket Was Closed")
                .setDescription(`Your ticket in \`${interaction.guild.name}\` has been closed.`)
                .addFields(
                    { name: "Closed By", value: `${interaction.user.tag}`, inline: true },
                    { name: "Reason", value: reason, inline: false },
                )
                .setColor("#ff0000")
                .setThumbnail(interaction.guild.iconURL())
                .setTimestamp();

            try {
                await ticketCreator.send({ embeds: [userNotificationEmbed] });
            } catch {
                console.log("Could not DM ticket creator");
            }
        }

        await interaction.editReply({
            content: `✅ Ticket closed successfully. Deleting channel in 5 seconds...`,
        });

        // Delete the channel after a delay
        setTimeout(() => {
            interaction.channel.delete().catch((e) => {
                console.error("Failed to delete ticket channel:", e);
            });
        }, 5000);
    },
};
