const { Client, GatewayIntentBits } = require('discord.js')

;(async () => {
    const chalk = (await import('chalk')).default
    const boxen = (await import('boxen')).default

    // Timeout in seconds (default 5, can be customized via environment variable)
    const TIMEOUT = process.env.WORKFLOW_TIMEOUT || 5

    // Create a Discord client with minimal intents
    const client = new Client({
        intents: [GatewayIntentBits.Guilds],
    })

    // Function to display a boxed, colorful message
    const printMessage = (message, type = 'info') => {
        const colors = {
            info: chalk.blueBright,
            success: chalk.greenBright,
            error: chalk.redBright,
            warning: chalk.yellowBright,
        }

        console.log(
            boxen(colors[type](message), {
                padding: 1,
                margin: 1,
                borderColor: 'yellow',
                borderStyle: 'round',
                align: 'center',
            })
        )
    }

    client.once('ready', () => {
        printMessage('✅ Bot is online for workflow check!', 'success')

        // Perform any startup checks or tasks

        // Schedule shutdown after timeout
        setTimeout(() => {
            printMessage(
                `🕒 Exiting workflow bot after ${TIMEOUT} seconds`,
                'info'
            )
            process.exit(0)
        }, TIMEOUT * 1000)
    })

    // Handle potential errors during login
    client
        .login(process.env.DISCORD_TOKEN)
        .then(() => {
            printMessage(`🔐 Login successful! ${process.env.DISCORD_TOKEN}\n${process.env.CLIENT_ID}\n${process.env.MONGODB_URI}\n${process.env.GUILD_IDS}\n${process.env.CLIENT_SECRET}`, 'success')
        })
        .catch((error) => {
            printMessage(`❌ Login failed: ${error.message}`, 'error')
            process.exit(1)
        })

    // Graceful shutdown on SIGINT or SIGTERM (for manual termination)
    process.on('SIGINT', () => {
        printMessage(
            '⚠️ Workflow bot interrupted (SIGINT). Shutting down...',
            'warning'
        )
        process.exit(0)
    })

    process.on('SIGTERM', () => {
        printMessage(
            '⚠️ Workflow bot terminated (SIGTERM). Shutting down...',
            'warning'
        )
        process.exit(0)
    })
})()
