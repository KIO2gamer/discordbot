const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const Logger = require("../../utils/logger");
const { GuildSettingsSchema } = require("../../database/GuildSettingsSchema");

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("levelsettings")
        .setDescription("Configure the leveling system for this server")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("toggle")
                .setDescription("Enable or disable the leveling system")
                .addBooleanOption((option) =>
                    option
                        .setName("enabled")
                        .setDescription("Whether leveling should be enabled")
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("xprate")
                .setDescription("Set XP gain rate multiplier")
                .addNumberOption((option) =>
                    option
                        .setName("multiplier")
                        .setDescription("XP multiplier (1.0 is default)")
                        .setMinValue(0.1)
                        .setMaxValue(5.0)
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("levelupmessage")
                .setDescription("Configure level-up notifications")
                .addStringOption((option) =>
                    option
                        .setName("type")
                        .setDescription("How level up messages should be sent")
                        .setRequired(true)
                        .addChoices(
                            { name: "Public - In the channel", value: "public" },
                            { name: "Private - DM to user", value: "dm" },
                            { name: "Disabled - No notifications", value: "disabled" },
                        ),
                )
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Channel for level-up announcements (if public)")
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("rolerewards")
                .setDescription("Set up role rewards for reaching specific levels")
                .addNumberOption((option) =>
                    option
                        .setName("level")
                        .setDescription("Level to assign the role at")
                        .setMinValue(1)
                        .setRequired(true),
                )
                .addRoleOption((option) =>
                    option
                        .setName("role")
                        .setDescription("Role to assign (none to remove)")
                        .setRequired(false),
                ),
        ),

    description_full:
        "Configure all aspects of the leveling system including enabling/disabling, XP rate, notifications, and role rewards.",

    usage: "/levelsettings toggle enabled:true|false\n/levelsettings xprate multiplier:1.5\n/levelsettings levelupmessage type:public|dm|disabled [channel:#channel]\n/levelsettings rolerewards level:10 [role:@role]",
    examples: [
        "/levelsettings toggle enabled:true",
        "/levelsettings xprate multiplier:2.0",
        "/levelsettings levelupmessage type:public channel:#level-ups",
        "/levelsettings rolerewards level:5 role:@Level 5",
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
                    leveling: {
                        enabled: true,
                        xpRate: 1.0,
                        levelUpMessageType: "public",
                        levelUpChannelId: null,
                        roleRewards: [],
                    },
                });
            }

            // Ensure leveling settings object exists
            if (!settings.leveling) {
                settings.leveling = {
                    enabled: true,
                    xpRate: 1.0,
                    levelUpMessageType: "public",
                    levelUpChannelId: null,
                    roleRewards: [],
                };
            }

            switch (subcommand) {
                case "toggle": {
                    const enabled = interaction.options.getBoolean("enabled");
                    settings.leveling.enabled = enabled;

                    await settings.save();
                    return interaction.reply(
                        `✅ Leveling system has been ${enabled ? "enabled" : "disabled"} for this server.`,
                    );
                }

                case "xprate": {
                    const multiplier = interaction.options.getNumber("multiplier");
                    settings.leveling.xpRate = multiplier;

                    await settings.save();
                    return interaction.reply(
                        `✅ XP rate multiplier has been set to **${multiplier}x**.`,
                    );
                }

                case "levelupmessage": {
                    const messageType = interaction.options.getString("type");
                    const channel = interaction.options.getChannel("channel");

                    settings.leveling.levelUpMessageType = messageType;
                    settings.leveling.levelUpChannelId =
                        messageType === "public" && channel ? channel.id : null;

                    await settings.save();

                    let response = `✅ Level-up notifications have been set to **${messageType}**`;
                    if (messageType === "public" && channel) {
                        response += ` in ${channel}`;
                    } else if (messageType === "public") {
                        response += " (will appear in the channel where user is active)";
                    }

                    return interaction.reply(response);
                }

                case "rolerewards": {
                    const level = interaction.options.getNumber("level");
                    const role = interaction.options.getRole("role");

                    // Initialize role rewards array if it doesn't exist
                    if (!settings.leveling.roleRewards) {
                        settings.leveling.roleRewards = [];
                    }

                    // Find existing role reward for this level
                    const existingIndex = settings.leveling.roleRewards.findIndex(
                        (reward) => reward.level === level,
                    );

                    if (!role) {
                        // If no role provided, remove the reward for this level
                        if (existingIndex !== -1) {
                            settings.leveling.roleRewards.splice(existingIndex, 1);
                            await settings.save();
                            return interaction.reply(`✅ Removed role reward for level ${level}.`);
                        } else {
                            return interaction.reply(`No role reward was set for level ${level}.`);
                        }
                    } else {
                        // Check if the bot can manage this role
                        if (role.position >= interaction.guild.members.me.roles.highest.position) {
                            return interaction.reply({
                                content:
                                    "I cannot assign this role as it's positioned higher than my highest role.",
                                flags: MessageFlags.Ephemeral,
                            });
                        }

                        // Add or update the role reward
                        const roleReward = { level, roleId: role.id };

                        if (existingIndex !== -1) {
                            settings.leveling.roleRewards[existingIndex] = roleReward;
                        } else {
                            settings.leveling.roleRewards.push(roleReward);
                        }

                        // Sort rewards by level
                        settings.leveling.roleRewards.sort((a, b) => a.level - b.level);

                        await settings.save();
                        return interaction.reply(
                            `✅ Set ${role} as the reward for reaching level ${level}.`,
                        );
                    }
                }
            }
        } catch (error) {
            Logger.log(
                "COMMANDS",
                `Error executing levelsettings command: ${error.message}`,
                "error",
            );
            return interaction.reply({
                content: "There was an error saving the level settings.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
