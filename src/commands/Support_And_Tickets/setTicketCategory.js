const {
    ChannelType,
    Colors,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    MessageFlags,
} = require("discord.js");

const TicketConfig = require("./../../database/ticketConfig");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 15,
    description_full:
        "Configure ticket system settings (category, support role, max tickets, etc.)",
    usage: "/set_ticket_category category:category [support_role:role] [max_tickets:number]",
    examples: [
        "/set_ticket_category category:Support",
        "/set_ticket_category category:Support support_role:@Support max_tickets:10",
    ],

    data: new SlashCommandBuilder()
        .setName("set_ticket_category")
        .setDescription("Configure ticket system settings")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption((option) =>
            option
                .setName("category")
                .setDescription("The category where tickets will be created")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildCategory),
        )
        .addRoleOption((option) =>
            option.setName("support_role").setDescription("Role to ping for new tickets"),
        )
        .addIntegerOption((option) =>
            option
                .setName("max_tickets")
                .setDescription("Maximum open tickets per user (default: 5)")
                .setMinValue(1)
                .setMaxValue(50),
        )
        .addStringOption((option) =>
            option
                .setName("ticket_prefix")
                .setDescription("Custom prefix for ticket channels (default: ticket)")
                .setMaxLength(10),
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const category = interaction.options.getChannel("category");
            const supportRole = interaction.options.getRole("support_role");
            const maxTickets = interaction.options.getInteger("max_tickets");
            const ticketPrefix = interaction.options.getString("ticket_prefix");

            // Basic validation
            if (!category) {
                return await interaction.editReply("⚠️ You must select a category channel.");
            }

            if (category.type !== ChannelType.GuildCategory) {
                return await interaction.editReply("⚠️ The selected channel must be a category.");
            }

            if (category.guild.id !== interaction.guild.id) {
                return await interaction.editReply("⚠️ The category must be in this server.");
            }

            // Check bot permissions in the category
            const botMember = interaction.guild.members.me;
            const requiredPermissions = [
                { flag: PermissionFlagsBits.ViewChannel, name: "View Channel" },
                { flag: PermissionFlagsBits.ManageChannels, name: "Manage Channels" },
                { flag: PermissionFlagsBits.ManageRoles, name: "Manage Permissions" },
            ];

            const missingPermissions = requiredPermissions
                .filter((perm) => !category.permissionsFor(botMember).has(perm.flag))
                .map((perm) => perm.name);

            if (missingPermissions.length > 0) {
                return await interaction.editReply(
                    `⚠️ I'm missing these permissions in the category:\n• ${missingPermissions.join("\n• ")}`,
                );
            }

            try {
                // Find existing config
                let config = await TicketConfig.findOne({ guildId: interaction.guild.id });

                if (!config) {
                    config = new TicketConfig({ guildId: interaction.guild.id });
                }

                // Update configuration
                config.ticketCategoryId = category.id;
                if (supportRole) config.supportRoleId = supportRole.id;
                if (maxTickets) config.maxOpenTickets = maxTickets;
                if (ticketPrefix) config.ticketPrefix = ticketPrefix;
                config.updatedAt = new Date();

                await config.save();

                // Create response embed with current settings
                const settingsFields = [
                    { name: "Category", value: `${category.name}`, inline: true },
                    { name: "Category ID", value: category.id, inline: true },
                    {
                        name: "Support Role",
                        value: supportRole ? `${supportRole}` : "Not set",
                        inline: true,
                    },
                    {
                        name: "Max Tickets/User",
                        value: `${config.maxOpenTickets}`,
                        inline: true,
                    },
                    {
                        name: "Ticket Prefix",
                        value: `\`${config.ticketPrefix}\``,
                        inline: true,
                    },
                ];

                const embed = new EmbedBuilder()
                    .setTitle("✅ Ticket Configuration Updated")
                    .setDescription(`Ticket system has been configured successfully`)
                    .setColor(Colors.Green)
                    .addFields(settingsFields)
                    .addFields({
                        name: "Next Step",
                        value: "Use `/send_ticket_message` to create a panel where users can open tickets",
                    })
                    .setFooter({
                        text: `Updated by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } catch (dbError) {
                console.error("Database error when setting ticket category:", dbError);
                throw dbError;
            }
        } catch (error) {
            console.error("Error in set_ticket_category command:", error);

            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "There was an error configuring the ticket system. Please try again.",
            );
        }
    },
};
