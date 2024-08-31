const { SlashCommandBuilder, PermissionsBitField } = require('discord.js')

// Define grouped permissions
const permissionGroups = [
    {
        name: 'admin',
        description: 'Administrator permissions (includes manage everything)',
        flags: [PermissionsBitField.Flags.Administrator],
    },
    {
        name: 'manage',
        description:
            'Management permissions (channels, roles, guild, webhooks)',
        flags: [
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ManageRoles,
            PermissionsBitField.Flags.ManageGuild,
            PermissionsBitField.Flags.ManageWebhooks,
        ],
    },
    {
        name: 'messages',
        description: 'Message permissions (send, manage, embed, reactions)',
        flags: [
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AddReactions,
        ],
    },
    {
        name: 'voice',
        description: 'Voice permissions (connect, speak, mute, deafen, move)',
        flags: [
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
            PermissionsBitField.Flags.MuteMembers,
            PermissionsBitField.Flags.DeafenMembers,
            PermissionsBitField.Flags.MoveMembers,
        ],
    },
    {
        name: 'misc',
        description:
            'Miscellaneous permissions (nickname, audit log, insights)',
        flags: [
            PermissionsBitField.Flags.ChangeNickname,
            PermissionsBitField.Flags.ViewAuditLog,
            PermissionsBitField.Flags.ViewGuildInsights,
        ],
    },
]

const commandBuilder = new SlashCommandBuilder()
    .setName('createrole')
    .setDescription('Creates a new role')
    .addStringOption((option) =>
        option
            .setName('name')
            .setDescription('The name of the role')
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName('color')
            .setDescription('The color of the role')
            .setRequired(false)
    )
    .addBooleanOption((option) =>
        option
            .setName('hoist')
            .setDescription('Display role members separately')
            .setRequired(false)
    )
    .addBooleanOption((option) =>
        option
            .setName('mentionable')
            .setDescription('Allow the role to be mentionable')
            .setRequired(false)
    )

// Add grouped permission options dynamically
permissionGroups.forEach((group) => {
    commandBuilder.addBooleanOption((option) =>
        option
            .setName(group.name)
            .setDescription(group.description)
            .setRequired(false)
    )
})

module.exports = {
    description_full:
        'Creates a new role with the specified name and optional color, hoist, mentionable settings, and a selection of permission groups. Available permission groups are: admin, manage, messages, voice, misc. Set a permission group to true to grant those permissions to the role.',
    usage: '/createrole <name:role_name> [color:#hexcolor] [hoist:true/false] [mentionable:true/false] [admin:true/false] ... [misc:true/false]',
    examples: [
        '/createrole name:CoolKids color:#FF69B4 hoist:true',
        '/createrole name:Moderators manage:true messages:true',
    ],
    data: commandBuilder,

    async execute(interaction) {
        const name = interaction.options.getString('name')
        const color = interaction.options.getString('color')
        const hoist = interaction.options.getBoolean('hoist')
        const mentionable = interaction.options.getBoolean('mentionable')

        const permissions = new PermissionsBitField()

        // Dynamically assign permissions based on grouped options
        permissionGroups.forEach((group) => {
            if (interaction.options.getBoolean(group.name)) {
                group.flags.forEach((flag) => permissions.add(flag))
            }
        })

        const role = await interaction.guild.roles.create({
            name: name,
            color: color || null,
            hoist: hoist || false,
            mentionable: mentionable || false,
            permissions: permissions,
        })

        return interaction.reply(`Created new role: ${role}`)
    },
}
