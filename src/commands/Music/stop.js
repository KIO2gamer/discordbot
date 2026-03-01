const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop the music and clear the queue"),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.editReply({
                content: "❌ No music is currently playing!",
            });
        }

        if (!interaction.member.voice.channel) {
            return interaction.editReply({
                content: "❌ You need to be in a voice channel!",
            });
        }

        if (
            interaction.guild.members.me.voice.channel &&
            interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId
        ) {
            return interaction.editReply({
                content: "❌ You need to be in the same voice channel as the bot!",
            });
        }

        queue.delete();

        const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription("⏹️ Stopped the music and cleared the queue")
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
