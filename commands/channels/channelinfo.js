const {
    SlashCommandBuilder,
    EmbedBuilder,
    ChannelType,
    PermissionsBitField
} = require('discord.js')
const { handleError } = require('../../bot_utils/errorHandler')
const { getChannelType } = require('../../bot_utils/channelTypes')

module.exports = {
    description_full:
        'Provides information about a specific channel, including its ID, type, creation date, topic, NSFW status, permissions, and category (if applicable).',
    usage: '/channelinfo <channel>',
    examples: [
        '/channelinfo #general',
        '/channelinfo 123456789012345678 (channel ID)'
    ],
    data: new SlashCommandBuilder()
        .setName('channelinfo')
        .setDescription('Provides information about a specific channel')
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to get information about')
                .setRequired(true)
        ),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel')

        try {
            const getPermissions = (channel, guild) => {
                const permissions = channel.permissionsFor(guild.roles.everyone)
                if (!permissions) return 'No permissions'

                const permsArray = permissions.toArray()

                return permsArray.length > 0
                    ? permsArray
                          .map(
                              (perm) =>
                                  Object.keys(PermissionsBitField.Flags)
                                      .find(
                                          (key) =>
                                              PermissionsBitField.Flags[key] ===
                                              perm
                                      )
                                      ?.replace(/_/g, ' ')
                                      .toLowerCase() || perm
                          )
                          .join(', ')
                    : 'No permissions'
            }

            const embed = new EmbedBuilder()
                .setTitle(`Channel Info: ${channel.name}`)
                .setColor(interaction.guild.members.me.displayHexColor)
                .setThumbnail(interaction.guild.iconURL())
                .addFields(
                    { name: 'ID', value: channel.id, inline: true },
                    {
                        name: 'Type',
                        value: getChannelType(channel),
                        inline: true
                    },
                    {
                        name: 'Created At',
                        value: `<t:${Math.floor(
                            channel.createdAt.getTime() / 1000
                        )}>`,
                        inline: true
                    },
                    {
                        name: 'Topic',
                        value: channel.topic || 'No topic set',
                        inline: false
                    },
                    {
                        name: 'NSFW',
                        value: channel.nsfw ? 'Yes' : 'No',
                        inline: true
                    },
                    {
                        name: 'Permissions',
                        value: getPermissions(channel, interaction.guild),
                        inline: false
                    }
                )
            if (channel.parent) {
                embed.addFields({
                    name: 'Category',
                    value: channel.parent.name,
                    inline: true
                })
            }

            await interaction.reply({ embeds: [embed] })
        } catch (error) {
            await handleError(interaction, error)
        }
    }
}
