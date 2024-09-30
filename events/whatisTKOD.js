const { Events } = require('discord.js')

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        let msg = message.content.toLowerCase()
        if (msg.includes('tkod') && !message.author.bot) {
            await message.channel.send('**T**he\n**K**IO2gamer\n**O**fficial\n**D**iscord')
            return
        }
    },
}