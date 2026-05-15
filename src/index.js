require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const { REST, Routes, Client, Collection, GatewayIntentBits } = require("discord.js");
const { Player } = require("discord-player");
const Logger = require("./utils/logger");
require("./utils/slowBufferCompat");

const CommandPermissions = require("./database/commandPermissions");
const OAuth2Handler = require("./features/youtube-subscriber-roles/utils/oauth2Handler");
const StatsTracker = require("./utils/statsTracker");
const StatusRotator = require("./utils/statusRotator");
const CommandRegistry = require("./utils/commandRegistry");
const CommandExecutor = require("./utils/commandExecutor");
const CommandMonitor = require("./utils/commandMonitor");
const CommandCache = require("./utils/commandCache");

// Client-related functions
/**
 * Creates and configures a new Discord.js client
 * @returns {Client} Configured Discord client
 */
function createClient() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildVoiceStates,
        ],
    });

    // Initialize collections and new command management systems
    client.commands = new Collection();
    client.commandRegistry = new CommandRegistry();
    client.commandCache = new CommandCache(5 * 60 * 1000); // 5-minute TTL
    client.cooldowns = new Collection();
    client.categories = new Collection();

    // Initialize music player
    const player = new Player(client, {
        ytdlOptions: {
            quality: "highestaudio",
            highWaterMark: 1 << 25,
        },
    });

    // Load extractors using the discord-player v6 API
    player.extractors
        .loadDefault()
        .then((result) => {
            if (!result?.success) {
                const message = result?.error?.message || "Unknown error";
                Logger.error(`Failed to load music extractors: ${message}`);
            }
        })
        .catch((error) => {
            Logger.error(`Failed to load music extractors: ${error.message}`);
        });

    return client;
}

/**
 * Loads command files from the specified directory
 * @param {Client} client Discord client
 * @param {string} commandsPath Path to the commands directory
 */
function loadCommands(client, commandsPath) {
    Logger.log("COMMANDS", "Loading commands...");

    if (!fs.existsSync(commandsPath)) {
        Logger.warn(`Commands directory not found: ${commandsPath}`);
        return;
    }

    const commandFolders = fs.readdirSync(commandsPath);
    let commandCount = 0;
    const emptyFolders = [];

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);

        // Skip if not a directory
        if (!fs.statSync(folderPath).isDirectory()) continue;

        // Load category metadata from _category.json
        const categoryConfigPath = path.join(folderPath, "_category.json");
        if (fs.existsSync(categoryConfigPath)) {
            try {
                const rawConfig = fs.readFileSync(categoryConfigPath, "utf8");
                const categoryConfig = JSON.parse(rawConfig);
                client.categories.set(folder.toLowerCase(), categoryConfig);
            } catch (error) {
                Logger.error(`Failed to load category config for ${folder}: ${error.message}`);
            }
        }

        const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith(".js"));

        // Handle empty folders gracefully
        if (commandFiles.length === 0) {
            emptyFolders.push(folder);
            Logger.warn(`Empty command folder detected: ${folder}`);
            continue;
        }

        let folderCommandCount = 0;
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);

            try {
                const command = require(filePath);

                // Allow opt-out of registration for helper-only command modules
                if (command.disabled === true) {
                    continue;
                }

                if ("data" in command && "execute" in command) {
                    // Store the category information for the help command
                    command.category = folder.toLowerCase();
                    command.filePath = filePath;

                    // Register with both old and new systems
                    client.commands.set(command.data.name, command);
                    client.commandRegistry.register(command, folder.toLowerCase());

                    commandCount++;
                    folderCommandCount++;
                } else {
                    Logger.warn(
                        `Command at ${filePath} is missing required "data" or "execute" property`,
                    );
                }
            } catch (error) {
                Logger.error(`Failed to load command ${filePath}: ${error.message}`);
            }
        }
    }

    // Report empty folders if any
    if (emptyFolders.length > 0) {
        Logger.warn(
            `Found ${emptyFolders.length} empty command folders: ${emptyFolders.join(", ")}`,
        );
    }

    Logger.success(
        `Loaded ${commandCount} commands from ${commandFolders.length - emptyFolders.length} active categories`,
    );
}

/**
 * Loads event handlers from the specified directory
 * @param {Client} client Discord client
 * @param {string} eventsPath Path to the events directory
 */
function loadEvents(client, eventsPath) {
    Logger.log("EVENTS", "Loading events...");

    if (!fs.existsSync(eventsPath)) {
        Logger.warn(`Events directory not found: ${eventsPath}`);
        return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));
    let eventCount = 0;

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        eventCount++;
    }

    Logger.success(`Loaded ${eventCount} events`);
}

// Bot configuration
const config = {
    // Discord config
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENTID,
    guildIds: process.env.GUILDID ? process.env.GUILDID.split(",") : [],

    // Database config
    mongoUri: process.env.MONGODB_URL,

    // Simple presence configuration
    presence: {
        activity: {
            name: "with Discord.js",
            type: "Playing",
        },
        status: "online",
    },
};

// Connect to MongoDB
const connectToMongoDB = async () => {
    Logger.log("DATABASE", "Connecting to MongoDB...");
    try {
        await mongoose.connect(config.mongoUri);
        Logger.success("Connected to MongoDB");
    } catch (error) {
        Logger.error(`MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
};

// Deploy commands to Discord API
const deployCommands = async (client) => {
    Logger.log("DEPLOY", "Deploying commands...");
    const commands = client.commandRegistry.toJSON();

    const rest = new REST({ version: "10" }).setToken(config.token);
    try {
        await rest.put(Routes.applicationCommands(config.clientId), {
            body: [],
        });

        for (const guildId of config.guildIds) {
            try {
                const result = await rest.put(
                    Routes.applicationGuildCommands(config.clientId, guildId),
                    { body: commands },
                );
                Logger.success(
                    `Successfully deployed ${result.length} commands to guild ${guildId}`,
                );
            } catch (error) {
                Logger.error(`Failed to deploy commands to guild ${guildId}: ${error}`);
            }
        }
    } catch (error) {
        Logger.error(`Command deployment failed: ${error}`);
    }
};

// Setup graceful shutdown
const setupGracefulShutdown = (client) => {
    process.on("SIGINT", async () => {
        Logger.log("BOT", "Shutting down gracefully...");

        // Stop status rotator
        if (client.statusRotator) {
            client.statusRotator.stop();
        }

        // Stop OAuth2 server if running
        if (client.oauth2Handler) {
            await client.oauth2Handler.stop();
        }

        await mongoose.connection.close();
        client.destroy();
        process.exit(0);
    });
};

// Add to your bot initialization code
async function loadCommandPermissions(client) {
    try {
        const permissions = await CommandPermissions.find({});

        for (const permDoc of permissions) {
            const command = client.commands.get(permDoc.commandName);
            if (command) {
                // Initialize permissions object if it doesn't exist
                if (!command.permissions) command.permissions = {};

                // Set role permissions
                if (!command.permissions.roles) command.permissions.roles = {};
                for (const [roleId, allowed] of permDoc.permissions.roles.entries()) {
                    command.permissions.roles[roleId] = allowed;
                }

                // Set user permissions
                if (!command.permissions.users) command.permissions.users = {};
                for (const [userId, allowed] of permDoc.permissions.users.entries()) {
                    command.permissions.users[userId] = allowed;
                }
            }
        }
        Logger.log("COMMANDS", `Loaded permissions for ${permissions.length} commands`);
    } catch (error) {
        Logger.error("Error loading command permissions:", error);
    }
}

// Initialize the bot
const initializeBot = async () => {
    try {
        // Startup banner
        console.log("\n");
        Logger.startupBox("🚀 Project Kiyo Discord Bot");
        console.log("\n");

        // System information
        Logger.table(
            {
                "Node Version": process.version,
                "Discord.js": require("discord.js").version,
                Environment: process.env.NODE_ENV || "production",
                Platform: process.platform,
                PID: process.pid,
            },
            "📊 System Information",
        );
        console.log("\n");

        Logger.log("BOT", "Initializing bot components...", "info");

        // Create client
        Logger.log("BOT", "→ Creating Discord client...", "info");
        const client = createClient();
        Logger.success("✓ Discord client created");

        // Connect to database
        Logger.log("DATABASE", "→ Connecting to MongoDB...", "info");
        await connectToMongoDB();

        // Start OAuth2 callback server if configured for local development
        Logger.log("BOT", "→ Checking OAuth2 configuration...", "info");
        if (
            process.env.DISCORD_CLIENT_ID &&
            process.env.DISCORD_CLIENT_SECRET &&
            process.env.DISCORD_REDIRECT_URI &&
            process.env.USE_LOCAL_OAUTH === "true"
        ) {
            const oauth2Handler = new OAuth2Handler();
            const port = process.env.OAUTH2_PORT || 3000;
            try {
                await oauth2Handler.start(port);
                Logger.success(`✓ OAuth2 callback server started on port ${port}`);

                // Store oauth2Handler for graceful shutdown
                client.oauth2Handler = oauth2Handler;
            } catch (error) {
                Logger.warn(`✗ Failed to start OAuth2 server: ${error.message}`);
            }
        } else if (
            process.env.DISCORD_CLIENT_ID &&
            process.env.DISCORD_CLIENT_SECRET &&
            process.env.DISCORD_REDIRECT_URI
        ) {
            Logger.success("✓ OAuth2 configured for external callback service (Netlify)");
        } else {
            Logger.warn("⚠ OAuth2 not configured - YouTube subscriber roles will not work");
        }

        // Load commands and events
        Logger.log("BOT", "→ Loading commands and events...", "info");
        loadCommands(client, path.join(__dirname, "./commands"));
        loadEvents(client, path.join(__dirname, "./events"));

        // Load command permissions
        Logger.log("BOT", "→ Loading command permissions...", "info");
        await loadCommandPermissions(client);

        // Deploy commands
        Logger.log("DEPLOY", "→ Deploying slash commands...", "info");
        await deployCommands(client);
        console.log("");

        // Login
        Logger.log("BOT", "→ Logging in to Discord...", "info");
        await client.login(config.token);

        // Make sure client is fully initialized before continuing
        if (!client.user) {
            throw new Error("Client failed to initialize properly after login");
        }
        Logger.success(`✓ Logged in as ${client.user.tag}`);
        console.log("");

        // Initialize and start status rotator
        Logger.log("BOT", "→ Starting status rotator...", "info");
        client.statusRotator = new StatusRotator(client);
        client.statusRotator.start(60000); // Rotate every 60 seconds
        Logger.success("✓ Status rotator initialized");

        // Configure logger with Discord client
        Logger.setDiscordClient(client);

        // Initialize stats tracker
        Logger.log("BOT", "→ Initializing stats tracker...", "info");
        client.statsTracker = new StatsTracker(client);
        Logger.success("✓ Stats tracker initialized");

        // Initialize command monitor
        Logger.log("BOT", "→ Initializing command monitor...", "info");
        client.commandMonitor = new CommandMonitor(client.commandRegistry);
        Logger.success("✓ Command monitor initialized");

        // Periodic cooldown cleanup (every 5 minutes)
        setInterval(
            () => {
                const before = client.cooldowns.size;
                CommandExecutor.cleanupCooldowns(client);
                const after = client.cooldowns.size;
                if (before !== after) {
                    Logger.log("CLEANUP", `Cleaned up ${before - after} expired cooldowns`);
                }
            },
            5 * 60 * 1000,
        );

        // Periodic cache cleanup (every 10 minutes)
        setInterval(
            () => {
                const removed = client.commandCache.cleanup();
                if (removed > 0) {
                    Logger.log("CLEANUP", `Cleaned up ${removed} expired cache entries`);
                }
            },
            10 * 60 * 1000,
        );

        // Setup graceful shutdown
        setupGracefulShutdown(client);

        // Success summary
        console.log("");
        Logger.startupBox("✓ Bot Successfully Started!");
        console.log("\n");
        Logger.table(
            {
                "Bot User": client.user.tag,
                "Bot ID": client.user.id,
                Servers: client.guilds.cache.size.toString(),
                Commands: client.commands.size.toString(),
                Channels: client.channels.cache.size.toString(),
                Users: client.users.cache.size.toString(),
                "Registry Size": client.commandRegistry.size.toString(),
            },
            "📈 Bot Statistics",
        );
        console.log("\n");
        Logger.success("🎉 Project Kiyo is now online and ready!");
        console.log("\n");

        return client;
    } catch (error) {
        Logger.error(`Failed to start the bot: ${error.message}`);
        process.exit(1);
    }
};

// Start the bot
(async () => {
    await initializeBot();
})();
