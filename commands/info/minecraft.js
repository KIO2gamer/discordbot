/**
 * Retrieves information about a Minecraft player, including their username, UUID, and skin.
 *
 * @param {string} username - The Minecraft username to look up.
 * @returns {Promise<void>} - Resolves when the player information has been sent as an embed message.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const MOJANG_API_BASE = 'https://api.mojang.com/users/profiles/minecraft/';

module.exports = {
	description_full:
		'Retrieves information about a Minecraft player, including their username, UUID, and skin.',
	usage: '/minecraft <username>',
	examples: ['/minecraft Notch', '/minecraft Dinnerbone'],
	data: new SlashCommandBuilder()
		.setName('minecraft')
		.setDescription('Gets info about a Minecraft player')
		.addStringOption(option =>
			option.setName('username').setDescription('The Minecraft username').setRequired(true)
		),
	async execute(interaction) {
		const username = interaction.options.getString('username');

		const cachedData = cache.get(username);
		if (cachedData) {
			await interaction.reply({ embeds: [cachedData] });
			return;
		}

		try {
			const mojangResponse = await axios.get(`${MOJANG_API_BASE}${username}`);
			const mojangData = mojangResponse.data;

			if (mojangData && mojangData.id) {
				const uuid = mojangData.id;

				const infoEmbed = new EmbedBuilder()
					.setColor('#00FF00')
					.setTitle(`Minecraft Player: ${mojangData.name}`)
					.setThumbnail(`https://crafatar.com/renders/body/${uuid}?overlay`)
					.addFields(
						{ name: '👤 Username', value: mojangData.name, inline: true },
						{ name: '🆔 UUID', value: uuid, inline: true },
						{
							name: '🎭 Skin',
							value: `[View Skin](https://crafatar.com/skins/${uuid})`,
							inline: true,
						},
						{
							name: '🔗 NameMC Profile',
							value: `[View on NameMC](https://namemc.com/profile/${uuid})`,
						}
					)
					.setFooter({ text: 'Data from Mojang API' })
					.setTimestamp();

				cache.set(username, infoEmbed);
				await interaction.reply({ embeds: [infoEmbed] });
			} else {
				await interaction.reply(`No player found with the username ${username}.`);
			}
		} catch (error) {
			console.error('Error fetching Minecraft player data:', error);
			await interaction.reply(
				'An error occurred while fetching player information. Please try again later.'
			);
		}
	},
};
