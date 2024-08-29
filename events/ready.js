/**
 * Handles the ready event for the Discord client.
 * This event is emitted when the client is ready and fully initialized.
 * It sets the client's presence status and logs the number of servers the client is connected to.
 */
const { Events, ActivityType } = require('discord.js');
const fs = require('fs');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		// Set a presence status
		client.user.setPresence({
			activities: [{ name: 'TKOD Server', type: ActivityType.Watching }],
			status: 'dnd', // You can use 'online', 'idle', 'dnd', or 'invisible'
		});

		// Log server count
		console.log(`Connected to ${client.guilds.cache.size} servers`);
	},
};
