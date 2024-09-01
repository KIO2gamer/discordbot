const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all commands or info about a specific command')
        .addStringOption((option) =>
            option
                .setName('command')
                .setDescription('Specific command to get info about')
                .setRequired(false)
        ),

    async execute(interaction) {
        const commandName = interaction.options.getString('command')

        if (commandName) {
            return this.showCommandInfo(interaction, commandName)
        } else {
            return this.showAllCommands(interaction)
        }
    },

    async showCommandInfo(interaction, commandName) {
        const command = interaction.client.commands.get(commandName)

        if (!command) {
            return interaction.reply({
                content: 'That command does not exist.',
                ephemeral: true,
            })
        }

        const embed = new EmbedBuilder()
            .setTitle(`Command: ${command.data.name}`)
            .setDescription(
                command.description_full || 'No detailed description available.'
            )
            .addFields(
                {
                    name: 'Usage',
                    value: command.usage || 'No usage information available.',
                },
                {
                    name: 'Examples',
                    value: command.examples
                        ? command.examples.join('\n')
                        : 'No examples available.',
                }
            )
            .setColor('#0099ff')

        await interaction.reply({ embeds: [embed] })
    },

    async showAllCommands(interaction) {
        const commands = [...interaction.client.commands.values()]
        const itemsPerPage = 10
        const pages = Math.ceil(commands.length / itemsPerPage)

        let currentPage = 0

        const generateEmbed = (page) => {
            const start = page * itemsPerPage
            const end = start + itemsPerPage
            const currentCommands = commands.slice(start, end)

            return new EmbedBuilder()
                .setTitle('Available Commands')
                .setDescription(
                    currentCommands
                        .map((cmd) => `</${cmd.data.name}:${cmd.data.id}>`)
                        .join('\n')
                )
                .setFooter({ text: `Page ${page + 1} of ${pages}` })
                .setColor('#0099ff')
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
        )

        const initialMessage = await interaction.reply({
            embeds: [generateEmbed(currentPage)],
            components: [row],
            fetchReply: true,
        })

        const collector = initialMessage.createMessageComponentCollector({
            time: 60000,
        })

        collector.on('collect', async (i) => {
            if (i.customId === 'previous') {
                currentPage = currentPage > 0 ? --currentPage : pages - 1
            } else if (i.customId === 'next') {
                currentPage = currentPage + 1 < pages ? ++currentPage : 0
            }

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [row],
            })
        })

        collector.on('end', () => {
            initialMessage.edit({ components: [] })
        })
    },
}
