const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    description_full: 'Assigns the specified role to the specified user.',
    usage: '/give_role <target:user> <role:role>',
    examples: ['/give_role target:@username role:VIP'],
    data: new SlashCommandBuilder()
        .setName('give_role')
        .setDescription('Gives a role to a user')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The user to assign the role to')
                .setRequired(true)
        )
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role to assign')
                .setRequired(true)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('target')
        const role = interaction.options.getRole('role')
        const member = await interaction.guild.members.fetch(target.id)

        if (member.roles.cache.has(role.id)) {
            return interaction.reply(`${target} already has the ${role} role.`)
        }

        await member.roles.add(role)
        return interaction.reply(`${target} has been given the ${role} role.`)
    },
}
