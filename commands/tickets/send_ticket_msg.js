const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');

module.exports = {
	description_full:
		'Sends a message with a button to a specified channel. Users can click the button to open a new ticket. Requires the "Manage Channels" permission.',
	usage: '/send_ticket_msg <channel:channel> [title] [description] [button_label]',
	examples: [
		'/send_ticket_msg channel:#support',
		'/send_ticket_msg channel:#help-desk title:"Need Assistance?" description:"Click below to get help!" button_label:"Get Help"',
	],
	data: new SlashCommandBuilder()
		.setName('send_ticket_msg')
		.setDescription('Sends the ticket opening message to a channel.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.addChannelOption(option =>
			option
				.setName('channel')
				.setDescription('The channel to send the setup message to.')
				.setRequired(true)
		)
		.addStringOption(option =>
			option.setName('title').setDescription('The title of the ticket embed (optional)')
		)
		.addStringOption(option =>
			option
				.setName('description')
				.setDescription('The description of the ticket embed (optional)')
		)
		.addStringOption(option =>
			option
				.setName('button_label')
				.setDescription('The label for the ticket button (optional)')
		),
	async execute(interaction) {
		const channel = interaction.options.getChannel('channel');

		// Validation (ensure it's a text channel)
		if (channel.type !== 0) {
			return interaction.reply({
				content: 'This command can only be used in text channels.',
				ephemeral: true,
			});
		}

		const title = interaction.options.getString('title') || 'Open a Ticket';
		const description =
			interaction.options.getString('description') ||
			'Click the button below to open a new ticket.';
		const buttonLabel = interaction.options.getString('button_label') || 'Open Ticket';

		const ticketButton = new ButtonBuilder()
			.setCustomId('open-ticket')
			.setLabel(buttonLabel)
			.setStyle(ButtonStyle.Primary);

		const ticketRow = new ActionRowBuilder().addComponents(ticketButton);

		const embed = new EmbedBuilder()
			.setColor('#0099ff') // Example color
			.setTitle(title)
			.setDescription(description);

		try {
			await interaction.deferReply({ ephemeral: true }); // For responsiveness
			await channel.send({ embeds: [embed], components: [ticketRow] });
			await interaction.followUp({ content: 'Ticket message sent!', ephemeral: true });
		} catch (error) {
			console.error('Error sending ticket message:', error);
			interaction.followUp({
				content: 'There was an error sending the message.',
				ephemeral: true,
			});
		}
	},
};
