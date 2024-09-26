const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js')
const fs = require('fs')
const path = require('path')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with bot commands')
        .addStringOption((option) =>
            option
                .setName('command')
                .setDescription('Get info about a specific command')
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('search')
                .setDescription('Search for commands')
                .setRequired(false)
        ),

    async execute(interaction) {
        const commandName = interaction.options.getString('command')
        const searchQuery = interaction.options.getString('search')

        if (commandName) {
            return await showCommandInfo(interaction, commandName)
        } else if (searchQuery) {
            return await searchCommands(interaction, searchQuery)
        } else {
            return await showCommandCategories(interaction)
        }
    }
}

async function showCommandCategories(interaction) {
    const categories = fs
        .readdirSync('./commands')
        .filter((file) =>
            fs.statSync(path.join('./commands', file)).isDirectory()
        )

    const embed = new EmbedBuilder()
        .setTitle('All Commands')
        .setColor('#0099ff')

    for (const category of categories) {
        const categoryCommands = fs
            .readdirSync(`./commands/${category}`)
            .filter((file) => file.endsWith('.js'))

        const commandList = categoryCommands
            .map((command) => `\`/${command.slice(0, -3)}\``)
            .join(', ')

        embed.addFields({
            name: category.charAt(0).toUpperCase() + category.slice(1),
            value: commandList || 'No commands in this category',
            inline: false
        })
    }

    await interaction.reply({ embeds: [embed] })
}

async function showCommandInfo(interaction, commandName) {
    const command = interaction.client.commands.get(commandName)

    if (!command) {
        return interaction.reply({
            content: 'That command does not exist.',
            ephemeral: true
        })
    }

    const embed = new EmbedBuilder()
        .setTitle(`Command: ${command.data.name}`)
        .setDescription(
            command.data.description_full || command.data.description
        )
        .setColor('#0099ff')

    if (command.data.usage) {
        embed.addFields({ name: 'Usage', value: command.data.usage })
    }

    if (command.data.examples && command.data.examples !== command.data.usage) {
        embed.addFields({ name: 'Examples', value: command.data.examples })
    }

    return interaction.reply({ embeds: [embed] })
}

async function searchCommands(interaction, searchQuery) {
    const commands = interaction.client.commands
    const results = commands.filter(
        (cmd) =>
            cmd.data.name.includes(searchQuery) ||
            cmd.data.description.includes(searchQuery) ||
            (cmd.data.description_full &&
                cmd.data.description_full.includes(searchQuery))
    )

    if (results.size === 0) {
        return interaction.reply({
            content: 'No commands found matching your search.',
            ephemeral: true
        })
    }

    const embed = new EmbedBuilder()
        .setTitle(`Search Results for "${searchQuery}"`)
        .setDescription(
            results
                .map((cmd) => `\`/${cmd.data.name}\` - ${cmd.data.description}`)
                .join('\n')
        )
        .setColor('#0099ff')

    return interaction.reply({ embeds: [embed] })
}
