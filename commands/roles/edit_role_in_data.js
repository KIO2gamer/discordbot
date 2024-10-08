const { SlashCommandBuilder } = require('discord.js')
const { handleError } = require('../../bot_utils/errorHandler.js')
const Role = require('../../bot_utils/roleStorage.js')

module.exports = {
    description_full:
        'Edits the name and/or color of a role stored in the database. Provide either the name, color, or both to update.',
    usage: '/edit_role_in_data <role:role> [name:new_name] [color:#hexcolor]',
    examples: [
        '/edit_role_in_data role:Moderators name:"Senior Moderators"',
        '/edit_role_in_data role:VIP color:#FFD700'
    ],
    data: new SlashCommandBuilder()
        .setName('edit_role_in_data')
        .setDescription('Edits a role in the database.')
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role to edit')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('The new name for the role')
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('color')
                .setDescription(
                    'The new color for the role in hex format (#000000)'
                )
                .setRequired(false)
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('role')
        const newName = interaction.options.getString('name')
        const newColor = interaction.options.getString('color')

        try {
            const sent = await interaction.deferReply({ ephemeral: true })

            // Check if role exists in the database
            const existingRole = await Role.findOne({ roleID: role.id })
            if (!existingRole) {
                return interaction.editReply(
                    `The role "${role.name}" was not found in the database!`
                )
            }

            // Update the role in the database
            if (newName) {
                existingRole.roleName = newName
            }
            if (newColor) {
                existingRole.roleColor = newColor.replace('#', '')
            }

            await existingRole.save()

            await interaction.editReply(
                `Role "${role.name}" has been updated in the database!`
            )
        } catch (error) {
            handleError(error, interaction)
        }
    }
}
