const { Events, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

// Function to handle errors consistently
async function handleError(interaction, error) {
	console.error(error); // Log the error for debugging

	const errorMessage = 'There was an error processing your request.';

	// Only reply if the interaction hasn't been acknowledged yet
	if (!interaction.replied && !interaction.deferred) {
		await interaction.reply({ content: errorMessage, ephemeral: true });
	} else {
		// If already replied or deferred, try to follow up
		await interaction.followUp({ content: errorMessage, ephemeral: true });
	}
}

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		try {
			if (interaction.isButton() && interaction.customId.startsWith('open-ticket')) {
				await interaction.deferReply({ ephemeral: true });

				const guild = interaction.guild;
				const member = interaction.member;
				const ticketChannelName = `ticket-${member.user.username}-${member.id}`;

				const existingTicketChannel = guild.channels.cache.find(
					channel => channel.name === ticketChannelName
				);

				if (existingTicketChannel) {
					return interaction.editReply({
						content: `You already have an open ticket: ${existingTicketChannel}`,
						ephemeral: true,
					});
				}

				try {
					let ticketConfig;
					try {
						const data = fs.readFileSync('./assets/json/ticketConfig.json');
						ticketConfig = JSON.parse(data);
					} catch (err) {
						console.error('Error reading ticket config:', err);
						return interaction.reply({
							content:
								'Ticket category is not set! Please use `/setticketcategory` to set it up.',
							ephemeral: true,
						});
					}

					const ticketCategoryId = ticketConfig.ticketCategoryId;

					if (!ticketCategoryId) {
						return interaction.reply({
							content:
								'Ticket category is not set! Please use `/setticketcategory` to set it up.',
							ephemeral: true,
						});
					}

					const ticketChannel = await guild.channels.create({
						name: ticketChannelName,
						type: ChannelType.GuildText,
						parent: ticketCategoryId,
						permissionOverwrites: [
							{
								id: interaction.guild.id,
								deny: [PermissionFlagsBits.ViewChannel],
							},
							{
								id: member.id,
								allow: [
									PermissionFlagsBits.ViewChannel,
									PermissionFlagsBits.SendMessages,
									PermissionFlagsBits.AttachFiles,
									PermissionFlagsBits.ReadMessageHistory,
								],
							},
						],
					});

					const ticketEmbed = new EmbedBuilder()
						.setColor('#0099ff')
						.setTitle(`Ticket - ${member.user.username}`)
						.setDescription(
							'Please describe your issue. A staff member will assist you shortly.'
						)
						.setTimestamp();
					await ticketChannel.send({ embeds: [ticketEmbed] });

					interaction.editReply({
						content: `Your ticket has been created: ${ticketChannel}`,
						ephemeral: true,
					});
				} catch (error) {
					handleError(interaction, error); // Use the common error handler
				}
			} else if (interaction.isChatInputCommand()) {
				const command = interaction.client.commands.get(interaction.commandName);

				if (!command) {
					console.error(`No command matching ${interaction.commandName} was found.`);
					return;
				}

				try {
					await command.execute(interaction);
				} catch (error) {
					handleError(interaction, error); // Use the common error handler
				}
			}
		} catch (error) {
			handleError(interaction, error); // Handle potential errors at the top level
		}
	},
};
