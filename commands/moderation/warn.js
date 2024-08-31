const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require('discord.js')
const ModerationLog = require('../../bot_utils/ModerationLog')

module.exports = {
    description_full: 'Warns a member with the specified reason.',
    usage: '/warn target:@user [reason:"warning reason"]',
    examples: [
        '/warn target:@user123',
        '/warn target:@user123 reason:"Spamming in chat"',
    ],
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member.')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The member to warn')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('The reason for the warning')
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getMember('target')
        const reason =
            interaction.options.getString('reason') ?? 'No reason provided'
        await interaction.deferReply()

        if (!targetUser) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription('User not found')
                        .setColor('Red')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.avatarURL()}`,
                        }),
                ],
            })
            return
        }

        if (targetUser.id === interaction.guild.ownerId) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'You cannot warn the owner of the server'
                        )
                        .setColor('Red')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.avatarURL()}`,
                        }),
                ],
            })
            return
        }

        const targetUserRolePosition = targetUser.roles.highest.position
        const requestUserRolePosition =
            interaction.member.roles.highest.position
        const botRolePosition =
            interaction.guild.members.me.roles.highest.position

        if (targetUserRolePosition >= requestUserRolePosition) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'You cannot warn someone with a higher or equal role than you'
                        )
                        .setColor('Red')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.avatarURL()}`,
                        }),
                ],
            })
            return
        }

        if (targetUserRolePosition >= botRolePosition) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'I cannot warn someone with a higher or equal role than myself'
                        )
                        .setColor('Red')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.avatarURL()}`,
                        }),
                ],
            })
            return
        }

        try {
            const logEntry = new ModerationLog({
                action: 'warn',
                moderator: interaction.user.id,
                user: targetUser.id,
                reason: reason,
            })

            await logEntry.save()

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('WARNED!!!')
                        .setDescription(
                            `<@${targetUser.id}> has been warned for reason: \`${reason}\``
                        )
                        .setColor('Yellow')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.avatarURL()}`,
                        }),
                ],
            })
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'An error occurred while trying to warn the user'
                        )
                        .setColor('Red')
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.avatarURL()}`,
                        }),
                ],
            })
        }
    },
}
