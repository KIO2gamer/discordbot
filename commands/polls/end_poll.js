const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  description_full:
    "Ends a poll from a specific message, preventing further voting.",
  usage: '/end_poll message_id:"message ID" channel:#channel',
  examples: ['/end_poll message_id:"123456789012345678" channel:#general'],
  data: new SlashCommandBuilder()
    .setName("end_poll")
    .setDescription("Ends a poll")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("Message ID of the poll")
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel where the poll is created")
        .setRequired(true),
    ),

  async execute(interaction) {
    try {
      const messageId = interaction.options.getString("message_id");
      const channel = interaction.options.getChannel("channel");

			// Fetch the message
			const message = await channel.messages.fetch(messageId);
			if (!message || !message.poll) {
				return interaction.reply('Poll not found or message does not contain a poll.');
			}

      // End the poll
      message.poll.end();
      await interaction.reply("Poll ended successfully!");
    } catch (error) {
      console.error(error);
      await interaction.reply(
        "An error occurred while trying to end the poll.",
      );
    }
  },
};
