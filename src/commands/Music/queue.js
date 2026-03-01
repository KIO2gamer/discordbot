const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder().setName("queue").setDescription("Show the current music queue"),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.editReply({
                content: "❌ No music is currently playing!",
            });
        }

        try {
            const currentTrack = queue.currentTrack;
            const tracks = queue.tracks.toArray();
            const requester =
                (currentTrack?.requestedBy &&
                typeof currentTrack.requestedBy.toString === "function"
                    ? currentTrack.requestedBy.toString()
                    : null) ||
                (queue.metadata?.requestedBy &&
                typeof queue.metadata.requestedBy.toString === "function"
                    ? queue.metadata.requestedBy.toString()
                    : null) ||
                interaction.user.toString();

            const embed = new EmbedBuilder()
                .setColor("#00BFFF")
                .setTitle("🎵 Music Queue")
                .setThumbnail(currentTrack.thumbnail)
                .setTimestamp();

            // Current track
            embed.addFields({
                name: "Now Playing",
                value: `**[${currentTrack.title}](${currentTrack.url})**\nRequested by: ${requester}\nDuration: ${currentTrack.duration || "Unknown"}`,
            });

            // Queue
            if (tracks.length > 0) {
                const queueList = tracks
                    .slice(0, 10)
                    .map((track, index) => `**${index + 1}.** [${track.title}](${track.url})`)
                    .join("\n");

                embed.addFields({
                    name: `Up Next (${tracks.length} tracks)`,
                    value:
                        queueList +
                        (tracks.length > 10 ? `\n*...and ${tracks.length - 10} more*` : ""),
                });
            } else {
                embed.addFields({ name: "Up Next", value: "No tracks in queue" });
            }

            // Queue info
            embed.setFooter({
                text: `Loop: ${queue.repeatMode === 0 ? "Off" : queue.repeatMode === 1 ? "Track" : "Queue"} | Volume: ${queue.node.volume}%`,
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: `❌ An error occurred: ${error.message}`,
            });
        }
    },
};
