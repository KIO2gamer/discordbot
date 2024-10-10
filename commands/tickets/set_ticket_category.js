const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js')
const mongoose = require('mongoose')

// Define the schema for the ticket configuration
const TicketConfigSchema = new mongoose.Schema({
    guildId: String,
    ticketCategoryId: String
})

// Create the model
const TicketConfig = mongoose.model('TicketConfig', TicketConfigSchema)

module.exports = {
    description_full:
        'Sets the category where new ticket channels will be created. Requires the "Administrator" permission.',
    usage: '/set_ticket_category <category:category>',
    examples: ['/set_ticket_category category:Tickets'],
    data: new SlashCommandBuilder()
        .setName('set_ticket_category')
        .setDescription('Sets the category where tickets will be created.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption((option) =>
            option
                .setName('category')
                .setDescription('The category to use for new tickets.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildCategory)
        ),
    async execute(interaction) {
        const category = interaction.options.getChannel('category')
        const guildId = interaction.guild.id

        try {
            // Find and update the document, or create a new one if it doesn't exist
            await TicketConfig.findOneAndUpdate(
                { guildId: guildId },
                { ticketCategoryId: category.id },
                { upsert: true, new: true }
            )

            await interaction.reply(`Ticket category set to: ${category}`)
        } catch (error) {
            console.error('Error updating ticket category:', error)
            await interaction.reply('An error occurred while setting the ticket category.')
        }
    },
}