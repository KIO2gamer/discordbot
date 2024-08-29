/**
 * Displays statistics on reactions used in a specific channel or across the entire server. It shows the top 5 most used reactions and the top 5 users who react the most, within a specified timeframe or for the entire server history.
 *
 * @param {import('discord.js').CommandInteraction} interaction - The Discord interaction object.
 * @param {import('discord.js').Channel} [channel] - The channel to get reaction stats from (optional).
 * @param {string} [timeframe] - The timeframe to get stats for (e.g., "24h", "7d", "1M").
 * @returns {Promise<void>} - Resolves when the command has been executed.
 */
const { SlashCommandBuilder, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const moment = require('moment');

module.exports = {
	description_full:
		'Displays statistics on reactions used in a specific channel or across the entire server. It shows the top 5 most used reactions and the top 5 users who react the most, within a specified timeframe or for the entire server history.',
	usage: '/reactionstats [channel] [timeframe]',
	examples: [
		'/reactionstats',
		'/reactionstats #general',
		'/reactionstats #general 7d',
		'/reactionstats 1M',
	],
	data: new SlashCommandBuilder()
		.setName('reactionstats')
		.setDescription(
			'Displays statistics on reactions given in a specific channel or server-wide.'
		)
		.addChannelOption(option =>
			option
				.setName('channel')
				.setDescription('The channel to get reaction stats from (optional)')
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName('timeframe')
				.setDescription('The timeframe to get stats for (e.g., "24h", "7d", "1M")')
				.setRequired(false)
				.addChoices(
					{ name: 'Last 24 Hours', value: '24h' },
					{ name: 'Last 7 Days', value: '7d' },
					{ name: 'Last 30 Days', value: '30d' }, // Added more timeframe options
					{ name: 'Last Month', value: '1M' }, // Use moment.js shorthand for months
					{ name: 'All Time', value: 'all' }
				)
		),

	async execute(interaction) {
		const channel = interaction.options.getChannel('channel');
		const timeframe = interaction.options.getString('timeframe') || '7d';
		let startDate;

		// More robust timeframe handling using moment.js:
		switch (timeframe) {
			case '24h':
				startDate = moment().subtract(1, 'day').toDate();
				break;
			case '7d':
				startDate = moment().subtract(7, 'days').toDate();
				break;
			case '30d':
				startDate = moment().subtract(30, 'days').toDate();
				break;
			case '1M':
				startDate = moment().subtract(1, 'month').toDate();
				break;
			case 'all':
				startDate = new Date(0); // Beginning of time
				break;
			default:
				// Default to 7 days if invalid timeframe is provided
				startDate = moment().subtract(7, 'days').toDate();
		}

		const endDate = new Date();

		// Function to fetch messages and filter by timeframe:
		const getMessagesInTimeframe = async channel => {
			let messages = [];
			let lastMessage = null;

			// Use a loop to fetch messages in batches until all messages in the timeframe are retrieved
			do {
				const fetchedMessages = await channel.messages.fetch({
					limit: 100,
					before: lastMessage?.id,
				});
				messages = messages.concat(fetchedMessages);
				lastMessage = fetchedMessages.last();
			} while (lastMessage && lastMessage.createdAt > startDate && messages.size <= 10000); // Limit to 10,000 messages for performance

			return messages.filter(msg => msg.createdAt >= startDate && msg.createdAt <= endDate);
		};

		let messages;
		if (channel) {
			messages = await getMessagesInTimeframe(channel);
		} else {
			// Use a more efficient method to get messages from all channels
			const allMessages = await interaction.guild.channels.cache.reduce(async (acc, ch) => {
				if (ch.isTextBased()) {
					return (await acc).concat(await getMessagesInTimeframe(ch));
				}
				return acc;
			}, Promise.resolve([]));
			messages = allMessages;
		}

		const reactionCounts = {};
		const userReactionCounts = {};

		messages.forEach(msg => {
			msg.reactions.cache.forEach(reaction => {
				const emoji = reaction.emoji.name;
				reactionCounts[emoji] = (reactionCounts[emoji] || 0) + reaction.count;

				reaction.users.cache.forEach(user => {
					userReactionCounts[user.id] = (userReactionCounts[user.id] || 0) + 1;
				});
			});
		});

		// Sort and slice to get top 5:
		const sortedReactions = Object.entries(reactionCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		const sortedUsers = Object.entries(userReactionCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		const embed = new EmbedBuilder()
			.setTitle('Reaction Stats')
			.setDescription(
				`Reaction statistics from ${channel ? `<#${channel.id}>` : 'the server'} for the ${timeframe === 'all' ? 'entire server history' : `past ${timeframe}`}`
			)
			.addFields([
				{
					name: 'Top 5 Reactions',
					value:
						sortedReactions.map(([emoji, count]) => `${emoji}: ${count}`).join('\n') ||
						'No reactions found.',
				},
				{
					name: 'Top 5 Reactors',
					value:
						sortedUsers.map(([user, count]) => `<@${user}>: ${count}`).join('\n') ||
						'No reactors found.',
				},
			])
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};
