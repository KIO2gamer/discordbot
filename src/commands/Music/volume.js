const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Adjust the music volume")
        .addIntegerOption((option) =>
            option
                .setName("level")
                .setDescription("Volume level (0-100)")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100),
        ),

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

        const volume = interaction.options.getInteger("level");
        queue.node.setVolume(volume);

        const embed = new EmbedBuilder()
            .setColor("#00FF00")
            .setDescription(`🔊 Volume set to **${volume}%**`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
