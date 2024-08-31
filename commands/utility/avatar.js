const {
    SlashCommandBuilder,
    EmbedBuilder,
    ApplicationCommandOptionType,
} = require('discord.js')

module.exports = {
    description_full:
        "Displays the user's avatar (profile picture). You can get the avatar of another user by mentioning them.  Customize the size and format (PNG, JPEG, WebP) of the avatar.",
    usage: '/avatar [target:user] [size:pixels] [format:png/jpg/webp]',
    examples: ['/avatar', '/avatar target:@username size:1024 format:png'],
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get the avatar of the user.')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription("The user's avatar to show")
                .setRequired(false)
        )
        .addIntegerOption((option) =>
            option
                .setName('size')
                .setDescription('The size of the avatar (in pixels)')
                .setRequired(false)
                .addChoices(
                    { name: '16', value: 16 },
                    { name: '32', value: 32 },
                    { name: '64', value: 64 },
                    { name: '128', value: 128 },
                    { name: '256', value: 256 },
                    { name: '512', value: 512 },
                    { name: '1024', value: 1024 },
                    { name: '2048', value: 2048 },
                    { name: '4096', value: 4096 }
                )
        )
        .addStringOption((option) =>
            option
                .setName('format')
                .setDescription('The format of the avatar')
                .setRequired(false)
                .addChoices(
                    { name: 'PNG', value: 'png' },
                    { name: 'JPEG', value: 'jpg' },
                    { name: 'WebP', value: 'webp' }
                    // Only allow GIF if the user has a GIF avatar
                )
        ),

    async execute(interaction) {
        const userTarget =
            interaction.options.getUser('target') || interaction.user
        const size = interaction.options.getInteger('size') || 512
        const format = interaction.options.getString('format') || 'webp'

        // Check if the user has a GIF avatar before allowing GIF format
        const availableFormats = ['png', 'jpg', 'webp']
        if (userTarget.avatar?.startsWith('a_')) {
            availableFormats.push('gif')
        }

        // Validate the selected format
        const validFormat = availableFormats.includes(format) ? format : 'webp'

        const avatarURL = userTarget.displayAvatarURL({
            format: validFormat,
            dynamic: true,
            size: size,
        })

        const embed = new EmbedBuilder()
            .setTitle(`${userTarget.username}'s Avatar`)
            .setImage(avatarURL)
            .setURL(avatarURL)
            .setFooter({
                text: `Requested by ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })

        await interaction.reply({ embeds: [embed] })
    },
}
