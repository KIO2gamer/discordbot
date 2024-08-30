const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds
	]
});

client.once('ready', () => {
    console.log('Bot is online for workflow check!');
    // Perform any startup checks or tasks
    setTimeout(() => {
        console.log('Exiting workflow bot');
        process.exit(0);
    }, 5 * 1000); // Adjust the timeout as needed, here it's 5 seconds
});

client.login(process.env.DISCORD_TOKEN);
