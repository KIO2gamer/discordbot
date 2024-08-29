/**
 * Handles the execution of Discord slash commands.
 * 
 * This module exports an object with an `execute` method that is called when a Discord interaction event is received. The method checks if the interaction is a chat input command, retrieves the corresponding command from the client's command registry, and executes the command's `execute` method. If any errors occur during the command execution, it sends an ephemeral reply to the user indicating that an error occurred.
 */
const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return interaction.reply({
				content: 'There was an error while executing this command!',
				ephemeral: true,
			});
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`Error executing ${interaction.commandName}`);
			console.error(error);
			await interaction.reply({
				content: 'There was an error while executing this command!',
				ephemeral: true,
			});
		}
	},
};
