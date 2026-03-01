const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder,
} = require("discord.js");

const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 10,
    description_full:
        "Shows an embed acknowledging and listing the contributors who helped create the bot, linking their Discord usernames to their IDs.",
    usage: "/credits",
    examples: ["/credits"],

    data: new SlashCommandBuilder()
        .setName("credits")
        .setDescription("Shows an embed of users who helped make this bot."),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Static list of contributors with their contributions
            const contributors = [
                { command: "rickroll", name: "flashxdfx", contribution: "Command Development" },
                { command: "summon", name: "eesmal", contribution: "Command Development" },
                { command: "photo", name: "spheroidon", contribution: "Command Development" },
                { command: "quokka", name: "wickiwacka2", contribution: "Command Development" },
                { command: "boba", name: "pepsi_pro", contribution: "Command Development" },
                { command: "lyricwhiz", name: "vipraz", contribution: "Command Development" },
            ];

            try {
                // Fetch the guild's slash commands
                const guildCommands = await interaction.guild.commands.fetch();

                // Create the base embed
                const embed = new EmbedBuilder()
                    .setTitle("✨ Bot Contributors ✨")
                    .setColor("#0099ff")
                    .setDescription(
                        [
                            "A big thank you to all the amazing contributors who helped make this bot possible!",
                            "",
                            "Each contributor has helped in various ways, from developing commands to improving the bot's functionality.",
                            "Click on the command names to try them out!",
                        ].join("\n"),
                    )
                    .setTimestamp();

                // Group contributors by contribution type
                const groupedContributors = contributors.reduce((acc, contributor) => {
                    const group = acc.find((g) => g.type === contributor.contribution);
                    if (group) {
                        group.members.push(contributor);
                    } else {
                        acc.push({
                            type: contributor.contribution,
                            members: [contributor],
                        });
                    }
                    return acc;
                }, []);

                // Add fields for each contribution group
                groupedContributors.forEach((group) => {
                    const contributorList = group.members
                        .map((contributor) => {
                            const command = guildCommands.find(
                                (cmd) => cmd.name === contributor.command,
                            );
                            const commandLink = command
                                ? `</${contributor.command}:${command.id}>`
                                : contributor.command;
                            return `• **${contributor.name}** - ${commandLink}`;
                        })
                        .join("\n");

                    embed.addFields({
                        name: `${getContributionEmoji(group.type)} ${group.type}`,
                        value: contributorList,
                        inline: false,
                    });
                });

                // Add footer with total count
                embed.setFooter({
                    text: `Total Contributors: ${contributors.length} | Thanks to everyone who helped!`,
                    iconURL: interaction.client.user.displayAvatarURL(),
                });

                // Create buttons for additional actions
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel("Join Support Server")
                        .setStyle(ButtonStyle.Link)
                        .setURL("https://discord.gg/your-support-server"), // Replace with your support server invite
                    new ButtonBuilder()
                        .setLabel("GitHub Repository")
                        .setStyle(ButtonStyle.Link)
                        .setURL("https://github.com/your-repo"), // Replace with your GitHub repo URL
                );

                await interaction.editReply({
                    embeds: [embed],
                    components: [row],
                });
            } catch (error) {
                if (error.code === 50001) {
                    await handleError(
                        interaction,
                        error,
                        "PERMISSION",
                        "I do not have permission to view server commands.",
                    );
                } else {
                    await handleError(
                        interaction,
                        error,
                        "DATA_FETCH",
                        "Failed to fetch command information. Some command links may not work.",
                    );
                }
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while displaying credits information.",
            );
        }
    },
};

// Helper function to get emoji for contribution type
function getContributionEmoji(type) {
    const emojiMap = {
        "Bot Development": "🤖",
        "Command Development": "⌨️",
        "UI Design": "🎨",
        Testing: "🔍",
        Documentation: "📝",
    };
    return emojiMap[type] || "✨";
}
