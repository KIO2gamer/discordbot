const { SlashCommandBuilder } = require('@discordjs/builders')
const { EmbedBuilder, PermissionsBitField } = require('discord.js')

module.exports = {
    description_full:
        'Provides detailed information about a specific role in the server, such as its ID, color, permissions, creation date, and the number of members who have it.',
    usage: '/roleinfo <role>',
    examples: ['/roleinfo @Member', '/roleinfo "Moderator"'],
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Provides information about a specific role')
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role to get information about')
                .setRequired(true)
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('role')

        const permissions = role.permissions.toArray().map((perm) => {
            const permName = Object.keys(PermissionsBitField.Flags).find(
                (key) => PermissionsBitField.Flags[key] === perm
            )
            return permName ? permName.replace(/_/g, ' ').toLowerCase() : perm
        })

        const embed = new EmbedBuilder()
            .setTitle(`Role Info: ${role.name}`)
            .addFields(
                { name: 'Role ID', value: role.id, inline: true },
                { name: 'Role Color', value: role.hexColor, inline: true },
                {
                    name: 'Role Permissions',
                    value:
                        permissions.length > 0
                            ? permissions.join('\n')
                            : 'No permissions',
                    inline: true,
                },
                {
                    name: 'Role Created At',
                    value: role.createdAt.toDateString(),
                    inline: true,
                },
                {
                    name: 'Number of Members with Role',
                    value: role.members.size.toString(),
                    inline: true,
                }
            )

        await interaction.reply({ embeds: [embed] })
    },
}
