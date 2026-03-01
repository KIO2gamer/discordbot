const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");
const { LevelSchema } = require("../../database/xp_data");
const Logger = require("../../utils/logger");

// Daily reward settings
const BASE_DAILY_XP = 50;
const STREAK_BONUS_XP = 25; // Additional XP per day of streak
const MAX_STREAK_BONUS = 250; // Cap at 10 days worth of bonus

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Claim your daily XP bonus and maintain your streak!"),

    description_full:
        "Claim your daily XP reward! Come back every day to build your streak and earn bonus XP. Higher streaks mean bigger rewards.",

    usage: "/daily",
    examples: ["/daily"],

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        try {
            // Get or create user level data
            let levelData = await LevelSchema.findOne({ userId, guildId });

            if (!levelData) {
                levelData = new LevelSchema({ userId, guildId });
            }

            const now = new Date();
            const lastClaim = levelData.lastDailyClaimAt
                ? new Date(levelData.lastDailyClaimAt)
                : null;

            // Check if user can claim daily reward
            if (lastClaim) {
                const timeSinceLastClaim = now - lastClaim;
                const hoursSinceLastClaim = timeSinceLastClaim / (1000 * 60 * 60);

                // Must wait 20 hours between claims
                if (hoursSinceLastClaim < 20) {
                    const hoursRemaining = Math.ceil(20 - hoursSinceLastClaim);
                    const minutesRemaining = Math.ceil((20 - hoursSinceLastClaim) * 60);

                    return interaction.followUp({
                        content: `⏰ You've already claimed your daily reward! Come back in **${hoursRemaining > 1 ? `${hoursRemaining} hours` : `${minutesRemaining} minutes`}**.`,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                // Check if streak should continue (must claim within 48 hours)
                if (hoursSinceLastClaim < 48) {
                    levelData.dailyStreak += 1;
                } else {
                    // Streak broken
                    levelData.dailyStreak = 1;
                }
            } else {
                // First time claiming
                levelData.dailyStreak = 1;
            }

            // Calculate reward
            const streakBonus = Math.min(
                (levelData.dailyStreak - 1) * STREAK_BONUS_XP,
                MAX_STREAK_BONUS,
            );
            const totalXP = BASE_DAILY_XP + streakBonus;

            // Award XP
            levelData.xp += totalXP;
            levelData.totalXp += totalXP;
            levelData.lastDailyClaimAt = now;
            levelData.totalDailyBonuses += 1;

            // Check for level up
            let leveledUp = false;
            while (levelData.xp >= calculateXpForNextLevel(levelData.level)) {
                levelData.level++;
                leveledUp = true;
            }

            await levelData.save();

            // Create response embed
            const embed = new EmbedBuilder()
                .setTitle("🎁 Daily Reward Claimed!")
                .setDescription(
                    `${interaction.user} has claimed their daily XP bonus!\n\n${leveledUp ? `🎉 **Level Up!** You reached level **${levelData.level}**!\n\n` : ""}`,
                )
                .setColor("#FFD700")
                .addFields(
                    { name: "Base Reward", value: `${BASE_DAILY_XP} XP`, inline: true },
                    { name: "Streak Bonus", value: `${streakBonus} XP`, inline: true },
                    { name: "Total Earned", value: `**${totalXP} XP**`, inline: true },
                    {
                        name: "🔥 Current Streak",
                        value: `**${levelData.dailyStreak} day${levelData.dailyStreak !== 1 ? "s" : ""}**`,
                        inline: true,
                    },
                    {
                        name: "📊 New Level",
                        value: `Level ${levelData.level}`,
                        inline: true,
                    },
                    {
                        name: "💎 Total XP",
                        value: `${levelData.totalXp.toLocaleString()}`,
                        inline: true,
                    },
                )
                .setFooter({
                    text: `Come back tomorrow to continue your streak! • Total daily bonuses: ${levelData.totalDailyBonuses}`,
                })
                .setTimestamp();

            // Add streak milestone messages
            if (levelData.dailyStreak === 7) {
                embed.addFields({
                    name: "🏆 Achievement Unlocked!",
                    value: "**7-Day Streak!** Keep it up!",
                });
            } else if (levelData.dailyStreak === 30) {
                embed.addFields({
                    name: "🏆 Achievement Unlocked!",
                    value: "**30-Day Streak!** You're dedicated!",
                });
            } else if (levelData.dailyStreak === 100) {
                embed.addFields({
                    name: "🏆 Achievement Unlocked!",
                    value: "**100-Day Streak!** Legendary commitment!",
                });
            }

            // Show next streak bonus
            if (levelData.dailyStreak < 10) {
                const nextStreakBonus = levelData.dailyStreak * STREAK_BONUS_XP;
                embed.addFields({
                    name: "📈 Next Streak Bonus",
                    value: `Claim tomorrow for **${BASE_DAILY_XP + nextStreakBonus} XP** total (${levelData.dailyStreak + 1} day streak)`,
                });
            } else {
                embed.addFields({
                    name: "⭐ Maximum Streak Bonus",
                    value: "You've reached the max streak bonus! Keep claiming to maintain it.",
                });
            }

            await interaction.followUp({ embeds: [embed] });
        } catch (error) {
            Logger.log("COMMANDS", `Error executing daily command: ${error.message}`, "error");
            await interaction.followUp({
                content: "There was an error claiming your daily reward.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

function calculateXpForNextLevel(currentLevel) {
    return 100 + currentLevel * 50;
}
