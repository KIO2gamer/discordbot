const {
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");

const Logger = require("../../utils/logger");

const { GuildSettingsSchema } = require("../../database/GuildSettingsSchema");

module.exports = {
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName("welcomesettings")
        .setDescription("Configure welcome messages for new members")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("toggle")
                .setDescription("Enable or disable welcome messages")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Whether welcome messages should be enabled")
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("channel")
                .setDescription("Set the channel for welcome messages")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("The channel to send welcome messages in")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("message")
                .setDescription("Set the welcome message content")
                .addStringOption((option) =>
                    option
                        .setName("content")
                        .setDescription(
                            "The welcome message (use {user} and {server} as placeholders)",
                        )
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("dm")
                .setDescription("Configure direct message welcome settings")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Whether to send DMs to new members")
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("message")
                        .setDescription(
                            "The DM welcome message (use {user} and {server} as placeholders)",
                        )
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("preview")
                .setDescription("Preview the current welcome message configuration"),
        ),

    description_full:
        "Configure welcome messages for new members joining your server. Set a custom welcome channel, message format, and optional direct message settings.",

    usage: '/welcomesettings toggle enabled:true|false\n/welcomesettings channel channel:#welcome\n/welcomesettings message content:"Welcome {user} to {server}!"\n/welcomesettings dm enabled:true message:"Thanks for joining!"',
    examples: [
        "/welcomesettings toggle enabled:true",
        "/welcomesettings channel channel:#welcome",
        '/welcomesettings message content:"Hey {user}, welcome to {server}!"',
        '/welcomesettings dm enabled:true message:"Thanks for joining {server}!"',
        "/welcomesettings preview",
    ],

    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: "You need the **Manage Server** permission to use this command.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            let settings = await GuildSettingsSchema.findOne({ guildId: interaction.guild.id });

            if (!settings) {
                settings = new GuildSettingsSchema({
                    guildId: interaction.guild.id,
                    welcome: {
                        enabled: false,
                        channelId: null,
                        message: "Welcome {user} to {server}!",
                        dmEnabled: false,
                        dmMessage: "Welcome to {server}! Please read our rules.",
                    },
                });
            }

            // Ensure welcome settings object exists
            if (!settings.welcome) {
                settings.welcome = {
                    enabled: false,
                    channelId: null,
                    message: "Welcome {user} to {server}!",
                    dmEnabled: false,
                    dmMessage: "Welcome to {server}! Please read our rules.",
                };
            }

            switch (subcommand) {
                case "toggle": {
                    const enabled = interaction.options.getBoolean("enabled");
                    settings.welcome.enabled = enabled;

                    await settings.save();
                    return interaction.reply({
                        content: `✅ Welcome messages have been ${enabled ? "enabled" : "disabled"} for this server.`,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                case "channel": {
                    const channel = interaction.options.getChannel("channel");

                    // Ensure bot has permissions to send messages in this channel
                    const permissions = channel.permissionsFor(interaction.guild.members.me);
                    if (!permissions.has("SendMessages") || !permissions.has("ViewChannel")) {
                        return interaction.reply({
                            content: "I don't have permission to send messages in that channel.",
                            flags: MessageFlags.Ephemeral,
                        });
                    }

                    settings.welcome.channelId = channel.id;

                    await settings.save();
                    return interaction.reply({
                        content: `✅ Welcome messages will be sent to ${channel}.`,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                case "message": {
                    const content = interaction.options.getString("content");
                    settings.welcome.message = content;

                    await settings.save();
                    return interaction.reply({
                        content: `✅ Welcome message has been set to:\n> ${content}`,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                case "dm": {
                    const enabled = interaction.options.getBoolean("enabled");
                    const message = interaction.options.getString("message");

                    settings.welcome.dmEnabled = enabled;
                    if (message && enabled) {
                        settings.welcome.dmMessage = message;
                    }

                    await settings.save();

                    let response = `✅ Welcome direct messages have been ${enabled ? "enabled" : "disabled"}.`;
                    if (enabled && message) {
                        response += `\n> Message: ${message}`;
                    }

                    return interaction.reply({
                        content: response,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                case "preview": {
                    const { welcome } = settings;

                    // Create embed for preview
                    const embed = new EmbedBuilder()
                        .setTitle("Welcome Message Configuration")
                        .setColor("#3498db")
                        .addFields([
                            {
                                name: "Status",
                                value: welcome.enabled ? "✅ Enabled" : "❌ Disabled",
                                inline: true,
                            },
                            {
                                name: "Channel",
                                value: welcome.channelId ? `<#${welcome.channelId}>` : "Not set",
                                inline: true,
                            },
                            {
                                name: "Direct Messages",
                                value: welcome.dmEnabled ? "✅ Enabled" : "❌ Disabled",
                                inline: true,
                            },
                        ])
                        .setTimestamp();

                    // Format welcome message with user and server placeholders
                    const formattedMessage = welcome.message
                        .replace(/{user}/g, `@${interaction.user.username}`)
                        .replace(/{server}/g, interaction.guild.name);

                    embed.addFields([
                        {
                            name: "Welcome Message",
                            value: formattedMessage || "Not set",
                        },
                    ]);

                    if (welcome.dmEnabled) {
                        const formattedDM = welcome.dmMessage
                            .replace(/{user}/g, `@${interaction.user.username}`)
                            .replace(/{server}/g, interaction.guild.name);

                        embed.addFields([
                            {
                                name: "DM Welcome Message",
                                value: formattedDM || "Not set",
                            },
                        ]);
                    }

                    return interaction.reply({
                        embeds: [embed],
                        flags: MessageFlags.Ephemeral,
                    });
                }
            }
        } catch (error) {
            Logger.log(
                "COMMANDS",
                `Error executing welcomesettings command: ${error.message}`,
                "error",
            );
            return interaction.reply({
                content: "There was an error saving the welcome settings.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
