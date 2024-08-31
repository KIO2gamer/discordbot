const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    description_full:
        'Displays comprehensive information about the current Discord server, including its name, owner, creation date, member count, channels, roles, emojis, and more.',
    usage: '/serverinfo',
    examples: ['/serverinfo'],
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Get info about a server!'),

    async execute(interaction) {
        await sendServerInfo(interaction)
    },
}

async function sendServerInfo(interaction) {
    const { guild } = interaction

    const serverInfoEmbed = new EmbedBuilder()
        .setTitle('__Server Information__')
        .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
        .addFields(
            { name: '📋 Name', value: guild.name, inline: true },
            {
                name: '📝 Description',
                value: guild.description || 'No description',
                inline: false,
            },
            {
                name: '👑 Owner',
                value: `${(await guild.fetchOwner()).user.tag}`,
                inline: true,
            },
            { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
            {
                name: '📅 Created',
                value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
                inline: true,
            },
            {
                name: '📊 Channels',
                value: `Text: ${guild.channels.cache.filter((channel) => channel.type === 0).size}\nVoice: ${guild.channels.cache.filter((channel) => channel.type === 2).size}\nCategory: ${guild.channels.cache.filter((channel) => channel.type === 4).size}\nForums: ${guild.channels.cache.filter((channel) => channel.type === 15).size}`,
                inline: true,
            },
            {
                name: '👥 Members',
                value: `**Total: ${guild.memberCount}**\n<:list_round_extend:1252524348800110685> Online: ${guild.members.cache.filter((member) => member.presence?.status === 'online').size}\n<:list_round_extend:1252524348800110685> DND: ${guild.members.cache.filter((member) => member.presence?.status === 'dnd').size}\n<:list_round_extend:1252524348800110685> Idle: ${guild.members.cache.filter((member) => member.presence?.status === 'idle').size}\n<:list_end_round_extend:1252524478592716800> Offline: ${guild.members.cache.filter((member) => !member.presence || member.presence.status === 'offline').size}`,
                inline: true,
            },
            {
                name: '🎭 Roles',
                value: `${guild.roles.cache.size}`,
                inline: true,
            },
            {
                name: '😁 Emojis',
                value: `${guild.emojis.cache.size}`,
                inline: true,
            },
            {
                name: '🔰 Boost Level',
                value: `${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`,
                inline: true,
            },
            {
                name: '🛡️ Verification Level',
                value: getVerificationLevelText(guild.verificationLevel),
                inline: true,
            },
            {
                name: '⚙️ System Channel',
                value: `AFK: ${guild.afkChannel ? guild.afkChannel.name : 'None'}\nTimeout: ${guild.afkTimeout / 60}m\nSystem: ${guild.systemChannel ? guild.systemChannel.name : 'None'}`,
                inline: true,
            },
            {
                name: '🔒 MFA Level',
                value: getMfaLevelText(guild.mfaLevel),
                inline: true,
            },
            {
                name: '🌍 Locale',
                value: `${guild.preferredLocale}`,
                inline: true,
            },
            {
                name: '🔗 Vanity URL',
                value: guild.vanityURLCode || 'None',
                inline: true,
            }
        )
        .setColor(0x00ae86)
        .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })

    await interaction.reply({ embeds: [serverInfoEmbed] })
}

function getVerificationLevelText(level) {
    switch (level) {
        case 0:
            return 'None'
        case 1:
            return 'Low'
        case 2:
            return 'Medium'
        case 3:
            return 'High'
        case 4:
            return 'Very High'
        default:
            return 'Unknown'
    }
}

function getMfaLevelText(level) {
    return level === 0 ? 'None' : 'Elevated'
}
