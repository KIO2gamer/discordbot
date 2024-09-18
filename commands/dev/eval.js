const { SlashCommandBuilder } = require('discord.js')

// **VERY IMPORTANT SECURITY WARNING:**
// Using `eval` in a Discord bot is extremely dangerous! It allows anyone
// with access to the command to execute arbitrary code on your server.
// This can lead to severe security vulnerabilities, including data theft,
// server compromise, and more.

// Only enable this command for testing in a controlled environment
// and NEVER in a production bot.

const allowedRoles = ['938469752882479166']
const allowedUsers = ['764513584125444146']

module.exports = {
    description_full:
        'Evaluates provided JavaScript code. WARNING: This command is extremely dangerous and should only be used for debugging in a controlled environment. Never use it in a production bot.',
    usage: '/eval <code>',
    examples: ['/eval 2 + 2', '/eval interaction.guild.name'],
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluates JavaScript code.')
        .addStringOption((option) =>
            option
                .setName('code')
                .setDescription('The code to evaluate')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Check if the user has permission to use this command
        if (
            !allowedUsers.includes(interaction.user.id) &&
            !interaction.member.roles.cache.some((role) =>
                allowedRoles.includes(role.id)
            )
        ) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true,
            })
        }

        const code = interaction.options.getString('code')
        try {
            const result = eval(code)
            let output = result
            if (typeof result !== 'string') {
                output = require('util').inspect(result)
            }
            await interaction.reply(`\`\`\`js\n${output}\n\`\`\``)
        } catch (error) {
            await interaction.reply(`\`\`\`js\n${error}\n\`\`\``)
        }
    },
}
