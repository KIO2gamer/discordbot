const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js')
const ms = require('ms')

module.exports = {
    description_full:
        'Timeouts a member for the specified duration and reason.',
    usage: '/timeout target:@user amount:"duration" [reason:"timeout reason"]',
    examples: [
        '/timeout target:@user123 amount:"1h"',
        '/timeout target:@user123 amount:"30m" reason:"Being disruptive"',
    ],
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Select a member and timeout them.')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The member to timeout')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('amount')
                .setDescription(
                    'The duration of the timeout (max 28 days) e.g. 1d | 2 weeks | 3hrs'
                )
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('reason').setDescription('The reason for timeout')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const targetUser = interaction.options.getMember('target')
        const reason =
            interaction.options.getString('reason') ?? 'No reason provided'
        const duration = interaction.options.getString('amount')
        const durationMs = ms(duration)

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
                            'You cannot timeout the owner of the server'
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
                            'You cannot timeout someone with a higher or equal role than you'
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
                            'I cannot timeout someone with a higher or equal role than myself'
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

        if (!durationMs || durationMs > ms('28d')) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            'Please provide a valid duration (max 28 days)'
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
            const currentTime = Date.now()
            const newTimeoutDuration =
                targetUser.communicationDisabledUntilTimestamp &&
                targetUser.communicationDisabledUntilTimestamp > currentTime
                    ? targetUser.communicationDisabledUntilTimestamp -
                      currentTime +
                      durationMs
                    : durationMs

            if (newTimeoutDuration <= 0) {
                await targetUser.timeout(null, reason) // Remove timeout if the new duration is less than or equal to zero
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Timeout Removed')
                            .setDescription(
                                `<@${targetUser.id}>'s timeout has been removed. Reason: \`${reason}\``
                            )
                            .setColor('Green')
                            .setFooter({
                                text: `Done by: ${interaction.user.username}`,
                                iconURL: `${interaction.user.avatarURL()}`,
                            }),
                    ],
                })
            } else if (newTimeoutDuration > ms('28d')) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('ERROR')
                            .setDescription(
                                'The total timeout duration exceeds the maximum limit of 28 days.'
                            )
                            .setColor('Red')
                            .setFooter({
                                text: `Done by: ${interaction.user.username}`,
                                iconURL: `${interaction.user.avatarURL()}`,
                            }),
                    ],
                })
            } else {
                const logEntry = new ModerationLog({
                    action: 'timeout',
                    duration: newTimeoutDuration,
                    moderator: moderator.id,
                    user: target.id,
                    reason: reason,
                })

                await logEntry.save()

                await targetUser.timeout(newTimeoutDuration, reason)
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('Timeout Updated')
                            .setDescription(
                                `<@${targetUser.id}>'s timeout has been updated. Reason: \`${reason}\`\nNew Duration: \`${ms(newTimeoutDuration, { long: true })}\``
                            )
                            .setColor('Green')
                            .setFooter({
                                text: `Done by: ${interaction.user.username}`,
                                iconURL: `${interaction.user.avatarURL()}`,
                            }),
                    ],
                })
            }
        } catch (error) {
            console.error('Failed to timeout user:', error)
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('ERROR')
                        .setDescription(
                            `An error occurred while trying to timeout the user\n\`${error.message}\``
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
