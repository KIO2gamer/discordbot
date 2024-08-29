/**
 * Provides a slash command that displays information about a specific emoji on the server.
 * 
 * The command accepts a required string parameter 'emoji' which can be either the emoji's ID (a numeric string) or the emoji's name.
 * 
 * The command will reply with an embed that displays the following information about the emoji:
 * - Emoji name
 * - Emoji ID
 * - Emoji image URL
 * - Emoji creation date
 * - Whether the emoji is animated
 * - Whether the emoji is managed
 * 
 * If the provided 'emoji' parameter does not match a valid emoji on the server, the command will reply with an error message.
 */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
	description_full:
		"Shows details about a specific emoji from the server, including its name, ID, image URL, creation date, whether it's animated, and whether it's managed.",
	usage: '/emoji-info <emoji>',
	examples: ['/emoji-info [emoji_id]', '/emoji-info MyCustomEmoji'],
	data: new SlashCommandBuilder()
		.setName('emoji-info')
		.setDescription('Provides information about a specific emoji')
		.addStringOption(option =>
			option
				.setName('emoji')
				.setDescription('The emoji to get information about')
				.setRequired(true)
		),
	async execute(interaction) {
		const emojiInput = interaction.options.getString('emoji');
		let emoji;

		// Check if input is a valid emoji ID (numeric string)
		if (/^\d+$/.test(emojiInput)) {
			emoji = interaction.guild.emojis.cache.get(emojiInput);
		} else {
			// If not an ID, search by name
			emoji = interaction.guild.emojis.cache.find(e => e.name === emojiInput);
		}

		if (!emoji) {
			return interaction.reply('Emoji not found. Please use a valid emoji name or ID.');
		}

		const embed = new EmbedBuilder()
			.setTitle(`Emoji Info`)
			.setThumbnail(emoji.imageURL())
			.addFields(
				{ name: 'Emoji Name', value: emoji.name, inline: true },
				{ name: 'Emoji ID', value: emoji.id, inline: true },
				{ name: 'Emoji URL', value: emoji.imageURL(), inline: true },
				{ name: 'Emoji Created At', value: emoji.createdAt.toDateString(), inline: true },
				{ name: 'Emoji Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
				{ name: 'Emoji Managed', value: emoji.managed ? 'Yes' : 'No', inline: true }
			);

		await interaction.reply({ embeds: [embed] });
	},
};
