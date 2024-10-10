const { Events } = require('discord.js')
const TicketConfig = require('./../bot_utils/ticketConfig');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return

        if (interaction.customId === 'open-ticket') {
            try {
                // Fetch the ticket category ID from the database
                const config = await TicketConfig.findOne()
                const ticketCategoryId = config ? config.ticketCategoryId : null

                // Check if the category ID is set
                if (!ticketCategoryId) {
                    return interaction.reply({
                        content:
                            'A ticket category has not been set yet. Please use the `/set_ticket_category` command to set one.',
                        ephemeral: true,
                    })
                }

                // Create a new ticket channel
                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.id}`,
                    type: 0, // Text channel
                    parent: ticketCategoryId,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: ['ViewChannel'],
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                'ViewChannel',
                                'SendMessages',
                                'ReadMessageHistory',
                            ],
                        },
                        {
                            id: interaction.client.user.id,
                            allow: [
                                'ViewChannel',
                                'SendMessages',
                                'ReadMessageHistory',
                                'ManageChannels',
                            ],
                        },
                    ],
                })

                // Send a message to the ticket channel
                await ticketChannel.send(
                    `<@${interaction.user.id}>, your ticket has been created!`
                )

                // Send a message to the user
                await interaction.reply({
                    content: `Your ticket has been created in <#${ticketChannel.id}>.`,
                    ephemeral: true,
                })
            } catch (error) {
                console.error('Error creating ticket channel:', error)
                await interaction.reply({
                    content:
                        'There was an error creating your ticket. Please try again later.',
                    ephemeral: true,
                })
            }
        }
    },
}
