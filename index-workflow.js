/**
 * Initializes a Discord client with the specified intents and partials, logs the client in, and exits the process after 5 seconds.
 * 
 * This code sets up a Discord bot that connects to the Discord API using the provided token. It specifies the intents and partials the bot will use, and logs a message when the bot is ready. After 5 seconds, the bot will exit the process.
 * 
 * This code is likely part of a larger workflow or script that runs the Discord bot for a specific purpose, such as performing some startup checks or tasks.
 */
const { Client } = require('discord.js');
const config = require('./config');
const client = new Client(config);

client.once('ready', () => {
	console.log('Bot is online for workflow check!');
	// Perform any startup checks or tasks
	console.log('Performing startup checks...');
	// Add your startup tasks here
	console.log('Startup checks completed.');
	
	setTimeout(() => {
		console.log('Exiting workflow bot');
		process.exit(0);
	}, WORKFLOW_DURATION_MS);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to log in:', error);
    process.exit(1);
});

if (!process.env.DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN environment variable is not set');
    process.exit(1);
}
