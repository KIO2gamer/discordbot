const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useMainPlayer } = require("discord-player");

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song or playlist")
        .addStringOption((option) =>
            option.setName("query").setDescription("Song name or URL").setRequired(true),
        ),

    async execute(interaction) {
        const player = useMainPlayer();

        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: "❌ You need to be in a voice channel to play music!",
                ephemeral: true,
            });
        }

        const query = interaction.options.getString("query");

        await interaction.deferReply();

        try {
            const { track, searchResult } = await player.play(
                interaction.member.voice.channel,
                query,
                {
                    nodeOptions: {
                        metadata: {
                            channel: interaction.channel,
                            client: interaction.guild.members.me,
                            requestedBy: interaction.user,
                        },
                        leaveOnEmptyCooldown: 300000, // 5 minutes
                        leaveOnEmpty: true,
                        leaveOnEnd: false,
                        bufferingTimeout: 0,
                        volume: 50,
                        selfDeaf: true,
                    },
                },
            );

            const requester =
                (track?.requestedBy && typeof track.requestedBy.toString === "function"
                    ? track.requestedBy.toString()
                    : null) || interaction.user.toString();

            const embed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("🎵 Added to Queue")
                .setDescription(`**[${track.title}](${track.url})**`)
                .addFields(
                    { name: "Duration", value: track.duration, inline: true },
                    { name: "Requested by", value: requester, inline: true },
                )
                .setThumbnail(track.thumbnail)
                .setTimestamp();

            if (searchResult.playlist) {
                embed.setTitle("🎵 Playlist Added to Queue");
                embed.setDescription(
                    `**${searchResult.playlist.title}**\n${searchResult.tracks.length} tracks added`,
                );
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: `❌ An error occurred: ${error.message}`,
            });
        }
    },
};
