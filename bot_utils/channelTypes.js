const { ChannelType } = require('discord.js')

/**
 * Gets the channel type as a string.
 *
 * @param {import('discord.js').Channel} channel - The Discord channel object.
 * @returns {string} - The channel type as a string.
 */
function getChannelType(channel) {
    const channelTypes = {
        [ChannelType.GuildText]: 'Text',
        [ChannelType.GuildVoice]: 'Voice',
        [ChannelType.GuildCategory]: 'Category',
        [ChannelType.GuildAnnouncement]: 'Announcement',
        [ChannelType.AnnouncementThread]: 'News Thread',
        [ChannelType.PublicThread]: 'Public Thread',
        [ChannelType.PrivateThread]: 'Private Thread',
        [ChannelType.GuildStageVoice]: 'Stage',
        [ChannelType.GuildForum]: 'Forum',
    }

    return channelTypes[channel.type] || 'Unknown'
}

module.exports = {
    getChannelType,
}
