const { EmbedBuilder, SlashCommandBuilder } = require('discord.js')
const cooldowns = new Map()

module.exports = {
    description_full:
        'Summons a user from the realm of the undead (with a 5-minute cooldown).',
    usage: '/summon <user>',
    examples: ['/summon @username', '/summon 123456789012345678 (user ID)'],
    data: new SlashCommandBuilder()
        .setName('summon')
        .setDescription('Summons the user from the undead')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to summon')
                .setRequired(true)
        ),

    async execute(interaction) {
        const cooldownAmount = 5 * 60 * 1000 // 5 minutes
        const now = Date.now()
        const timestamps = cooldowns.get(interaction.user.id)

        if (timestamps && now < timestamps + cooldownAmount) {
            const timeLeft = (timestamps + cooldownAmount - now) / 1000
            return interaction.reply(
                `Please wait ${timeLeft.toFixed(1)} more seconds before using the \`summon\` command again.`
            )
        }

        const userOption = interaction.options.getUser('user')
        const userId = userOption.id

        if (!userOption) {
            return interaction.reply('You need to mention a user to summon!')
        }

        const embed = new EmbedBuilder()
            .setTitle('Summon Successful')
            .setDescription(`Summoned <@${userId}> from the undead.`)
            .setColor('#00ff00')
            .setFooter({
                text: `Executed by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp()

        try {
            await interaction.channel.send({
                content: `https://tenor.com/view/cat-spiritus-summon-vintage-fountain-pen-gif-22872604`,
            })
            await interaction.channel.send({ embeds: [embed] })
            cooldowns.set(interaction.user.id, now)
            console.log(
                `${interaction.user.tag} summoned ${userOption.tag} at ${new Date(now).toISOString()}`
            )
        } catch (error) {
            console.error('Error executing summon command:', error)
            interaction.reply(
                'There was an error while executing this command.'
            )
        }
    },
}
