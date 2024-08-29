const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Rate limiting (adjust as needed)
const MAX_PURGE_PER_REQUEST = 100; // Max messages per bulkDelete
const PURGE_COOLDOWN_MS = 5000; // Cooldown in milliseconds

module.exports = {
	description_full: 'Prunes (deletes) messages from the channel within the last 14 days.',
	usage: '/purge [user:@user] [amount:number] [reason:"reason"]',
	examples: [
		'/purge',
		'/purge amount:50',
		'/purge user:@user123 amount:25',
		'/purge reason:"Cleaning up spam"',
		'/purge user:@user123 amount:10 reason:"Removing inappropriate messages"'
	],
	data: new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Purge messages (max 100 messages within 14 days)')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('The user to prune messages from (optional)')
		)
		.addIntegerOption(option =>
			option
				.setName('amount')
				.setDescription('The number of messages to prune (max 100, optional)')
				.setMinValue(1)
				.setMaxValue(100)
		)
		.addStringOption(option =>
			option
				.setName('reason')
				.setDescription('The reason for purging the messages (optional)')
		),

	async execute(interaction) {
		const user = interaction.options.getUser('user');
		let amount = interaction.options.getInteger('amount') || 100; // Default to 100 if not provided
		const reason = interaction.options.getString('reason') || 'No reason provided';

		await interaction.deferReply({ ephemeral: true }).catch(console.error);

		try {
			amount = Math.min(amount, MAX_PURGE_PER_REQUEST);

			const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

			let messagesToDelete = [];
			let lastMessageId;

			// Fetch messages until enough are found or the limit is reached
			while (messagesToDelete.length < amount) {
				const fetchedMessages = await interaction.channel.messages.fetch({
					limit: amount - messagesToDelete.length, // Fetch only the remaining amount
					...(lastMessageId && { before: lastMessageId }),
				});

				if (fetchedMessages.size === 0) break;

				lastMessageId = fetchedMessages.last().id;

				// Apply filter if user is specified
				const filteredMessages = user
					? fetchedMessages.filter(
						msg => msg.author.id === user.id && msg.createdTimestamp > twoWeeksAgo
					)
					: fetchedMessages.filter(msg => msg.createdTimestamp > twoWeeksAgo);

				messagesToDelete = messagesToDelete.concat(filteredMessages.toJSON()); 

				// Stop fetching if enough messages are found
				if (messagesToDelete.length >= amount) break;
			}

			const deletedCount = messagesToDelete.length; // Get the final count
			
			// Delete messages in batches to avoid hitting rate limits
			while (messagesToDelete.length > 0) {
				const batch = messagesToDelete.splice(0, MAX_PURGE_PER_REQUEST);
				await interaction.channel.bulkDelete(batch, true);

				// Optional rate limit handling
				await new Promise(resolve => setTimeout(resolve, PURGE_COOLDOWN_MS));
			}

			const embed = new EmbedBuilder()
				.setColor('#00ff00')
				.setTitle('Purge Successful')
				.setDescription(`Pruned ${deletedCount} messages from ${user ? user : 'the channel'}. Reason: ${reason}`);

			await interaction.editReply({ embeds: [embed] });

		} catch (error) {
			console.error('Failed to prune messages:', error);

			const embed = new EmbedBuilder()
				.setColor('#ff0000')
				.setTitle('Purge Failed')
				.setDescription(
					`Failed to prune messages. Error: \`${error.message}\``
				);

			interaction.editReply({ embeds: [embed] }).catch(console.error);
		}
	},
};
