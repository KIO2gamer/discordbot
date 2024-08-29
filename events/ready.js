const { Events, ActivityType } = require('discord.js');
const fs = require('fs');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		// Set a presence status
		client.user.setPresence({
			activities: [{ name: 'your command', type: ActivityType.Watching }],
			status: 'online', // You can use 'online', 'idle', 'dnd', or 'invisible'
		});

		// Log server count
		console.log(`Connected to ${client.guilds.cache.size} servers`);

		// Check if ticket category is set
		try {
			const data = fs.readFileSync('./assets/json/ticketConfig.json');
			const ticketConfig = JSON.parse(data);
			if (!ticketConfig.ticketCategoryId) {
				console.warn(
					'[WARNING] Ticket category is not set! Use /setticketcategory to set it up.'
				);
			}
		} catch (err) {
			console.error('Error reading ticket config:', err);
		}
	},
};

