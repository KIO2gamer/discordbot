const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // Cache for 5 minutes
const MOJANG_API_BASE = 'https://api.mojang.com/users/profiles/minecraft/';

module.exports = {
	description_full:
		'Retrieves information about a Minecraft player from the Mojang API, including their username, UUID, and a profile picture from Crafatar.',
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

		// Check Cache
		const cachedData = cache.get(username);
		if (cachedData) {
			await interaction.reply({ embeds: [cachedData] });
			return;
		}

		try {
			// 1. Get UUID from Mojang API
			const mojangResponse = await axios.get(`${MOJANG_API_BASE}${username}`);
			const mojangData = mojangResponse.data;

      if (mojangData && mojangData.id) {
        const uuid = mojangData.id;

				// 2. Create Embed with Crafatar URL
				const infoEmbed = new EmbedBuilder()
					.setColor('#0099ff')
					.setTitle(`Minecraft Player: ${mojangData.name}`)
					.setThumbnail(`https://crafatar.com/avatars/${uuid}?size=256`) // Crafatar URL
					.addFields(
						{ name: 'Username', value: mojangData.name, inline: true },
						{ name: 'UUID', value: uuid, inline: true }
					)
					.setTimestamp();

				// Cache the embed
				cache.set(username, infoEmbed);

				await interaction.reply({ embeds: [infoEmbed] });
			} else {
				await interaction.reply('Player not found on Mojang API.');
			}
		} catch (error) {
			console.error('Error fetching Minecraft player data:', error);
			await interaction.reply('An error occurred while fetching player information.');
		}
	},
};
