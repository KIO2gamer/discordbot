const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setticketcategory')
		.setDescription('Sets the category where tickets will be created.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addChannelOption(option =>
			option
				.setName('category')
				.setDescription('The category to use for new tickets.')
				.setRequired(true)
		),
	async execute(interaction) {
		const category = interaction.options.getChannel('category');

		const config = { ticketCategoryId: category.id };
		fs.writeFileSync('./assets/json/ticketConfig.json', JSON.stringify(config));

		interaction.reply(`Ticket category set to: ${category}`);
	},
};
