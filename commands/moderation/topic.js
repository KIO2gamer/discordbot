const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')

module.exports = {
    description_full:
        'Sends a message to the specified users, requesting them to change the current topic.',
    usage: '/topic [user1:@user] [user2:@user] [user3:@user]',
    examples: [
        '/topic user1:@user123',
        '/topic user1:@user123 user2:@user456 user3:@user789',
    ],
    data: new SlashCommandBuilder()
        .setName('topic')
        .setDescription('Sends a message about changing the topic.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers |
                PermissionFlagsBits.KickMembers |
                PermissionFlagsBits.ManageChannels
        )
        .addUserOption((option) =>
            option
                .setName('user1')
                .setDescription('The first user to change the topic of.')
                .setRequired(false)
        )
        .addUserOption((option) =>
            option
                .setName('user2')
                .setDescription('The second user to change the topic of.')
                .setRequired(false)
        )
        .addUserOption((option) =>
            option
                .setName('user3')
                .setDescription('The third user to change the topic of.')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user1 = interaction.options.getUser('user1')
        const user2 = interaction.options.getUser('user2')
        const user3 = interaction.options.getUser('user3')

        // Build the user mentions string
        let userMentions = ''
        if (user1) userMentions += `${user1}\n`
        if (user2) userMentions += `${user2}\n`
        if (user3) userMentions += `${user3}\n`

        if (!userMentions) {
            return interaction.reply({
                content:
                    'No users provided. Please specify at least one user to change the topic.',
                ephemeral: true,
            })
        }

        await interaction.reply({
            content: 'Topic change message sent.',
            ephemeral: true,
        })
        await interaction.channel.send(
            `${userMentions}\n**Please change the topic immediately. Failing to do so will result in a mute/ban.**`
        )
    },
}
