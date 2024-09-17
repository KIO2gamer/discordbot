const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    REST,
    Routes,
} = require('discord.js')
require('dotenv').config()

// Dynamically import chalk and boxen for better terminal output
;(async () => {
    const chalk = (await import('chalk')).default
    const boxen = (await import('boxen')).default

    // Boxen options
    const boxOptions = {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'green',
        align: 'center',
    }

    // Validate environment variables
    const validateEnvVars = (vars) => {
        vars.forEach((envVar) => {
            if (!process.env[envVar]) {
                console.error(
                    chalk.red.bold(
                        `❌ Missing required environment variable: ${envVar}`
                    )
                )
                process.exit(1)
            }
        })
    }
    validateEnvVars(['DISCORD_TOKEN', 'MONGODB_URL', 'CLIENT_ID'])

    // Initialize constants
    const { CLIENT_ID, DISCORD_TOKEN } = process.env
    const GUILD_IDS = process.env.GUILD_IDS
        ? process.env.GUILD_IDS.split(',')
        : []

    // Initialize the Discord client
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildVoiceStates,
        ],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    })

    client.commands = new Collection()

    // Load commands and events
    const loadFiles = (dir, fileAction) => {
        const files = fs.readdirSync(dir)
        files.forEach((file) => {
            const filePath = path.join(dir, file)
            const stat = fs.statSync(filePath)
            if (stat.isDirectory()) {
                loadFiles(filePath, fileAction)
            } else if (file.endsWith('.js')) {
                fileAction(filePath)
            }
        })
    }

    const loadCommands = (dir) => {
        loadFiles(dir, (filePath) => {
            const command = require(filePath)
            if (command?.data && command?.execute) {
                client.commands.set(command.data.name, command)
                if (command.data.aliases) {
                    command.data.aliases.forEach((alias) =>
                        client.commands.set(alias, command)
                    )
                }
                console.log(
                    chalk.green(`✅ Loaded command: ${command.data.name}`)
                )
            } else {
                console.warn(
                    chalk.yellow(
                        `[WARNING] Command at ${filePath} is missing "data" or "execute" property.`
                    )
                )
            }
        })
    }

    const loadEvents = (dir) => {
        loadFiles(dir, (filePath) => {
            const event = require(filePath)
            const execute = (...args) => event.execute(...args)
            event.once
                ? client.once(event.name, execute)
                : client.on(event.name, execute)
            console.log(chalk.green(`✅ Loaded event: ${event.name}`))
        })
    }

    loadCommands(path.join(__dirname, 'commands'))
    loadEvents(path.join(__dirname, 'events'))

    // MongoDB connection with retry logic
    const connectToMongoDB = async (retries = 5) => {
        try {
            mongoose.set('strictQuery', false)
            await mongoose.connect(process.env.MONGODB_URL)
            console.log(boxen(chalk.green('Connected to MongoDB'), boxOptions))
        } catch (error) {
            console.error(
                chalk.red(`❌ MongoDB connection failed: ${error.message}`)
            )
            if (retries > 0) {
                console.log(
                    chalk.yellow(
                        `Retrying MongoDB connection (${retries} retries left)...`
                    )
                )
                setTimeout(() => connectToMongoDB(retries - 1), 5000)
            } else {
                console.error(
                    chalk.red(
                        '❌ MongoDB connection failed after retries. Shutting down...'
                    )
                )
                process.exit(1)
            }
        }
    }

    // Command deployment
    const deployCommands = async () => {
        const commands = []
        loadFiles(path.join(__dirname, 'commands'), (filePath) => {
            const command = require(filePath)
            if (command?.data?.toJSON) commands.push(command.data.toJSON())
        })

        const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN)
        try {
            console.log(
                chalk.blue(
                    `Deploying ${commands.length} application (/) commands.`
                )
            )
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] })
            console.log(
                boxen(chalk.green('Global commands reset.'), boxOptions)
            )

            for (const guildId of GUILD_IDS) {
                try {
                    const data = await rest.put(
                        Routes.applicationGuildCommands(CLIENT_ID, guildId),
                        { body: commands }
                    )
                    console.log(
                        chalk.green(
                            `✅ Deployed ${data.length} commands to guild ${guildId}.`
                        )
                    )
                } catch (error) {
                    console.error(
                        chalk.red(
                            `❌ Failed to deploy commands for guild ${guildId}:`,
                            error
                        )
                    )
                }
            }
        } catch (error) {
            console.error(chalk.red('❌ Command deployment failed:'), error)
        }
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log(chalk.yellow('⚠️ Shutting down gracefully...'))
        await mongoose.connection.close()
        client.destroy()
        process.exit(0)
    })

    // Start the bot
    try {
        await connectToMongoDB()
        await deployCommands()
        await client.login(DISCORD_TOKEN)
        console.log(boxen(chalk.green.bold('Bot is running!'), boxOptions))
    } catch (error) {
        console.error(chalk.red(`❌ Failed to start the bot: ${error.message}`))
        process.exit(1)
    }
})()
