const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js')
const ModerationLog = require('../../bot_utils/ModerationLog')

module.exports = {
    description_full:
        'Bans a member from the server with the specified reason.',
    usage: '/ban target:@user [reason:"ban reason"]',
    examples: [
        '/ban target:@user123',
        '/ban target:@user123 reason:"Severe rule violation"',
    ],
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Select a member and ban them.')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The member to ban')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('reason').setDescription('The reason for banning')
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers
        )
        .setDMPermission(false),

    async execute(interaction) {
        const targetUser = interaction.options.getMember('target')
        const reason =
            interaction.options.getString('reason') ?? 'No reason provided'

        // Defer the reply to allow time for the operation
        await interaction.deferReply()

        // Check if the target user exists
        if (!targetUser) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription('User not found')
                        .setColor('Red')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.displayAvatarURL()}`,
                        }),
                ],
            })
            return
        }

        // Check if the target user is the server owner
        if (targetUser.id === interaction.guild.ownerId) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'You cannot ban the owner of the server'
                        )
                        .setColor('Red')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.displayAvatarURL()}`,
                        }),
                ],
            })
            return
        }

        // Get role positions
        const targetUserRolePosition = targetUser.roles.highest.position
        const requestUserRolePosition =
            interaction.member.roles.highest.position
        const botRolePosition =
            interaction.guild.members.me.roles.highest.position

        // Check if the user trying to ban has a higher role than the target
        if (targetUserRolePosition >= requestUserRolePosition) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'You cannot ban someone with a higher or equal role than you'
                        )
                        .setColor('Red')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.displayAvatarURL()}`,
                        }),
                ],
            })
            return
        }

        // Check if the bot has a higher role than the target
        if (targetUserRolePosition >= botRolePosition) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'I cannot ban someone with a higher or equal role than myself'
                        )
                        .setColor('Red')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.displayAvatarURL()}`,
                        }),
                ],
            })
            return
        }

        // Attempt to ban the user
        try {
            const logEntry = new ModerationLog({
                action: 'ban',
                moderator: interaction.user.id,
                user: targetUser.id,
                reason: reason,
            })

            await logEntry.save()

            await targetUser.ban({ reason: reason })
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('BANNED!!!')
                        .setDescription(
                            `<@${targetUser.id}> has been banned for reason: \`${reason}\``
                        )
                        .setColor('Green')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.displayAvatarURL()}`,
                        }),
                ],
            })
        } catch (error) {
            console.error('Error banning user:', error)
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'An error occurred while trying to ban the user'
                        )
                        .setColor('Red')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.displayAvatarURL()}`,
                        }),
                ],
            })
        }
    },
}
