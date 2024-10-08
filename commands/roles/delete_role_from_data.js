const { SlashCommandBuilder } = require('discord.js')
const { handleError } = require('../../bot_utils/errorHandler.js')
const Role = require('../../bot_utils/roleStorage.js')

module.exports = {
    description_full: 'Removes a role from the database.',
    usage: '/delete_role_from_data <role:role>',
    examples: ['/delete_role_from_data role:Guests'],
    data: new SlashCommandBuilder()
        .setName('delete_role_from_data')
        .setDescription('Deletes a role from the database.')
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role to delete')
                .setRequired(true)
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('role')

        try {
            const sent = await interaction.deferReply({ ephemeral: true })

            // Check if role exists in the database
            const existingRole = await Role.findOne({ roleID: role.id })
            if (!existingRole) {
                return interaction.editReply(
                    `The role "${role.name}" was not found in the database!`
                )
            }

            // Delete the role from the database
            await Role.deleteOne({ roleID: role.id })

            await interaction.editReply(`Role "${role.name}" has been deleted from the database!`)
        } catch (error) {
            handleError(error, interaction)
        }
    },
}
