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

			// Only reply if the interaction hasn't been acknowledged yet
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			} else {
				// If already replied or deferred, try to follow up
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			}
		}
	},
};
