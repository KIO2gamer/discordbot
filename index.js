const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');

// Validate environment variables
const REQUIRED_ENV_VARS = ['DISCORD_TOKEN', 'MONGODB_URL', 'CLIENT_ID'];
REQUIRED_ENV_VARS.forEach(envVar => {
	if (!process.env[envVar]) {
		console.error(`Missing required environment variable: ${envVar}`);
		process.exit(1);
	}
});

const CLIENT_ID = process.env.CLIENT_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_IDS = process.env.GUILD_IDS ? process.env.GUILD_IDS.split(',') : [];
const MAX_MONGO_RETRIES = 5;

// Initialize the client -  Only include necessary intents
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Command collection
client.commands = new Collection();

// Function to recursively load commands from a directory
function loadCommands(dir) {
	const commandFiles = fs.readdirSync(dir, { withFileTypes: true });

	for (const file of commandFiles) {
		const filePath = path.join(dir, file.name);

		if (file.isDirectory()) {
			loadCommands(filePath);
		} else if (file.isFile() && file.name.endsWith('.js')) {
			try {
				const command = require(filePath);
				// Use 'in' operator to check for property existence
				if ('data' in command && 'execute' in command) {
					client.commands.set(command.data.name, command);

					if (command.data.aliases) {
						command.data.aliases.forEach(alias => {
							client.commands.set(alias, command);
						});
					}
				} else {
					console.warn(
						`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
					);
				}
			} catch (error) {
				console.error(`[ERROR] Failed to load command from ${filePath}:`, error);
			}
		}
	}
}

// Load commands from the 'commands' directory
loadCommands(path.join(__dirname, 'commands'));

// Event handling
const loadEvents = dir => {
	const eventFiles = fs.readdirSync(dir).filter(file => file.endsWith('.js'));

	for (const file of eventFiles) {
		try {
			const event = require(path.join(dir, file));
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args));
			} else {
				client.on(event.name, (...args) => event.execute(...args));
			}
		} catch (error) {
			console.error(`[ERROR] Failed to load event from ${file}:`, error);
		}
	}
};

loadEvents(path.join(__dirname, 'events'));

// MongoDB connection with retry
async function connectToMongoDB(retries = MAX_MONGO_RETRIES) {
	try {
		mongoose.set('strictQuery', false);
		await mongoose.connect(process.env.MONGODB_URL);
		console.log('Connected to MongoDB');
	} catch (error) {
		console.error(`Failed to connect to MongoDB: ${error.message}`);
		if (retries > 0) {
			const retryDelay = 5000;
			console.log(
				`Retrying to connect to MongoDB in ${retryDelay / 1000} seconds... (${retries} attempts left)`
			);
			setTimeout(() => connectToMongoDB(retries - 1), retryDelay);
		} else {
			console.error('Exhausted all retries. Shutting down...');
			process.exit(1);
		}
	}
}

// Deploy commands -  Consider using slash commands for easier management
const deployCommands = async () => {
	const commands = [];
	const commandsDir = path.join(__dirname, 'commands');

	function getCommandsFromDir(dirPath) {
		const files = fs.readdirSync(dirPath, { withFileTypes: true });

		for (const file of files) {
			const filePath = path.join(dirPath, file.name);

			if (file.isDirectory()) {
				getCommandsFromDir(filePath);
			} else if (file.isFile() && file.name.endsWith('.js')) {
				try {
					const command = require(filePath);
					if ('data' in command && 'execute' in command) {
						commands.push(command.data.toJSON());
					} else {
						console.warn(
							`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
						);
					}
				} catch (error) {
					console.error(`[ERROR] Failed to load command from ${filePath}:`, error);
				}
			}
		}
	}

	getCommandsFromDir(commandsDir);

	const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// Deploy to specific guilds (if GUILD_IDS is defined)
		if (GUILD_IDS.length > 0) {
			for (const guildId of GUILD_IDS) {
				try {
					const data = await rest.put(
						Routes.applicationGuildCommands(CLIENT_ID, guildId),
						{ body: commands }
					);
					console.log(
						`Successfully reloaded ${data.length} commands for guild ${guildId}.`
					);
				} catch (error) {
					console.error(`Failed to deploy commands for guild ${guildId}:`, error);
				}
			}
		} else {
			// Global deployment
			const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
			console.log(`Successfully reloaded ${data.length} global commands.`);
		}
	} catch (error) {
		console.error('Error deploying commands:', error);
	}
};

// Graceful shutdown
process.on('SIGINT', async () => {
	console.log('Shutting down gracefully...');
	try {
		await mongoose.connection.close();
		console.log('Disconnected from MongoDB');
		client.destroy();
		console.log('Discord client destroyed');
		process.exit(0);
	} catch (error) {
		console.error('Error during shutdown:', error);
		process.exit(1); // Indicate an error during shutdown
	}
});

// Login to Discord and start the bot
(async () => {
	try {
		await connectToMongoDB();
		await deployCommands();
		await client.login(DISCORD_TOKEN);
	} catch (error) {
		console.error(`Failed to start the bot: ${error.message}`);
		process.exit(1);
	}
})();
