const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  description_full:
    "Fetches the current answers/votes for a poll from a specific message.",
  usage: '/fetch_poll_answers message_id:"message ID" channel:#channel',
  examples: [
    '/fetch_poll_answers message_id:"123456789012345678" channel:#polls',
  ],
  data: new SlashCommandBuilder()
    .setName("fetch_poll_answers")
    .setDescription("Fetches the answers of the poll.")
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

			// Prepare the header
			let reply = `**Question:** \`${message.poll.question.text}\`\n\n\`\`\`\nS.No.  Options           Votes\n`;

			// Add each answer in a formatted way
			message.poll.answers.forEach((answer, index) => {
				const numberText = `${index}`.padEnd(6);
				const optionText = `${answer.text}`.padEnd(17);
				const voteText = `${answer.voteCount}`.padStart(5);
				reply += `${numberText} ${optionText} ${voteText}\n`;
			});

			// Close the code block
			reply += '```';

			await interaction.reply(reply);
		} catch (error) {
			console.error(error);
			await interaction.reply('An error occurred while fetching the poll answers.');
		}
	},
};
