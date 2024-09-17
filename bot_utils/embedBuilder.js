const { EmbedBuilder } = require('discord.js')

/**
 * Builds a standardized Discord embed with common properties.
 *
 * @param {Object} options - The options for the embed.
 * @param {string} options.title - The title of the embed.
 * @param {string} options.description - The description of the embed.
 * @param {string} options.color - The color of the embed (hex code or a named color).
 * @param {Object} [options.author] - The author information for the embed.
 * @param {string} options.author.name - The name of the author.
 * @param {string} [options.author.iconURL] - The URL of the author's icon.
 * @param {Object} [options.footer] - The footer information for the embed.
 * @param {string} options.footer.text - The text of the footer.
 * @param {string} [options.footer.iconURL] - The URL of the footer's icon.
 * @param {Object} [options.thumbnail] - The thumbnail information for the embed.
 * @param {string} options.thumbnail.url - The URL of the thumbnail image.
 * @param {Object} [options.fields] - The fields to be added to the embed.
 * @param {string} options.fields.name - The name of the field.
 * @param {string} options.fields.value - The value of the field.
 * @param {boolean} [options.fields.inline] - Whether the field should be inline.
 * @returns {import('discord.js').EmbedBuilder} - The built Discord embed.
 */
function buildEmbed({
    title,
    description,
    color,
    author,
    footer,
    thumbnail,
    fields,
}) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)

    if (author) {
        embed.setAuthor({
            name: author.name,
            iconURL: author.iconURL,
        })
    }

    if (footer) {
        embed.setFooter({
            text: footer.text,
            iconURL: footer.iconURL,
        })
    }

    if (thumbnail) {
        embed.setThumbnail(thumbnail.url)
    }

    if (fields) {
        fields.forEach((field) => {
            embed.addFields({
                name: field.name,
                value: field.value,
                inline: field.inline || false,
            })
        })
    }

    return embed
}

module.exports = {
    buildEmbed,
}
