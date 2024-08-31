const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    description_full: 'Deletes the specified role from the server.',
    usage: '/deleterole <role:role>',
    examples: ['/deleterole role:Members'],
    data: new SlashCommandBuilder()
        .setName('deleterole')
        .setDescription('Deletes an existing role')
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role to delete')
                .setRequired(true)
        ),

    async execute(interaction) {
        const role = interaction.options.getRole('role')
        await role.delete()
        return interaction.reply(`Deleted role: ${role.name}`)
    },
}
