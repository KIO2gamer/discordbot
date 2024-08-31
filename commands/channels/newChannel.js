const {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
} = require('discord.js')

module.exports = {
    description_full:
        'This command creates a new channel in the server. You can specify the channel name, type (text, voice, category, announcement, or forum), the category it should be placed under (optional), and an optional topic or description.',
    usage: '/new_channel [name] [type] <category> <topic>',
    examples: [
        '/new_channel name:text_channel type:Text', // Creates a simple text channel named "text_channel"
        '/new_channel name:VIP Room type:Text category:Chat', // Creates a text channel named "VIP Room" under the "Chat" category
        '/new_channel name:News type:Announcement category:Main topic:Get all updates of the server!!!', // Creates an announcement channel with a topic
    ],
    data: new SlashCommandBuilder()
        .setName('new_channel')
        .setDescription('Creates a new channel.')
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('The name of the new channel')
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName('type')
                .setDescription('The type of channel to create')
                .setRequired(true)
                .addChoices(
                    { name: 'Text', value: 0 },
                    { name: 'Voice', value: 2 },
                    { name: 'Category', value: 4 },
                    { name: 'Announcement', value: 5 },
                    { name: 'Announcement', value: 5 },
                    { name: 'Forum', value: 15 }
                )
        )
        .addChannelOption((option) =>
            option
                .setName('category')
                .setDescription(
                    'The category to create the channel in (optional)'
                )
                .addChannelTypes(ChannelType.GuildCategory)
        )
        .addStringOption((option) =>
            option
                .setName('topic')
                .setDescription(
                    'The topic (description) for the channel (optional)'
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const name = interaction.options.getString('name')
        const type = interaction.options.getInteger('type')
        const category = interaction.options.getChannel('category')
        const topic = interaction.options.getString('topic')

        try {
            const newChannel = await interaction.guild.channels.create({
                name: name,
                type: type,
                parent: category,
                topic: topic,
            })

            let channelTypeName = ''
            if (newChannel.type === ChannelType.GuildCategory) {
                channelTypeName = 'Category'
            } else if (newChannel.type === ChannelType.GuildText) {
                channelTypeName = 'Text'
            } else if (newChannel.type === ChannelType.GuildVoice) {
                channelTypeName = 'Voice'
            } else if (newChannel.type === ChannelType.GuildAnnouncement) {
                channelTypeName = 'Announcement'
            } else if (newChannel.type === ChannelType.GuildStageVoice) {
                channelTypeName = 'Stage'
            } else if (newChannel.type === ChannelType.GuildForum) {
                channelTypeName = 'Forum'
            }

            const embed = new EmbedBuilder()
                .setTitle('Channel Created!')
                .setColor('Green')
                .setDescription(
                    `The ${channelTypeName} channel <#${newChannel.id}> has been successfully created.`
                )
                .setTimestamp()

            await interaction.reply({ embeds: [embed] })
        } catch (error) {
            console.log(error)
            console.error(`Error creating channel: ${error}`)
            await interaction.reply({
                content: 'An error occurred while creating the channel.',
                ephemeral: true,
            })
        }
    },
}
