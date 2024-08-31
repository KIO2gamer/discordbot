const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	description_full: 'Deletes a specified number of messages from the channel.',
	usage: '/purge amount:number',
	examples: ['/purge amount:5', '/purge amount:100'],
	data: new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Deletes messages from the current channel.')
		.addIntegerOption(option =>
			option
				.setName('amount')
				.setDescription('The number of messages to delete')
				.setRequired(true)
				.setMinValue(1)
				.setMaxValue(100)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

	async execute(interaction) {
		const amount = interaction.options.getInteger('amount');

		await interaction.deferReply({ ephemeral: true });

		try {
			const messages = await interaction.channel.messages.fetch({
				limit: amount,
			});

			// Check if there are messages to delete
			if (messages.size === 0) {
				return interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setTitle('Nothing to Purge')
							.setDescription('There are no messages to delete in this channel.')
							.setColor('Yellow'), // Yellow for warning
					],
				});
			}

			await interaction.channel.bulkDelete(messages);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle('Purge Successful')
						.setDescription(`Successfully deleted ${amount} messages.`)
						.setColor('Green'),
				],
			});
		} catch (error) {
			console.error('Error purging messages:', error);
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle('Purge Failed')
						.setDescription('An error occurred while trying to purge messages.')
						.setColor('Red'),
				],
			});
		}
	},
};
