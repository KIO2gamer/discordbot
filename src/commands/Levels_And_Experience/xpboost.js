const {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");
const { LevelSchema } = require("../../database/xp_data");
const Logger = require("../../utils/logger");

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("xpboost")
        .setDescription("Manage XP boost events")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("activate")
                .setDescription("Activate an XP boost for a user or the entire server")
                .addStringOption((option) =>
                    option
                        .setName("target")
                        .setDescription("Who gets the boost")
                        .setRequired(true)
                        .addChoices(
                            { name: "Server-wide", value: "server" },
                            { name: "Specific User", value: "user" },
                        ),
                )
                .addNumberOption((option) =>
                    option
                        .setName("multiplier")
                        .setDescription("XP multiplier (e.g., 2.0 for double XP)")
                        .setMinValue(1.1)
                        .setMaxValue(5.0)
                        .setRequired(true),
                )
                .addNumberOption((option) =>
                    option
                        .setName("duration")
                        .setDescription("Duration in hours")
                        .setMinValue(1)
                        .setMaxValue(168)
                        .setRequired(true),
                )
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user to boost (if target is user)")
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Remove an active XP boost")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription(
                            "The user to remove boost from (leave empty for server-wide)",
                        )
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand.setName("status").setDescription("View active XP boosts in this server"),
        ),

    description_full:
        "Manage XP boost events for your server. Activate double XP weekends, reward specific users, or create special events.",

    usage: "/xpboost activate target:server|user multiplier:2.0 duration:24 [user:@User]\n/xpboost remove [user:@User]\n/xpboost status",
    examples: [
        "/xpboost activate target:server multiplier:2.0 duration:48",
        "/xpboost activate target:user multiplier:1.5 duration:24 user:@Username",
        "/xpboost remove user:@Username",
        "/xpboost status",
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
            switch (subcommand) {
                case "activate": {
                    await handleActivate(interaction);
                    break;
                }

                case "remove": {
                    await handleRemove(interaction);
                    break;
                }

                case "status": {
                    await handleStatus(interaction);
                    break;
                }
            }
        } catch (error) {
            Logger.log("COMMANDS", `Error executing xpboost command: ${error.message}`, "error");
            await interaction.reply({
                content: "There was an error managing XP boosts.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

async function handleActivate(interaction) {
    const target = interaction.options.getString("target");
    const multiplier = interaction.options.getNumber("multiplier");
    const duration = interaction.options.getNumber("duration");
    const user = interaction.options.getUser("user");
    const guildId = interaction.guild.id;

    if (target === "user" && !user) {
        return interaction.reply({
            content: "You must specify a user when activating a user-specific boost.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);

    if (target === "server") {
        // Apply boost to all users in the guild
        const result = await LevelSchema.updateMany(
            { guildId },
            {
                $set: {
                    "xpBoost.multiplier": multiplier,
                    "xpBoost.expiresAt": expiresAt,
                },
            },
        );

        const embed = new EmbedBuilder()
            .setTitle("🚀 Server-Wide XP Boost Activated!")
            .setDescription(
                `Everyone in the server now has a **${multiplier}x** XP multiplier for the next **${duration} hour${duration !== 1 ? "s" : ""}**!`,
            )
            .setColor("#00FF00")
            .addFields(
                { name: "Multiplier", value: `${multiplier}x`, inline: true },
                { name: "Duration", value: `${duration} hours`, inline: true },
                { name: "Affected Users", value: `${result.modifiedCount}`, inline: true },
            )
            .setFooter({ text: `Expires at` })
            .setTimestamp(expiresAt);

        return interaction.reply({ embeds: [embed] });
    } else {
        // Apply boost to specific user
        const userId = user.id;

        await LevelSchema.findOneAndUpdate(
            { userId, guildId },
            {
                $set: {
                    "xpBoost.multiplier": multiplier,
                    "xpBoost.expiresAt": expiresAt,
                },
            },
            { upsert: true },
        );

        const embed = new EmbedBuilder()
            .setTitle("🚀 Personal XP Boost Activated!")
            .setDescription(
                `${user} now has a **${multiplier}x** XP multiplier for the next **${duration} hour${duration !== 1 ? "s" : ""}**!`,
            )
            .setColor("#00FF00")
            .addFields(
                { name: "User", value: `${user}`, inline: true },
                { name: "Multiplier", value: `${multiplier}x`, inline: true },
                { name: "Duration", value: `${duration} hours`, inline: true },
            )
            .setFooter({ text: `Expires at` })
            .setTimestamp(expiresAt);

        return interaction.reply({ embeds: [embed] });
    }
}

async function handleRemove(interaction) {
    const user = interaction.options.getUser("user");
    const guildId = interaction.guild.id;

    if (!user) {
        // Remove server-wide boost
        const result = await LevelSchema.updateMany(
            { guildId },
            {
                $set: {
                    "xpBoost.multiplier": 1.0,
                    "xpBoost.expiresAt": null,
                },
            },
        );

        return interaction.reply(
            `✅ Server-wide XP boost removed. (Affected ${result.modifiedCount} users)`,
        );
    } else {
        // Remove boost from specific user
        await LevelSchema.findOneAndUpdate(
            { userId: user.id, guildId },
            {
                $set: {
                    "xpBoost.multiplier": 1.0,
                    "xpBoost.expiresAt": null,
                },
            },
        );

        return interaction.reply(`✅ XP boost removed from ${user}.`);
    }
}

async function handleStatus(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guild.id;

    // Find all users with active boosts
    const boostedUsers = await LevelSchema.find({
        guildId,
        "xpBoost.multiplier": { $gt: 1.0 },
        "xpBoost.expiresAt": { $gt: new Date() },
    })
        .limit(20)
        .lean();

    if (!boostedUsers.length) {
        return interaction.followUp("No active XP boosts in this server.");
    }

    const embed = new EmbedBuilder()
        .setTitle("🚀 Active XP Boosts")
        .setDescription(
            `Found ${boostedUsers.length} active boost${boostedUsers.length !== 1 ? "s" : ""}`,
        )
        .setColor("#00FF00")
        .setTimestamp();

    // Group by multiplier and expiry to detect server-wide boosts
    const boostGroups = new Map();

    for (const userData of boostedUsers) {
        const key = `${userData.xpBoost.multiplier}-${userData.xpBoost.expiresAt.getTime()}`;
        if (!boostGroups.has(key)) {
            boostGroups.set(key, {
                multiplier: userData.xpBoost.multiplier,
                expiresAt: userData.xpBoost.expiresAt,
                users: [],
            });
        }
        boostGroups.get(key).users.push(userData.userId);
    }

    // Display boost information
    for (const [, group] of boostGroups) {
        const timeRemaining = group.expiresAt - new Date();
        const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));

        if (group.users.length > 10) {
            // Likely server-wide
            embed.addFields({
                name: `Server-Wide Boost: ${group.multiplier}x`,
                value: `**${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}** remaining\nExpires: <t:${Math.floor(group.expiresAt.getTime() / 1000)}:R>\nAffecting ${group.users.length} users`,
            });
        } else {
            // Individual boosts
            const userMentions = await Promise.all(
                group.users.slice(0, 5).map(async (userId) => {
                    try {
                        const member = await interaction.guild.members.fetch(userId);
                        return member.toString();
                    } catch {
                        return `Unknown User`;
                    }
                }),
            );

            embed.addFields({
                name: `Personal Boost: ${group.multiplier}x`,
                value: `**${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}** remaining\nExpires: <t:${Math.floor(group.expiresAt.getTime() / 1000)}:R>\nUsers: ${userMentions.join(", ")}${group.users.length > 5 ? ` +${group.users.length - 5} more` : ""}`,
            });
        }
    }

    return interaction.followUp({ embeds: [embed] });
}
