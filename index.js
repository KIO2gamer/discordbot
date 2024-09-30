const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    REST,
    Routes
} = require('discord.js')
require('dotenv').config()

const { CLIENT_ID, DISCORD_TOKEN, MONGODB_URL } = process.env
const GUILD_IDS = process.env.GUILD_IDS ? process.env.GUILD_IDS.split(',') : []

console.log('Starting bot...') // Log the start of the bot

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
})

client.commands = new Collection()

const loadFiles = (dir, fileAction) => {
    console.log(`Loading files from directory: ${dir}`) // Log the directory being loaded
    fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        if (stat.isDirectory()) {
            loadFiles(filePath, fileAction)
        } else if (file.endsWith('.js')) {
            console.log(`Loading file: ${filePath}`) // Log each file loaded
            fileAction(filePath)
        }
    })
}

const loadCommands = (dir) => {
    console.log('Loading commands...') // Log command loading
    loadFiles(dir, (filePath) => {
        const command = require(filePath)
        if (command?.data && command?.execute) {
            client.commands.set(command.data.name, command)
            console.log(`Command loaded: ${command.data.name}`) // Log each command loaded
            if (command.data.aliases) {
                command.data.aliases.forEach((alias) => {
                    client.commands.set(alias, command)
                    console.log(`Alias loaded: ${alias}`) // Log each alias loaded
                })
            }
        }
    })
}

const loadEvents = (dir) => {
    console.log('Loading events...') // Log event loading
    loadFiles(dir, (filePath) => {
        const event = require(filePath)
        const execute = (...args) => event.execute(...args)
        event.once
            ? client.once(event.name, execute)
            : client.on(event.name, execute)
        console.log(`Event loaded: ${event.name}`) // Log each event loaded
    })
}

loadCommands(path.join(__dirname, 'commands'))
loadEvents(path.join(__dirname, 'events'))

const connectToMongoDB = async () => {
    console.log('Connecting to MongoDB...') // Log MongoDB connection attempt
    try {
        mongoose.set('strictQuery', false)
        await mongoose.connect(MONGODB_URL)
        console.log('Connected to MongoDB') // Log successful connection
    } catch (error) {
        console.error(`MongoDB connection failed: ${error.message}`)
        process.exit(1)
    }
}

const deployCommands = async () => {
    console.log('Deploying commands...') // Log command deployment
    const commands = []
    loadFiles(path.join(__dirname, 'commands'), (filePath) => {
        const command = require(filePath)
        if (command?.data?.toJSON) commands.push(command.data.toJSON())
    })

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN)
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] })
        for (const guildId of GUILD_IDS) {
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, guildId),
                { body: commands }
            )
            console.log(`Commands deployed to guild: ${guildId}`) // Log guild command deployment
        }
    } catch (error) {
        console.error('Command deployment failed:', error)
    }
}

process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...')
    await mongoose.connection.close()
    client.destroy()
    process.exit(0)
})
;(async () => {
    try {
        await connectToMongoDB()
        await deployCommands()
        await client.login(DISCORD_TOKEN)
        console.log('Bot is running!') // Log when the bot is up and running
    } catch (error) {
        console.error(`Failed to start the bot: ${error.message}`)
        process.exit(1)
    }
})()
