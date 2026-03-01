const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");

const Logger = require("../../utils/logger");
const { LevelSchema } = require("../../database/xp_data");

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("level")
        .setDescription("View your or another user's level and XP")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to check (defaults to yourself)")
                .setRequired(false),
        ),

    description_full:
        "Shows detailed information about your XP progress or another user's. Displays current level, XP, progress to next level, and rank on the server.",

    usage: "/level [user]",
    examples: ["/level", "/level user:@Username"],

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser("user") || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.followUp({
                content: "That user is not in this server.",
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            // Get user level data from database
            const levelData = (await LevelSchema.findOne({
                userId: member.id,
                guildId: interaction.guild.id,
            })) || {
                level: 0,
                xp: 0,
                totalXp: 0,
                dailyStreak: 0,
                messageCount: 0,
                voiceTime: 0,
                rank: "N/A",
            };

            // Calculate XP needed for next level
            const xpForNextLevel = calculateXpForLevel(levelData.level + 1);
            const currentLevelXp = calculateXpForLevel(levelData.level);
            const xpProgress = Math.max(0, levelData.xp - currentLevelXp);
            const xpNeeded = Math.max(1, xpForNextLevel - currentLevelXp);
            const progressPercentage = Math.floor((xpProgress / xpNeeded) * 100);

            // Get user rank
            const rank = await getUserRank(member.id, interaction.guild.id);

            // Create progress bar
            const progressBar = createProgressBar(progressPercentage);

            // Calculate active boost
            let boostInfo = "";
            if (
                levelData.xpBoost &&
                levelData.xpBoost.multiplier > 1.0 &&
                levelData.xpBoost.expiresAt &&
                new Date() < levelData.xpBoost.expiresAt
            ) {
                const hoursRemaining = Math.ceil(
                    (levelData.xpBoost.expiresAt - new Date()) / (1000 * 60 * 60),
                );
                boostInfo = `\n🚀 Active XP Boost: **${levelData.xpBoost.multiplier}x** (${hoursRemaining}h remaining)`;
            }

            const embed = new EmbedBuilder()
                .setTitle(`${member.user.username}'s Level`)
                .setDescription(`XP progress for ${member}${boostInfo}`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setColor(member.displayHexColor || "#5865F2")
                .addFields(
                    { name: "Level", value: `${levelData.level}`, inline: true },
                    { name: "Rank", value: `#${rank}`, inline: true },
                    {
                        name: "Total XP",
                        value: `${levelData.totalXp.toLocaleString()}`,
                        inline: true,
                    },
                    {
                        name: "Progress",
                        value: `${progressBar}\n${xpProgress.toLocaleString()}/${xpNeeded.toLocaleString()} XP (${progressPercentage}%)`,
                    },
                    {
                        name: "🔥 Daily Streak",
                        value: `${levelData.dailyStreak || 0} day${levelData.dailyStreak !== 1 ? "s" : ""}`,
                        inline: true,
                    },
                    {
                        name: "💬 Messages",
                        value: `${(levelData.messageCount || 0).toLocaleString()}`,
                        inline: true,
                    },
                    {
                        name: "🎤 Voice Time",
                        value: `${Math.floor((levelData.voiceTime || 0) / 60)}h ${(levelData.voiceTime || 0) % 60}m`,
                        inline: true,
                    },
                )
                .setFooter({
                    text: `${getRandomMotivationalPhrase()}`,
                })
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
        } catch (error) {
            Logger.log("COMMANDS", `Error executing level command: ${error.message}`, "error");
            await interaction.followUp({
                content: "There was an error fetching level information.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

// Helper functions
function calculateXpForLevel(level) {
    // Base XP for level 1 is 100
    // Each level requires 50 more XP than the previous level
    // Formula: Total XP = 100*level + 50*(1+2+...+(level-1))
    // = 100*level + 50*level*(level-1)/2
    if (level <= 0) return 0;
    return 100 * level + (50 * level * (level - 1)) / 2;
}

async function getUserRank(userId, guildId) {
    const users = await LevelSchema.find({ guildId }).sort({ totalXp: -1 }).lean();
    const userIndex = users.findIndex((user) => user.userId === userId);
    return userIndex === -1 ? "N/A" : userIndex + 1;
}

function createProgressBar(percentage) {
    const barLength = 15;
    const filledBars = Math.floor((percentage / 100) * barLength);
    const emptyBars = barLength - filledBars;

    return `[${"■".repeat(filledBars)}${"□".repeat(emptyBars)}]`;
}

function getRandomMotivationalPhrase() {
    const phrases = [
        "Keep chatting to gain more XP!",
        "Stay active to level up faster!",
        "Every message counts toward your next level.",
        "Climbing the ranks? Keep it up!",
        "Participation is the key to leveling up!",
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
}
