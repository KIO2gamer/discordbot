const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Colors,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");

const TicketConfig = require("./../../database/ticketConfig");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 30,
    description_full: "Creates a message with a button for users to open tickets",
    usage: "/send_ticket_message channel:#channel title:text description:text button_text:text",
    examples: [
        "/send_ticket_message channel:#support title:Get Help description:Click below to contact our team button_text:Open Ticket",
    ],

    data: new SlashCommandBuilder()
        .setName("send_ticket_message")
        .setDescription("Create a ticket panel with button")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("Where to send the ticket panel")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((option) =>
            option.setName("title").setDescription("Panel title").setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("description").setDescription("Panel description").setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("button_text")
                .setDescription("Text for the ticket button")
                .setRequired(true),
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Get command options
            const channel = interaction.options.getChannel("channel");
            const title = interaction.options.getString("title");
            const description = interaction.options.getString("description");
            const buttonText = interaction.options.getString("button_text");

            // Validate inputs
            if (!channel || channel.type !== ChannelType.GuildText) {
                return await interaction.editReply("⚠️ Please select a valid text channel.");
            }

            if (channel.guild.id !== interaction.guild.id) {
                return await interaction.editReply("⚠️ The channel must be in this server.");
            }

            if (!title || title.length > 256) {
                return await interaction.editReply(
                    "⚠️ Title is required and must be 256 characters or less.",
                );
            }

            if (!description || description.length > 4000) {
                return await interaction.editReply(
                    "⚠️ Description is required and must be 4000 characters or less.",
                );
            }

            if (!buttonText || buttonText.length > 80) {
                return await interaction.editReply(
                    "⚠️ Button text is required and must be 80 characters or less.",
                );
            }

            // Check bot permissions in the channel
            const botMember = interaction.guild.members.me;
            const requiredPermissions = [
                { flag: PermissionFlagsBits.ViewChannel, name: "View Channel" },
                { flag: PermissionFlagsBits.SendMessages, name: "Send Messages" },
                { flag: PermissionFlagsBits.EmbedLinks, name: "Embed Links" },
            ];

            const missingPermissions = requiredPermissions
                .filter((perm) => !channel.permissionsFor(botMember).has(perm.flag))
                .map((perm) => perm.name);

            if (missingPermissions.length > 0) {
                return await interaction.editReply(
                    `⚠️ I'm missing these permissions in ${channel}:\n• ${missingPermissions.join("\n• ")}`,
                );
            }

            // Get ticket configuration
            const ticketConfig = await TicketConfig.findOne({ guildId: interaction.guild.id });

            if (!ticketConfig || !ticketConfig.ticketCategoryId) {
                return await interaction.editReply({
                    content:
                        "⚠️ Ticket system not configured. Please use `/set_ticket_category` first.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Verify the category still exists
            const category = interaction.guild.channels.cache.get(ticketConfig.ticketCategoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                return await interaction.editReply(
                    "⚠️ The configured ticket category no longer exists. Please use `/set_ticket_category` again.",
                );
            }

            // Create ticket panel embed
            const ticketEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(Colors.Blue)
                .addFields({
                    name: "How to Use",
                    value: "Click the button below to create a private support ticket.",
                })
                .setFooter({
                    text: `${interaction.guild.name} • Ticket System`,
                    iconURL: interaction.guild.iconURL(),
                })
                .setTimestamp();

            // Create button
            const button = new ButtonBuilder()
                .setCustomId("create_ticket")
                .setLabel(buttonText)
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🎫");

            const row = new ActionRowBuilder().addComponents(button);

            // Send the ticket panel
            let ticketMessage;
            try {
                ticketMessage = await channel.send({
                    embeds: [ticketEmbed],
                    components: [row],
                });
            } catch (error) {
                console.error("Failed to send ticket panel:", error);
                return await interaction.editReply(
                    "❌ Failed to send the ticket panel message. Please check my permissions.",
                );
            }

            // Send confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle("✅ Ticket Panel Created")
                .setDescription(`Successfully created a ticket panel in ${channel}`)
                .setColor(Colors.Green)
                .addFields([
                    {
                        name: "Message Link",
                        value: `[Click to View](${ticketMessage.url})`,
                        inline: true,
                    },
                    {
                        name: "Category",
                        value: category.name,
                        inline: true,
                    },
                ])
                .setFooter({
                    text: `Created by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [confirmEmbed] });
        } catch (error) {
            console.error("Error in send_ticket_message command:", error);

            await handleError(
                interaction,
                error,
                error.name === "MongooseError" ? "DATABASE" : "COMMAND_EXECUTION",
                "An error occurred while creating the ticket panel. Please try again.",
            );
        }
    },
};
