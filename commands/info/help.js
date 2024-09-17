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

const FIELD_VALUE_MAX_LENGTH = 1024

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
    data: commandData,
    async execute(interaction) {
        await interaction.deferReply()

        const { guild } = interaction
        const commandName = interaction.options
            .getString('command')
            ?.toLowerCase()
        const searchQuery = interaction.options
            .getString('search')
            ?.toLowerCase()

        const commandsByCategory = await getCommandsByCategory(guild)
        const allCommands = Array.from(commandsByCategory.values()).flat()

        const embedFooter = {
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        }

        if (commandName) {
            await handleCommandDetails(interaction, allCommands, embedFooter)
        } else if (searchQuery) {
            await handleCommandSearch(
                interaction,
                commandsByCategory,
                embedFooter
            )
        } else {
            await handleMainMenu(interaction, commandsByCategory, embedFooter)
        }
    },
}

async function handleCommandDetails(interaction, allCommands, embedFooter) {
    const commandName = interaction.options.getString('command')?.toLowerCase()
    const command = allCommands.find((cmd) => cmd.name === commandName)

    if (!command) {
        return await interaction.editReply({
            content: `No command found with the name "${commandName}"`,
            ephemeral: true,
        })
    }

    const usageField = {
        name: 'Usage:',
        value: command.usage ? `\`${command.usage}\`` : 'No specific usage.',
        inline: false,
    }
    const examplesField = {
        name: 'Examples:',
        value: command.examples
            ? command.examples.map((ex) => `\`${ex}\``).join('\n')
            : 'No examples provided.',
        inline: false,
    }

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

    if (usageField.value !== examplesField.value) {
        commandInfoEmbed.addFields(examplesField)
    }

    return await interaction.editReply({
        embeds: [commandInfoEmbed],
    })
}

async function handleCommandSearch(
    interaction,
    commandsByCategory,
    embedFooter
) {
    const searchQuery = interaction.options.getString('search')?.toLowerCase()
    const searchResults = getSearchResults(commandsByCategory, searchQuery)

    if (searchResults.length === 0) {
        return await interaction.editReply({
            content: `No commands found matching "${searchQuery}"`,
            ephemeral: true,
        })
    }

    const searchEmbed = createEmbedForCommands(
        searchResults,
        `🔍 Search Results for "${searchQuery}"`,
        '#f39c12'
    ).setFooter(embedFooter)

    return await interaction.editReply({ embeds: [searchEmbed] })
}

async function handleMainMenu(interaction, commandsByCategory, embedFooter) {
    const mainMenuEmbed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('Welcome to Kiyo Bot Help 👋')
        .setDescription(
            'Click the button below to view a list of all commands. You can also search for a specific command using `/help [search]`!'
        )
        .setThumbnail(interaction.client.user.avatarURL())
        .setTimestamp()
        .setFooter(embedFooter)

    const rowButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('show-command-list')
            .setLabel('Command List')
            .setStyle(ButtonStyle.Primary)
    )

    const reply = await interaction.editReply({
        embeds: [mainMenuEmbed],
        components: [rowButton],
    })

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000 * 5,
    })

    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            return await buttonInteraction.reply({
                content: 'You should run the command to use this interaction.',
                ephemeral: true,
            })
        }

        if (buttonInteraction.customId === 'show-command-list') {
            const embed = createEmbedForCommands(
                commandsByCategory,
                '📃 Command List',
                '#2ecc71'
            )
            await buttonInteraction.update({
                embeds: [embed],
                components: [],
            })
        }
    })

    collector.on('end', () => {
        reply.edit({ components: [] })
    })
}

function createEmbedForCommands(commandsByCategory, title, color) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setTimestamp()

    let description = ''
    for (const [category, commands] of commandsByCategory.entries()) {
        if (Array.isArray(commands)) {
            for (const cmd of commands) {
                description += `</${cmd.name}:${cmd.id}> `
                if (description.length > 2048) {
                    // Limit to 2048 characters per chunk
                    embed.addFields({
                        name: `**${category}**`,
                        value: description,
                    })
                    description = ''
                }
            }
        } else {
            const cmd = commands
            description += `</${cmd.name}:${cmd.id}> `
        }

        if (description.length > 0) {
            embed.setDescription(description)
            description = ''
        }
    }

    return embed
}

function getSearchResults(commandsByCategory, searchQuery) {
    return Array.from(commandsByCategory.values()).flatMap((commands) =>
        commands.filter(
            (cmd) =>
                cmd.name.toLowerCase().includes(searchQuery) ||
                cmd.description.toLowerCase().includes(searchQuery)
        )
    )
}

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
