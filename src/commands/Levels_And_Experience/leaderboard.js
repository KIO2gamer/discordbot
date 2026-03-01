const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");

const Logger = require("../../utils/logger");
const { LevelSchema } = require("../../database/xp_data");

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the server XP leaderboard")
        .addNumberOption((option) =>
            option
                .setName("page")
                .setDescription("Page number to view")
                .setMinValue(1)
                .setRequired(false),
        ),

    description_full:
        "Shows the server's XP leaderboard with the top members ranked by experience points. View different pages to see more users.",

    usage: "/leaderboard [page]",
    examples: ["/leaderboard", "/leaderboard page:2"],

    async execute(interaction) {
        await interaction.deferReply();

        const page = interaction.options.getNumber("page") || 1;
        const pageSize = 10;

        try {
            const totalUsers = await LevelSchema.countDocuments({ guildId: interaction.guild.id });
            const totalPages = Math.ceil(totalUsers / pageSize) || 1;

            if (page > totalPages) {
                return interaction.followUp({
                    content: `Invalid page. There are only ${totalPages} pages available.`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            const leaderboard = await LevelSchema.find({ guildId: interaction.guild.id })
                .sort({ totalXp: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean();

            if (!leaderboard.length) {
                return interaction.followUp("No one has earned XP in this server yet!");
            }

            // Fetch users to get their current usernames
            const userPromises = leaderboard.map((entry, index) =>
                interaction.guild.members
                    .fetch(entry.userId)
                    .then((member) => {
                        const position = (page - 1) * pageSize + index + 1;
                        return `${getPositionEmoji(position)} **${position}.** ${member.user.username} - Level ${entry.level} (${entry.totalXp.toLocaleString()} XP)`;
                    })
                    .catch(() => {
                        const position = (page - 1) * pageSize + index + 1;
                        return `${getPositionEmoji(position)} **${position}.** Unknown User - Level ${entry.level} (${entry.totalXp.toLocaleString()} XP)`;
                    }),
            );

            const leaderboardEntries = await Promise.all(userPromises);

            const embed = new EmbedBuilder()
                .setTitle(`🏆 XP Leaderboard - ${interaction.guild.name}`)
                .setDescription(leaderboardEntries.join("\n"))
                .setColor("#FFD700")
                .setFooter({
                    text: `Page ${page}/${totalPages} • ${totalUsers} total members ranked`,
                })
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
        } catch (error) {
            Logger.log(
                "COMMANDS",
                `Error executing leaderboard command: ${error.message}`,
                "error",
            );
            await interaction.followUp({
                content: "There was an error fetching the leaderboard.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

function getPositionEmoji(position) {
    switch (position) {
        case 1:
            return "🥇";
        case 2:
            return "🥈";
        case 3:
            return "🥉";
        default:
            return "🏅";
    }
}
