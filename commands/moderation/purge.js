const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

// Rate limiting (adjust as needed)
const MAX_PURGE_PER_REQUEST = 100; // Max messages per bulkDelete
const PURGE_COOLDOWN_MS = 5000; // Cooldown in milliseconds

module.exports = {
	description_full: 'Prunes (deletes) messages from the specified user within the last 14 days.',
	usage: '/purge user:@user amount:number',
	examples: ['/purge user:@user123 amount:10', '/purge user:@user456 amount:50'],
	data: new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Prune messages from a user (max 100 messages within 14 days)')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('The user to prune messages from')
				.setRequired(true)
		)
		.addIntegerOption(option =>
			option
				.setName('amount')
				.setDescription('The number of messages to prune (max 100)')
				.setRequired(true)
				.setMinValue(1)
				.setMaxValue(100)
		),

	async execute(interaction) {
		const user = interaction.options.getUser('user');
		let amount = interaction.options.getInteger('amount');

		// Immediately defer the reply to acknowledge the interaction
		await interaction.deferReply({ ephemeral: true }).catch(console.error);

		try {
			// Limit amount to the maximum allowed by Discord
			amount = Math.min(amount, MAX_PURGE_PER_REQUEST);

			// Calculate the timestamp for 14 days ago
			const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

			const messagesToDelete = [];
			let lastMessageId;

			// Fetch messages in batches until 'amount' is reached or no more messages
			while (messagesToDelete.length < amount) {
				const fetchedMessages = await interaction.channel.messages.fetch({
					limit: MAX_PURGE_PER_REQUEST,
					...(lastMessageId && { before: lastMessageId }),
				});

        if (fetchedMessages.size === 0) break;

        lastMessageId = fetchedMessages.last().id;

				messagesToDelete.push(
					...fetchedMessages.filter(
						msg => msg.author.id === user.id && msg.createdTimestamp > twoWeeksAgo
					)
				);
			}

			// Delete messages if any are found
			if (messagesToDelete.length > 0) {
				const deletedCount = (
					await interaction.channel.bulkDelete(messagesToDelete.slice(0, amount), true)
				).size;

				const embed = new EmbedBuilder()
					.setColor('#00ff00')
					.setTitle('Purge Successful')
					.setDescription(`Pruned ${deletedCount} messages from ${user}`);

				await interaction.editReply({ embeds: [embed] });
			} else {
				return interaction.editReply({
					content: `No messages found from ${user.username} within the last 14 days.`,
				});
			}

			// Optional: Implement rate limit handling (adjust cooldown as needed)
			await new Promise(resolve => setTimeout(resolve, PURGE_COOLDOWN_MS));
		} catch (error) {
			console.error('Failed to prune messages:', error);

			const embed = new EmbedBuilder()
				.setColor('#ff0000')
				.setTitle('Purge Failed')
				.setDescription(
					`Failed to prune messages from ${user}\nError: \`${error.message}\``
				);

      interaction.editReply({ embeds: [embed] }).catch(console.error);
    }
  },
};
