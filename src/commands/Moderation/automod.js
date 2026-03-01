const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType,
} = require("discord.js");
const AutoModConfig = require("../../database/autoModConfig");

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("automod")
        .setDescription("Configure auto-moderation settings")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((subcommand) =>
            subcommand.setName("enable").setDescription("Enable auto-moderation"),
        )
        .addSubcommand((subcommand) =>
            subcommand.setName("disable").setDescription("Disable auto-moderation"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("setlog")
                .setDescription("Set the log channel for auto-mod actions")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("The channel to send auto-mod logs")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("spam")
                .setDescription("Configure spam detection")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Enable or disable spam detection")
                        .setRequired(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max_messages")
                        .setDescription("Maximum messages in time window (default: 5)")
                        .setMinValue(2)
                        .setMaxValue(20),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("time_window")
                        .setDescription("Time window in seconds (default: 5)")
                        .setMinValue(1)
                        .setMaxValue(60),
                )
                .addStringOption((option) =>
                    option
                        .setName("action")
                        .setDescription("Action to take")
                        .addChoices(
                            { name: "Warn", value: "warn" },
                            { name: "Timeout", value: "timeout" },
                            { name: "Kick", value: "kick" },
                            { name: "Ban", value: "ban" },
                            { name: "Delete", value: "delete" },
                        ),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("mentions")
                .setDescription("Configure mass mention protection")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Enable or disable mass mention protection")
                        .setRequired(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max_mentions")
                        .setDescription("Maximum mentions per message (default: 5)")
                        .setMinValue(1)
                        .setMaxValue(50),
                )
                .addStringOption((option) =>
                    option
                        .setName("action")
                        .setDescription("Action to take")
                        .addChoices(
                            { name: "Warn", value: "warn" },
                            { name: "Timeout", value: "timeout" },
                            { name: "Kick", value: "kick" },
                            { name: "Ban", value: "ban" },
                            { name: "Delete", value: "delete" },
                        ),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("invites")
                .setDescription("Configure Discord invite filtering")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Enable or disable invite filtering")
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("action")
                        .setDescription("Action to take")
                        .addChoices(
                            { name: "Warn", value: "warn" },
                            { name: "Timeout", value: "timeout" },
                            { name: "Kick", value: "kick" },
                            { name: "Ban", value: "ban" },
                            { name: "Delete", value: "delete" },
                        ),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("links")
                .setDescription("Configure link filtering")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Enable or disable link filtering")
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("whitelist")
                        .setDescription(
                            "Comma-separated allowed domains (e.g., youtube.com,twitter.com)",
                        ),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("badwords")
                .setDescription("Configure bad word filter")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Enable or disable bad word filter")
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("words")
                        .setDescription("Comma-separated list of words to filter"),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("caps")
                .setDescription("Configure excessive caps detection")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Enable or disable caps detection")
                        .setRequired(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("percentage")
                        .setDescription("Minimum percentage of caps (default: 70)")
                        .setMinValue(50)
                        .setMaxValue(100),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("emojis")
                .setDescription("Configure emoji spam detection")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Enable or disable emoji spam detection")
                        .setRequired(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max_emojis")
                        .setDescription("Maximum emojis per message (default: 10)")
                        .setMinValue(5)
                        .setMaxValue(50),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("antiraid")
                .setDescription("Configure anti-raid protection")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Enable or disable anti-raid protection")
                        .setRequired(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("join_threshold")
                        .setDescription("Max joins in time window (default: 10)")
                        .setMinValue(5)
                        .setMaxValue(50),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("time_window")
                        .setDescription("Time window in seconds (default: 10)")
                        .setMinValue(5)
                        .setMaxValue(60),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("ignore")
                .setDescription("Ignore a channel or role from auto-moderation")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Channel to ignore")
                        .addChannelTypes(ChannelType.GuildText),
                )
                .addRoleOption((option) => option.setName("role").setDescription("Role to ignore")),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("unignore")
                .setDescription("Remove a channel or role from ignore list")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Channel to unignore")
                        .addChannelTypes(ChannelType.GuildText),
                )
                .addRoleOption((option) =>
                    option.setName("role").setDescription("Role to unignore"),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("status")
                .setDescription("View current auto-moderation configuration"),
        ),

    category: "Moderation",

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Get or create config
        let config = await AutoModConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
            config = new AutoModConfig({ guildId: interaction.guild.id });
            await config.save();
        }

        switch (subcommand) {
            case "enable":
                config.enabled = true;
                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#00FF00")
                            .setTitle("✅ Auto-Moderation Enabled")
                            .setDescription("Auto-moderation has been enabled for this server.")
                            .setFooter({ text: "Use /automod status to view current settings" }),
                    ],
                });

            case "disable":
                config.enabled = false;
                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ Auto-Moderation Disabled")
                            .setDescription("Auto-moderation has been disabled for this server."),
                    ],
                });

            case "setlog": {
                const logChannel = interaction.options.getChannel("channel");
                config.logChannelId = logChannel.id;
                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0099FF")
                            .setTitle("📝 Log Channel Set")
                            .setDescription(`Auto-mod logs will be sent to ${logChannel}`),
                    ],
                });
            }

            case "spam": {
                config.spamDetection.enabled = interaction.options.getBoolean("enabled");

                const maxMessages = interaction.options.getInteger("max_messages");
                if (maxMessages) config.spamDetection.maxMessages = maxMessages;

                const timeWindow = interaction.options.getInteger("time_window");
                if (timeWindow) config.spamDetection.timeWindow = timeWindow * 1000;

                const spamAction = interaction.options.getString("action");
                if (spamAction) config.spamDetection.action = spamAction;

                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0099FF")
                            .setTitle("🚫 Spam Detection Configured")
                            .addFields(
                                {
                                    name: "Enabled",
                                    value: config.spamDetection.enabled ? "Yes" : "No",
                                    inline: true,
                                },
                                {
                                    name: "Max Messages",
                                    value: config.spamDetection.maxMessages.toString(),
                                    inline: true,
                                },
                                {
                                    name: "Time Window",
                                    value: `${config.spamDetection.timeWindow / 1000}s`,
                                    inline: true,
                                },
                                {
                                    name: "Action",
                                    value: config.spamDetection.action,
                                    inline: true,
                                },
                            ),
                    ],
                });
            }

            case "mentions": {
                config.massMention.enabled = interaction.options.getBoolean("enabled");

                const maxMentions = interaction.options.getInteger("max_mentions");
                if (maxMentions) config.massMention.maxMentions = maxMentions;

                const mentionAction = interaction.options.getString("action");
                if (mentionAction) config.massMention.action = mentionAction;

                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0099FF")
                            .setTitle("📢 Mass Mention Protection Configured")
                            .addFields(
                                {
                                    name: "Enabled",
                                    value: config.massMention.enabled ? "Yes" : "No",
                                    inline: true,
                                },
                                {
                                    name: "Max Mentions",
                                    value: config.massMention.maxMentions.toString(),
                                    inline: true,
                                },
                                { name: "Action", value: config.massMention.action, inline: true },
                            ),
                    ],
                });
            }

            case "invites": {
                config.inviteFilter.enabled = interaction.options.getBoolean("enabled");

                const inviteAction = interaction.options.getString("action");
                if (inviteAction) config.inviteFilter.action = inviteAction;

                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0099FF")
                            .setTitle("🔗 Invite Filter Configured")
                            .addFields(
                                {
                                    name: "Enabled",
                                    value: config.inviteFilter.enabled ? "Yes" : "No",
                                    inline: true,
                                },
                                { name: "Action", value: config.inviteFilter.action, inline: true },
                            ),
                    ],
                });
            }

            case "links": {
                config.linkFilter.enabled = interaction.options.getBoolean("enabled");

                const whitelist = interaction.options.getString("whitelist");
                if (whitelist) {
                    config.linkFilter.whitelist = whitelist.split(",").map((s) => s.trim());
                }

                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0099FF")
                            .setTitle("🔗 Link Filter Configured")
                            .addFields(
                                {
                                    name: "Enabled",
                                    value: config.linkFilter.enabled ? "Yes" : "No",
                                    inline: true,
                                },
                                {
                                    name: "Whitelisted Domains",
                                    value:
                                        config.linkFilter.whitelist.length > 0
                                            ? config.linkFilter.whitelist.join(", ")
                                            : "None",
                                },
                            ),
                    ],
                });
            }

            case "badwords": {
                config.wordFilter.enabled = interaction.options.getBoolean("enabled");

                const words = interaction.options.getString("words");
                if (words) {
                    config.wordFilter.words = words.split(",").map((s) => s.trim().toLowerCase());
                }

                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0099FF")
                            .setTitle("🤬 Bad Word Filter Configured")
                            .addFields(
                                {
                                    name: "Enabled",
                                    value: config.wordFilter.enabled ? "Yes" : "No",
                                    inline: true,
                                },
                                {
                                    name: "Filtered Words",
                                    value:
                                        config.wordFilter.words.length > 0
                                            ? `${config.wordFilter.words.length} words`
                                            : "None",
                                },
                            ),
                    ],
                    ephemeral: true,
                });
            }

            case "caps": {
                config.capsFilter.enabled = interaction.options.getBoolean("enabled");

                const percentage = interaction.options.getInteger("percentage");
                if (percentage) config.capsFilter.percentage = percentage;

                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0099FF")
                            .setTitle("🔠 Caps Filter Configured")
                            .addFields(
                                {
                                    name: "Enabled",
                                    value: config.capsFilter.enabled ? "Yes" : "No",
                                    inline: true,
                                },
                                {
                                    name: "Percentage",
                                    value: `${config.capsFilter.percentage}%`,
                                    inline: true,
                                },
                            ),
                    ],
                });
            }

            case "emojis": {
                config.emojiSpam.enabled = interaction.options.getBoolean("enabled");

                const maxEmojis = interaction.options.getInteger("max_emojis");
                if (maxEmojis) config.emojiSpam.maxEmojis = maxEmojis;

                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0099FF")
                            .setTitle("😀 Emoji Spam Filter Configured")
                            .addFields(
                                {
                                    name: "Enabled",
                                    value: config.emojiSpam.enabled ? "Yes" : "No",
                                    inline: true,
                                },
                                {
                                    name: "Max Emojis",
                                    value: config.emojiSpam.maxEmojis.toString(),
                                    inline: true,
                                },
                            ),
                    ],
                });
            }

            case "antiraid": {
                config.antiRaid.enabled = interaction.options.getBoolean("enabled");

                const joinThreshold = interaction.options.getInteger("join_threshold");
                if (joinThreshold) config.antiRaid.joinThreshold = joinThreshold;

                const raidTimeWindow = interaction.options.getInteger("time_window");
                if (raidTimeWindow) config.antiRaid.timeWindow = raidTimeWindow * 1000;

                await config.save();
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#0099FF")
                            .setTitle("🛡️ Anti-Raid Protection Configured")
                            .addFields(
                                {
                                    name: "Enabled",
                                    value: config.antiRaid.enabled ? "Yes" : "No",
                                    inline: true,
                                },
                                {
                                    name: "Join Threshold",
                                    value: config.antiRaid.joinThreshold.toString(),
                                    inline: true,
                                },
                                {
                                    name: "Time Window",
                                    value: `${config.antiRaid.timeWindow / 1000}s`,
                                    inline: true,
                                },
                            ),
                    ],
                });
            }

            case "ignore": {
                const ignoreChannel = interaction.options.getChannel("channel");
                const ignoreRole = interaction.options.getRole("role");

                if (ignoreChannel) {
                    if (!config.ignoredChannels.includes(ignoreChannel.id)) {
                        config.ignoredChannels.push(ignoreChannel.id);
                        await config.save();
                        return interaction.reply(
                            `✅ ${ignoreChannel} will now be ignored by auto-moderation.`,
                        );
                    } else {
                        return interaction.reply(`${ignoreChannel} is already ignored.`);
                    }
                }

                if (ignoreRole) {
                    if (!config.ignoredRoles.includes(ignoreRole.id)) {
                        config.ignoredRoles.push(ignoreRole.id);
                        await config.save();
                        return interaction.reply(
                            `✅ Users with ${ignoreRole} will now bypass auto-moderation.`,
                        );
                    } else {
                        return interaction.reply(`${ignoreRole} is already ignored.`);
                    }
                }

                return interaction.reply("Please specify a channel or role to ignore.");
            }

            case "unignore": {
                const unignoreChannel = interaction.options.getChannel("channel");
                const unignoreRole = interaction.options.getRole("role");

                if (unignoreChannel) {
                    const index = config.ignoredChannels.indexOf(unignoreChannel.id);
                    if (index > -1) {
                        config.ignoredChannels.splice(index, 1);
                        await config.save();
                        return interaction.reply(`✅ ${unignoreChannel} is no longer ignored.`);
                    } else {
                        return interaction.reply(`${unignoreChannel} was not being ignored.`);
                    }
                }

                if (unignoreRole) {
                    const index = config.ignoredRoles.indexOf(unignoreRole.id);
                    if (index > -1) {
                        config.ignoredRoles.splice(index, 1);
                        await config.save();
                        return interaction.reply(`✅ ${unignoreRole} is no longer ignored.`);
                    } else {
                        return interaction.reply(`${unignoreRole} was not being ignored.`);
                    }
                }

                return interaction.reply("Please specify a channel or role to unignore.");
            }

            case "status": {
                const statusEmbed = new EmbedBuilder()
                    .setColor(config.enabled ? "#00FF00" : "#FF0000")
                    .setTitle("🛡️ Auto-Moderation Status")
                    .setDescription(
                        `**Main Status:** ${config.enabled ? "✅ Enabled" : "❌ Disabled"}`,
                    )
                    .addFields(
                        {
                            name: "📝 Log Channel",
                            value: config.logChannelId ? `<#${config.logChannelId}>` : "Not set",
                            inline: false,
                        },
                        {
                            name: "🚫 Spam Detection",
                            value: `${config.spamDetection.enabled ? "✅" : "❌"} | Max: ${config.spamDetection.maxMessages} msgs/${config.spamDetection.timeWindow / 1000}s | Action: ${config.spamDetection.action}`,
                            inline: false,
                        },
                        {
                            name: "📢 Mass Mentions",
                            value: `${config.massMention.enabled ? "✅" : "❌"} | Max: ${config.massMention.maxMentions} | Action: ${config.massMention.action}`,
                            inline: false,
                        },
                        {
                            name: "🔗 Invite Filter",
                            value: `${config.inviteFilter.enabled ? "✅" : "❌"} | Action: ${config.inviteFilter.action}`,
                            inline: true,
                        },
                        {
                            name: "🔗 Link Filter",
                            value: `${config.linkFilter.enabled ? "✅" : "❌"} | Whitelist: ${config.linkFilter.whitelist.length} domains`,
                            inline: true,
                        },
                        {
                            name: "🤬 Bad Words",
                            value: `${config.wordFilter.enabled ? "✅" : "❌"} | ${config.wordFilter.words.length} words`,
                            inline: true,
                        },
                        {
                            name: "🔠 Caps Filter",
                            value: `${config.capsFilter.enabled ? "✅" : "❌"} | ${config.capsFilter.percentage}% threshold`,
                            inline: true,
                        },
                        {
                            name: "😀 Emoji Spam",
                            value: `${config.emojiSpam.enabled ? "✅" : "❌"} | Max: ${config.emojiSpam.maxEmojis}`,
                            inline: true,
                        },
                        {
                            name: "🛡️ Anti-Raid",
                            value: `${config.antiRaid.enabled ? "✅" : "❌"} | ${config.antiRaid.joinThreshold} joins/${config.antiRaid.timeWindow / 1000}s`,
                            inline: true,
                        },
                        {
                            name: "🚫 Ignored Channels",
                            value:
                                config.ignoredChannels.length > 0
                                    ? config.ignoredChannels.map((id) => `<#${id}>`).join(", ")
                                    : "None",
                            inline: false,
                        },
                        {
                            name: "🚫 Ignored Roles",
                            value:
                                config.ignoredRoles.length > 0
                                    ? config.ignoredRoles.map((id) => `<@&${id}>`).join(", ")
                                    : "None",
                            inline: false,
                        },
                    )
                    .setFooter({ text: `Guild ID: ${interaction.guild.id}` })
                    .setTimestamp();

                return interaction.reply({ embeds: [statusEmbed] });
            }
        }
    },
};
