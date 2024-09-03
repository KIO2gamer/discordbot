const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ComponentType,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js')
const fs = require('fs')
const path = require('path')

// Define the structure and options for the /help command
const commandData = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays all commands or info about a specific command')
    .addStringOption((option) =>
        option
            .setName('command')
            .setRequired(false)
            .setDescription('The name of the command you want more info on')
    )
    .addStringOption((option) =>
        option
            .setName('search')
            .setRequired(false)
            .setDescription('Search for a command by name or description')
    )

module.exports = {
    data: commandData, // Export the command data
    async execute(interaction) {
        // Defer the reply to allow more time for processing
        await interaction.deferReply()

        // Get the guild and command options
        const { guild } = interaction
        const commandName = interaction.options
            .getString('command')
            ?.toLowerCase()
        const searchQuery = interaction.options
            .getString('search')
            ?.toLowerCase()

        // Get commands organized by category and all commands
        const commandsByCategory = await getCommandsByCategory(guild)
        const allCommands = Array.from(commandsByCategory.values()).flat()

        // Define a standard footer for embeds
        const embedFooter = {
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        }

        // Handle specific command information request
        if (commandName) {
            const command = allCommands.find(
                (cmd) => cmd.name === commandName
            )

            if (!command) {
                return await interaction.editReply({
                    content: `No command found with the name "${commandName}"`,
                    ephemeral: true, // Only visible to the user
                })
            }

            // Create fields for usage and examples
            const usageField = {
                name: 'Usage:',
                value: command.usage
                    ? `\`${command.usage}\``
                    : 'No specific usage.',
                inline: false,
            }
            const examplesField = {
                name: 'Examples:',
                value: command.examples
                    ? command.examples.map((ex) => `\`${ex}\``).join('\n')
                    : 'No examples provided.',
                inline: false,
            }

            // Create the command information embed
            const commandInfoEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle(`❓ Command Details: /${command.name}`)
                .setDescription(
                    command.description_full ||
                        command.description ||
                        'No detailed description available.'
                )
                .addFields(usageField)
                .setTimestamp()
                .setFooter(embedFooter)

            // Add examples field if it's different from usage
            if (usageField.value !== examplesField.value) {
                commandInfoEmbed.addFields(examplesField)
            }

            return await interaction.editReply({
                embeds: [commandInfoEmbed],
            })
        }

        // Handle command search request
        if (searchQuery) {
            const searchResults = getSearchResults(
                commandsByCategory,
                searchQuery
            )

            if (searchResults.length === 0) {
                return await interaction.editReply({
                    content: `No commands found matching "${searchQuery}"`,
                    ephemeral: true,
                })
            }

            // Create an embed for search results
            const searchEmbed = createCommandListEmbed(
                searchResults,
                `🔍 Search Results for "${searchQuery}"`,
                '#f39c12'
            ).setFooter(embedFooter)

            return await interaction.editReply({ embeds: [searchEmbed] })
        }

        // Handle default help (list all commands)
        try {
            // Create the command list embed
            const commandListEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('📃 Kiyo Bot Commands')
                .setDescription(
                    'Here is a list of all commands categorized by their functionality:'
                )
                .setTimestamp()
                .setFooter(embedFooter)

            // Add commands to the embed, categorized
            for (const [category, commands] of commandsByCategory.entries()) {
                let fieldValue = ''

                // Sort commands alphabetically within each category
                const sortedCommands = commands.sort((a, b) =>
                    a.name.localeCompare(b.name)
                )

                sortedCommands.forEach((cmd) => {
                    const cmdStr = `</${cmd.name}:${cmd.id}> - ${cmd.description}\n`

                    // Add command to field value, create new field if needed
                    if (fieldValue.length + cmdStr.length <= 1024) {
                        fieldValue += cmdStr
                    } else {
                        commandListEmbed.addFields({
                            name: `**${category}**`,
                            value: fieldValue,
                            inline: false,
                        })
                        fieldValue = cmdStr
                    }
                })

                // Add the last field for the category
                if (fieldValue.length > 0) {
                    commandListEmbed.addFields({
                        name: `**${category}**`,
                        value: fieldValue,
                        inline: false,
                    })
                }
            }

            // Create the main menu embed with a button
            const mainMenuEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('Welcome to Kiyo Bot Help 👋')
                .setDescription(
                    'Click the button below to view a list of all commands. You can also search for a specific command using `/help [search]`!'
                )
                .setThumbnail(interaction.client.user.avatarURL())
                .setTimestamp()
                .setFooter(embedFooter)

            // Create the button to show the command list
            const rowButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('show-command-list')
                    .setLabel('Command List')
                    .setStyle(ButtonStyle.Primary)
            )

            // Send the main menu embed with the button
            const reply = await interaction.editReply({
                embeds: [mainMenuEmbed],
                components: [rowButton],
            })

            // Create a collector to listen for button clicks
            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60_000 * 5, // 5 minutes
            })

            // Handle button click events
            collector.on('collect', async (i) => {
                // Ignore clicks from users other than the command author
                if (i.user.id !== interaction.user.id) {
                    return await i.reply({
                        content:
                            'You should run the command to use this interaction.',
                        ephemeral: true,
                    })
                }

                // Update the message with the command list embed
                if (i.customId === 'show-command-list') {
                    await i.update({
                        embeds: [commandListEmbed],
                        components: [], // Remove the button
                    })
                }
            })

            // Remove the button when the collector ends
            collector.on('end', () => {
                reply.edit({ components: [] })
            })
        } catch (error) {
            console.error('Error in help command:', error)
            await interaction.editReply({
                content: 'An error occurred while processing the help command.',
                ephemeral: true,
            })
        }
    },
}

// Function to create an embed for a list of commands
function createCommandListEmbed(commands, title, color) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setTimestamp()

    const fieldValueMaxLength = 1024
    let currentFieldValue = ''

    commands.forEach((cmd, index) => {
        const cmdStr = `> \`${index + 1}.\` </${cmd.name}:${cmd.id}> - ${cmd.description}\n`

        // Add command to field, create new field if exceeding length
        if (currentFieldValue.length + cmdStr.length <= fieldValueMaxLength) {
            currentFieldValue += cmdStr
        } else {
            embed.addFields({
                name: currentFieldValue.length > 0 ? '\u200B' : title,
                value: currentFieldValue,
            })
            currentFieldValue = cmdStr
        }
    })

    // Add the last field
    if (currentFieldValue.length > 0) {
        embed.addFields({
            name: '\u200B',
            value: currentFieldValue,
        })
    }

    return embed
}

// Function to search for commands by name or description
function getSearchResults(commandsByCategory, searchQuery) {
    return Array.from(commandsByCategory.values()).flatMap((commands) =>
        commands.filter(
            (cmd) =>
                cmd.name.toLowerCase().includes(searchQuery) ||
                cmd.description.toLowerCase().includes(searchQuery)
        )
    )
}

// Function to get commands organized by category from files
async function getCommandsByCategory(guild) {
    const guildCommands = await guild.commands.fetch()
    const commandsDirectory = path.join(__dirname, '..')
    const categoryFolders = fs
        .readdirSync(commandsDirectory)
        .filter((dir) =>
            fs.statSync(path.join(commandsDirectory, dir)).isDirectory()
        )

    const commandsByCategory = new Map()
    for (const category of categoryFolders) {
        commandsByCategory.set(category, [])

        const commandFiles = fs
            .readdirSync(path.join(commandsDirectory, category))
            .filter((file) => file.endsWith('.js'))

        for (const file of commandFiles) {
            const filePath = path.join(commandsDirectory, category, file)
            const command = require(filePath)
            commandsByCategory.get(category).push({
                id: guildCommands.find((c) => c.name === command.data.name).id,
                name: command.data.name,
                description: command.data.description,
                description_full: command.description_full,
                usage: command.usage,
                examples: command.examples,
            })
        }
    }

    return commandsByCategory
}
