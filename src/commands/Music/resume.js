const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder().setName("resume").setDescription("Resume the paused music"),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);

        if (!queue) {
            return interaction.editReply({
                content: "❌ No music queue found!",
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

        if (!queue.node.isPaused()) {
            return interaction.editReply({
                content: "▶️ The music is already playing!",
            });
        }

        queue.node.resume();

        const embed = new EmbedBuilder()
            .setColor("#00FF00")
            .setDescription("▶️ Resumed the music")
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
