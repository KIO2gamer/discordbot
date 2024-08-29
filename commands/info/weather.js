/**
 * Fetches and displays the current weather for a given city using the WeatherAPI.
 * Information includes temperature, feels like temperature, humidity, wind, pressure, UV index, and more.
 *
 * @param {string} city - The city to get the weather for.
 * @returns {Promise<void>} - Resolves when the weather information has been displayed.
 */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
	description_full:
		'Fetches and displays the current weather for a given city using the WeatherAPI. Information includes temperature, feels like temperature, humidity, wind, pressure, UV index, and more.',
	usage: '/weather <city>',
	examples: ['/weather London', '/weather "New York"'],
	data: new SlashCommandBuilder()
		.setName('weather')
		.setDescription('Gets the current weather for a specified city')
		.addStringOption(option =>
			option
				.setName('city')
				.setDescription('The city you want to get the weather for')
				.setRequired(true)
		),

	async execute(interaction) {
		const city = interaction.options.getString('city');
		const apiKey = process.env.WEATHER_API_KEY; // Replace with your WeatherAPI key

		try {
			const response = await axios.get(`https://api.weatherapi.com/v1/current.json`, {
				params: {
					key: apiKey,
					q: city,
				},
			});

			const weather = response.data;
			const {
				temp_c,
				temp_f,
				feelslike_c,
				feelslike_f,
				humidity,
				wind_kph,
				wind_mph,
				wind_degree,
				wind_dir,
				pressure_mb,
				precip_mm,
				cloud,
				uv,
				vis_km,
				vis_miles,
			} = weather.current;

			const { name, region, country, localtime } = weather.location;
			const { text: condition, icon } = weather.current.condition;

			const embed = new EmbedBuilder()
				.setTitle(`Weather in ${name}, ${region}, ${country}`)
				.setDescription(`**${condition}**`)
				.setThumbnail(`https:${icon}`)
				.addFields(
					{ name: 'Temperature', value: `${temp_c} °C / ${temp_f} °F`, inline: true },
					{
						name: 'Feels Like',
						value: `${feelslike_c} °C / ${feelslike_f} °F`,
						inline: true,
					},
					{ name: 'Humidity', value: `${humidity}%`, inline: true },
					{
						name: 'Wind Speed',
						value: `${wind_kph} kph / ${wind_mph} mph`,
						inline: true,
					},
					{ name: 'Wind Direction', value: `${wind_degree}° ${wind_dir}`, inline: true },
					{ name: 'Pressure', value: `${pressure_mb} mb`, inline: true },
					{ name: 'Precipitation', value: `${precip_mm} mm`, inline: true },
					{ name: 'Cloud Cover', value: `${cloud}%`, inline: true },
					{ name: 'UV Index', value: `${uv}`, inline: true },
					{
						name: 'Visibility',
						value: `${vis_km} km / ${vis_miles} miles`,
						inline: true,
					},
					{ name: 'Local Time', value: `${localtime}`, inline: true }
				)
				.setFooter({
					text: 'Powered by WeatherAPI',
					iconURL: 'https://www.weatherapi.com/favicon.ico',
				})
				.setColor('#00aaff');

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error(error);
			await interaction.reply(
				'Could not fetch the weather. Please make sure the city name is correct.'
			);
		}
	},
};
