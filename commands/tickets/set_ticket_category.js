const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
	description_full:
		'Sets the category where new ticket channels will be created. Requires the "Manage Channels" permission.',
	usage: '/set_ticket_category <category:category>',
	examples: ['/set_ticket_category category:Support'],
	data: new SlashCommandBuilder()
		.setName('set_ticket_category')
		.setDescription('Sets the category where tickets will be created.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addChannelOption(option =>
			option
				.setName('category')
				.setDescription('The category to use for tickets.')
				.setRequired(true)
		),
	async execute(interaction) {
		const category = interaction.options.getChannel('category');
		console.log(category);

		// Validate that the provided channel is a category
		if (category.type !== 4) {
			return interaction.reply({
				content: 'Please select a valid category channel.',
				ephemeral: true,
			});
		}

		const categoryId = category.id;

		// Store the category ID in a JSON file
		try {
			const config = { ticketCategoryId: categoryId };
			fs.writeFileSync(
				'./assets/json/ticketConfig.json',
				JSON.stringify(config, null, 2) // Use 2 spaces for indentation
			);

			interaction.reply({
				content: `Ticket category set to: <#${categoryId}>`,
				ephemeral: true,
			});
		} catch (error) {
			console.error('Error writing ticket category to file:', error);
			interaction.reply({
				content: 'There was an error saving the ticket category. Please try again later.',
				ephemeral: true,
			});
		}
	},
};
