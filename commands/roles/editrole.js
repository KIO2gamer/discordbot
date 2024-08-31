const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')

module.exports = {
    description_full:
        'Edits the properties (name, color, hoist, mentionable) of an existing role. Requires the "Manage Roles" permission.',
    usage: '/editrole <role:role> [name:new_name] [color:#hexcolor] [hoist:true/false] [mentionable:true/false]',
    examples: [
        '/editrole role:Members name:NewMembers color:#00FF00',
        '/editrole role:Announcements hoist:true',
    ],
    data: new SlashCommandBuilder()
        .setName('editrole')
        .setDescription("Edits a role's properties.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role to edit')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('name').setDescription('The new name for the role')
        )
        .addStringOption((option) =>
            option
                .setName('color')
                .setDescription(
                    'The new color for the role in hex format (#000000)'
                )
        )
        .addBooleanOption((option) =>
            option
                .setName('hoist')
                .setDescription(
                    'Whether the role should be displayed separately'
                )
        )
        .addBooleanOption((option) =>
            option
                .setName('mentionable')
                .setDescription('Whether the role should be mentionable')
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('role')
        const newName = interaction.options.getString('name')
        const newColor = interaction.options.getString('color')
        const hoist = interaction.options.getBoolean('hoist')
        const mentionable = interaction.options.getBoolean('mentionable')

        try {
            await role.edit({
                name: newName || role.name,
                color: newColor || role.color,
                hoist: hoist !== undefined ? hoist : role.hoist,
                mentionable:
                    mentionable !== undefined ? mentionable : role.mentionable,
            })

            return interaction.reply(`Role ${role} updated successfully!`)
        } catch (error) {
            console.error('Error editing role:', error)
            return interaction.reply(
                'An error occurred while updating the role.'
            )
        }
    },
}
