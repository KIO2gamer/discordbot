const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require('discord.js')
const ModerationLog = require('../../bot_utils/ModerationLog')
const { getColor } = require('../../bot_utils/colors')

function createErrorEmbed(title, description, interaction) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(getColor(Critical))
        .setFooter({
            text: `Done by: ${interaction.user.username}`,
            iconURL: `${interaction.user.avatarURL()}`,
        })
}

function checkRolePermissions(interaction, targetUser) {
    const targetRolePosition = targetUser.roles.highest.position
    const requestUserRolePosition = interaction.member.roles.highest.position
    const botRolePosition = interaction.guild.members.me.roles.highest.position

    if (targetRolePosition >= requestUserRolePosition) {
        return 'You cannot warn someone with a higher or equal role than you'
    }

    if (targetRolePosition >= botRolePosition) {
        return 'I cannot warn someone with a higher or equal role than myself'
    }

    return null
}

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
        await interaction.deferReply().catch(console.error)

        const targetUser = interaction.options.getMember('target')
        const reason =
            interaction.options.getString('reason') ?? 'No reason provided'

        if (!targetUser) {
            await interaction.editReply({
                embeds: [
                    createErrorEmbed('ERROR', 'User not found', interaction),
                ],
            })
            return
        }

        if (targetUser.id === interaction.guild.ownerId) {
            await interaction.editReply({
                embeds: [
                    createErrorEmbed(
                        'ERROR',
                        'You cannot warn the owner of the server',
                        interaction
                    ),
                ],
            })
            return
        }

        const roleError = checkRolePermissions(interaction, targetUser)
        if (roleError) {
            await interaction.editReply({
                embeds: [createErrorEmbed('ERROR', roleError, interaction)],
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
                        .setColor(getColor(Warning))
                        .setFooter({
                            text: `Done by: ${interaction.user.username}`,
                            iconURL: `${interaction.user.avatarURL()}`,
                        }),
                ],
            })
        } catch (error) {
            console.error(
                'An error occurred while trying to warn the user:',
                error
            )
            await interaction.editReply({
                embeds: [
                    createErrorEmbed(
                        'ERROR',
                        'An error occurred while trying to warn the user',
                        interaction
                    ),
                ],
            })
        }
    },
}
