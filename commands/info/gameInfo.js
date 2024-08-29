const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gameinfo')
		.setDescription('Fetches detailed information about a video game')
		.addStringOption(option =>
			option.setName('search').setDescription('Name of the game').setRequired(true)
		),

	async execute(interaction) {
		await interaction.deferReply();
		const gameName = interaction.options.getString('search');

		try {
			const response = await axios.get(`https://www.giantbomb.com/api/search/?api_key=${process.env.GIANT_BOMB_API_KEY}&format=json&query=${encodeURIComponent(gameName)}&resources=game&limit=1`);
			const game = response.data.results[0];

			if (!game) {
				return interaction.editReply('No game found with that name.');
			}

			const embed = new EmbedBuilder()
				.setColor('#0099ff')
				.setTitle(game.name)
				.setDescription(game.deck || 'No description available')
				.setThumbnail(game.image.small_url)
				.addFields(
					{ name: 'Release Date', value: game.original_release_date || 'Unknown', inline: true },
					{ name: 'Platforms', value: game.platforms ? game.platforms.map(p => p.name).join(', ') : 'N/A', inline: true },
					{ name: 'Genres', value: game.genres ? game.genres.map(g => g.name).join(', ') : 'N/A', inline: true },
					{ name: 'Developers', value: game.developers ? game.developers.map(d => d.name).join(', ') : 'N/A' },
					{ name: 'Publishers', value: game.publishers ? game.publishers.map(p => p.name).join(', ') : 'N/A' },
					{ name: 'Rating', value: game.original_game_rating ? game.original_game_rating.map(r => r.name).join(', ') : 'No rating available' },
				)
				.setFooter({ text: `Data provided by Giant Bomb | Game ID: ${game.id}` });

			const row = new ActionRowBuilder()
				.addComponents(
					new ButtonBuilder()
						.setLabel('View on Giant Bomb')
						.setStyle(ButtonStyle.Link)
						.setURL(game.site_detail_url),
				);

			await interaction.editReply({ embeds: [embed], components: [row] });

		} catch (error) {
			console.error(error);
			await interaction.editReply('An error occurred while fetching game info.');
		}
	},
};