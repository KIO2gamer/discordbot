const channelTypes = {
    0: 'Text',
    2: 'Voice',
    4: 'Category',
    5: 'Announcement',
    10: 'News Thread',
    11: 'Public Thread',
    12: 'Private Thread',
    13: 'Stage',
    15: 'Forum',
}

/**
 * Returns the human-readable name for the given Discord channel type.
 *
 * @param {Object} channel - The Discord channel object.
 * @returns {string} The human-readable name for the channel type, or 'Unknown' if the type is not recognized.
 */
function getChannelType(channel) {
    return channelTypes[channel.type] || 'Unknown'
}

module.exports = {
    getChannelType,
    channelTypes
}
