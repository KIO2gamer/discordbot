const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue, QueueRepeatMode } = require("discord-player");

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Set loop mode for the queue")
        .addStringOption((option) =>
            option
                .setName("mode")
                .setDescription("Loop mode")
                .setRequired(true)
                .addChoices(
                    { name: "Off", value: "off" },
                    { name: "Track", value: "track" },
                    { name: "Queue", value: "queue" },
                ),
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

        const mode = interaction.options.getString("mode");
        let loopMode;
        let modeText;

        switch (mode) {
            case "off":
                loopMode = QueueRepeatMode.OFF;
                modeText = "Off";
                break;
            case "track":
                loopMode = QueueRepeatMode.TRACK;
                modeText = "Track";
                break;
            case "queue":
                loopMode = QueueRepeatMode.QUEUE;
                modeText = "Queue";
                break;
        }

        queue.setRepeatMode(loopMode);

        const embed = new EmbedBuilder()
            .setColor("#00FF00")
            .setDescription(`🔁 Loop mode set to **${modeText}**`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
