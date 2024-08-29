const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	description_full: 'Fetches the current answers/votes for a poll from a specific message.',
	usage: '/fetch_poll_answers message_id:"message ID" channel:#channel',
	examples: ['/fetch_poll_answers message_id:"123456789012345678" channel:#polls'],
	data: new SlashCommandBuilder()
		.setName('fetch_poll_answers')
		.setDescription('Fetches the answers of the poll.')
		.addStringOption(option =>
			option.setName('message_id').setDescription('Message ID of the poll').setRequired(true)
		)
		.addChannelOption(option =>
			option
				.setName('channel')
				.setDescription('Channel where the poll is created')
				.setRequired(true)
		),

	async execute(interaction) {
		try {
			const messageId = interaction.options.getString('message_id');
			const channel = interaction.options.getChannel('channel');

			const message = await channel.messages.fetch(messageId);
			if (!message.poll) {
				return interaction.reply({
					content: 'This message does not contain a valid poll.',
					ephemeral: true, // Only the user can see this
				});
			}

			const totalVotes = message.poll.answers.reduce(
				(sum, answer) => sum + answer.voteCount,
				0
			); 
			
			// Create an Embed for better presentation
			const pollEmbed = new EmbedBuilder()
				.setTitle(`Poll Results: ${message.poll.question.text}`)
				.setColor('#0099ff')
				.setTimestamp(message.createdAt);

			message.poll.answers.forEach(answer => {
				const percentage = totalVotes > 0 ? (answer.voteCount / totalVotes) * 100 : 0;
				// Dynamically calculate bar length (adjust max characters as needed)
				const barLength = Math.round((percentage / 100) * 20); // 20 character bar
				const bar = '█'.repeat(barLength).padEnd(20, ' ');

				pollEmbed.addFields({
					name: answer.text,
					value: `\`${answer.voteCount} votes\` (${percentage.toFixed(1)}%) ${bar}`,
					inline: false, // Display each option on a new line
				});
			});

			pollEmbed.setFooter({
				text: `Total Votes: ${totalVotes}`,
			});

			await interaction.reply({ embeds: [pollEmbed] });
		} catch (error) {
			console.error('Error fetching poll answers:', error);
			await interaction.reply({
				content:
					'An error occurred while fetching the poll answers. Please check the message ID and channel.',
				ephemeral: true,
			});
		}
	},
};
