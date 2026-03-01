const {
    ChannelType,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 30,
    description_full: "Creates a new channel in the server with specified settings.",
    usage: "/new_channel name:channel-name type:text/voice [category:category] [topic:description]",
    examples: [
        "/new_channel name:general type:text",
        "/new_channel name:voice-chat type:voice category:Voice Channels",
        "/new_channel name:announcements type:text topic:Server announcements",
    ],
    data: new SlashCommandBuilder()
        .setName("new_channel")
        .setDescription("Creates a new channel in the server.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption((option) =>
            option.setName("name").setDescription("The name for the new channel").setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("The type of channel to create")
                .setRequired(true)
                .addChoices({ name: "Text", value: "text" }, { name: "Voice", value: "voice" }),
        )
        .addChannelOption((option) =>
            option
                .setName("category")
                .setDescription("The category to place the channel in")
                .addChannelTypes(ChannelType.GuildCategory),
        )
        .addStringOption((option) =>
            option
                .setName("topic")
                .setDescription("The topic/description for the channel (text channels only)"),
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const name = interaction.options.getString("name");
            const type = interaction.options.getString("type");
            const category = interaction.options.getChannel("category");
            const topic = interaction.options.getString("topic");

            // Validate channel name
            if (!/^[\w-]+$/.test(name)) {
                await handleError(
                    interaction,
                    new Error("Invalid channel name"),
                    "VALIDATION",
                    "Channel name can only contain letters, numbers, hyphens, and underscores.",
                );
                return;
            }

            // Check if channel name already exists
            const existingChannel = interaction.guild.channels.cache.find(
                (ch) => ch.name.toLowerCase() === name.toLowerCase(),
            );
            if (existingChannel) {
                await handleError(
                    interaction,
                    new Error("Channel already exists"),
                    "VALIDATION",
                    `A channel with the name "${name}" already exists.`,
                );
                return;
            }

            // Validate category if provided
            if (category) {
                if (category.type !== ChannelType.GuildCategory) {
                    await handleError(
                        interaction,
                        new Error("Invalid category"),
                        "VALIDATION",
                        "The specified category is not valid.",
                    );
                    return;
                }

                // Check bot permissions in the category
                const botMember = interaction.guild.members.me;
                const requiredPermissions = [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ManageChannels,
                ];

                const missingPermissions = requiredPermissions.filter(
                    (perm) => !category.permissionsFor(botMember).has(perm),
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
                        new Error("Missing category permissions"),
                        "PERMISSION",
                        `I need the following permissions in the category: ${permissionNames.join(", ")}`,
                    );
                    return;
                }
            }

            // Create channel options
            const channelOptions = {
                name,
                type: type === "text" ? ChannelType.GuildText : ChannelType.GuildVoice,
                parent: category ? category.id : null,
            };

            // Add topic for text channels
            if (type === "text" && topic) {
                channelOptions.topic = topic;
            }

            try {
                const newChannel = await interaction.guild.channels.create(channelOptions);

                const embed = new EmbedBuilder()
                    .setTitle("Channel Created")
                    .setDescription(`Successfully created ${type} channel ${newChannel}`)
                    .addFields(
                        { name: "Name", value: name, inline: true },
                        {
                            name: "Type",
                            value: type.charAt(0).toUpperCase() + type.slice(1),
                            inline: true,
                        },
                        {
                            name: "Category",
                            value: category ? category.name : "None",
                            inline: true,
                        },
                    )
                    .setColor("Green")
                    .setFooter({
                        text: `Created by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                if (type === "text" && topic) {
                    embed.addFields({ name: "Topic", value: topic });
                }

                await interaction.editReply({ embeds: [embed] });

                // Send welcome message in new text channel
                if (type === "text") {
                    const welcomeEmbed = new EmbedBuilder()
                        .setTitle("Channel Created")
                        .setDescription("This channel has been created and is ready for use!")
                        .addFields({
                            name: "Created By",
                            value: interaction.user.tag,
                        })
                        .setColor("Blue")
                        .setTimestamp();

                    await newChannel.send({ embeds: [welcomeEmbed] });
                }
            } catch (error) {
                await handleError(
                    interaction,
                    error,
                    "DISCORD_API",
                    "Failed to create the channel. Please check my permissions and try again.",
                );
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while creating the channel.",
            );
        }
    },
};
