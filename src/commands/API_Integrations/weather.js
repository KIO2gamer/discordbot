const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const axios = require("axios");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 10,
    description_full:
        "Fetches and displays the current weather for a given city using the WeatherAPI. Information includes temperature, feels like temperature, humidity, wind, pressure, UV index, and more.",
    usage: "/weather <city>",
    examples: ["/weather London", '/weather "New York"'],

    data: new SlashCommandBuilder()
        .setName("weather")
        .setDescription("Get the current weather for a location")
        .addStringOption((option) =>
            option
                .setName("location")
                .setDescription("The city to get weather for")
                .setRequired(true),
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const city = interaction.options.getString("location");
        const apiKey = process.env.WEATHER_API_KEY;

        if (!apiKey) {
            return handleError(
                interaction,
                new Error("Weather service is not properly configured. Missing API key."),
                "CONFIGURATION",
            );
        }

        try {
            // Validate city name
            if (!/^[a-zA-Z\s,.-]+$/.test(city)) {
                return handleError(
                    interaction,
                    new Error("Invalid city name provided."),
                    "VALIDATION",
                    "Please provide a valid city name using only letters, spaces, and basic punctuation.",
                );
            }

            const baseUrl = "https://api.openweathermap.org/data/2.5/weather";
            const params = new URLSearchParams({
                q: city,
                appid: apiKey,
                units: "metric",
            });

            const response = await axios.get(`${baseUrl}?${params.toString()}`);

            const weatherData = response.data;
            const embed = new EmbedBuilder()
                .setTitle(`Weather in ${weatherData.name}, ${weatherData.sys.country}`)
                .setDescription(`Current weather conditions for ${city}`)
                .addFields(
                    {
                        name: "🌡️ Temperature",
                        value: `${Math.round(weatherData.main.temp)}°C (Feels like ${Math.round(weatherData.main.feels_like)}°C)`,
                        inline: true,
                    },
                    {
                        name: "💧 Humidity",
                        value: `${weatherData.main.humidity}%`,
                        inline: true,
                    },
                    {
                        name: "🌪️ Wind",
                        value: `${weatherData.wind.speed} m/s`,
                        inline: true,
                    },
                    {
                        name: "☁️ Conditions",
                        value:
                            weatherData.weather[0].description.charAt(0).toUpperCase() +
                            weatherData.weather[0].description.slice(1),
                        inline: true,
                    },
                )
                .setColor("#0099ff")
                .setTimestamp()
                .setFooter({
                    text: "Powered by OpenWeatherMap",
                    iconURL:
                        "https://openweathermap.org/img/w/" + weatherData.weather[0].icon + ".png",
                });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            // Check for 404 specifically to give a better message
            if (error.response && error.response.status === 404) {
                return handleError(
                    interaction,
                    new Error(`Could not find weather data for "${city}".`),
                    "VALIDATION",
                    "Could not find the city. Please check the spelling and try again.",
                );
            }
            // Use the central handler for all other errors
            handleError(interaction, error);
        }
    },
};
