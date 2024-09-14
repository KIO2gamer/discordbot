<p align="center">
  <a href="" rel="noopener">
 <img width=200px height=200px src="https://i.imgur.com/6wj0hh6.jpg" alt="Project logo"></a>
</p>

<h3 align="center">Kiyo - Multipurpose Discord Bot</h3>

<div align="center">

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![GitHub Issues](https://img.shields.io/github/issues/KIO2gamer/discordbot)](https://github.com/KIO2gamer/discordbot/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/KIO2gamer/discordbot)](https://github.com/KIO2gamer/discordbot/pulls)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](/LICENSE)
[![Discord Server](https://img.shields.io/discord/935017969271054346?label=Discord&logo=discord)](https://discord.gg/3uDPm9NV4X)

</div>

<p align="center"> Kiyo is a versatile and dynamic Discord bot designed to enhance your server experience. It offers a wide range of functionalities, including moderation tools, fun and engaging games, utility commands, and seamless integration with various APIs for enhanced features. 
    <br> 
</p>

## 📝 Table of Contents

-   [About](#about)
-   [Features](#features)
-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
-   [Commands](#commands)
-   [API Integration](#api-integration)
-   [Built Using](#built-using)
-   [Contributing](#contributing)
-   [Authors](#authors)
-   [Acknowledgments](#acknowledgments)

## 🧐 About <a name="about"></a>

Kiyo is a multipurpose Discord bot built with [Discord.js](https://discord.js.org/), a powerful JavaScript library for interacting with the Discord API. Kiyo leverages a [MongoDB](https://www.mongodb.com/) database to store data persistently, ensuring a smooth and reliable experience. It's designed to be user-friendly and highly customizable, catering to a variety of server needs.

## ✨ Features <a name="features"></a>

### Moderation 🛡️

Keep your server clean and organized with Kiyo's robust moderation features:

-   **Kick/Ban Users:** Remove disruptive users from your server with customizable reasons.
-   **Manage Roles:** Easily assign and manage roles to members to organize your community.
-   **Purge Messages:** Quickly delete a specified number of messages in a channel to clean up clutter or remove inappropriate content.

### Fun & Games 🎉

Engage your community and add a touch of entertainment with Kiyo's fun commands and mini-games:

-   **Fun Commands:** Enjoy commands like 8ball, dice rolling, meme generation, and more for a fun and interactive experience.
-   **Mini-games:** Play engaging mini-games with your friends directly on your Discord server.

### Utility 🧰

Kiyo provides a range of utility commands to make server management and member interactions easier:

-   **Information Lookup:** Get quick access to information like weather forecasts, translations, and more.
-   **Polls:** Create polls to gather opinions from your community and make decisions democratically.

## 🏁 Getting Started <a name="getting-started"></a>

These instructions will guide you through setting up Kiyo on your local machine for development and testing.

### Prerequisites <a name="prerequisites"></a>

Before getting started, ensure you have the following:

-   **Node.js and npm:** Kiyo requires Node.js (version 16.6.0 or higher is recommended) and npm, which comes bundled with Node.js. You can download Node.js from [https://nodejs.org/](https://nodejs.org/).
-   **MongoDB Account:** You'll need a free MongoDB Atlas account to store Kiyo's data. Create an account at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
-   **Discord Bot Application:** Create a Discord bot application and obtain your bot token by following these steps:
    1. Go to the Discord Developer Portal: [https://discord.com/developers/applications](https://discord.com/developers/applications).
    2. Click "New Application" and give your application a name.
    3. Navigate to the "Bot" tab in your application settings.
    4. Click "Add Bot" and confirm.
    5. **Keep your bot token secret!** Treat it like a password for your bot.

### Installation <a name="installation"></a>

1. **Clone the Repository:**

    ```bash
    git clone https://github.com/KIO2gamer/discordbot.git
    cd discordbot
    ```

2. **Install Dependencies:**

    ```bash
    npm install
    ```

3. **Configuration:**

-   Create a `.env` file in the project's root directory.
-   Add the following to your `.env` file, replacing the placeholders (`<your_credentials>`) with your actual credentials:

        ```bash
        DISCORD_TOKEN=<your_discord_bot_token>
        MONGODB_URL=<your_mongodb_connection_string>
        GEMINI_API_KEY=<your_gemini_api_key>
        CLIENT_ID=<your_discord_client_id>
        GUILD_IDS=<your_discord_server_id>
        TENOR_API_KEY=<your_tenor_api_key>
        PEXELS_API_KEY=<your_pexels_api_key>
        WEATHER_API_KEY=<your_weather_api_key>
        GIPHY_API_KEY=<your_giphy_api_key>
        GIANT_BOMB_API_KEY=<your_giant_bomb_api_key>
        ```

-   For `GUILD_IDS`, you can add either a single server ID or multiple server IDs as an array:

        ```bash
        # Single server ID:

        GUILD_IDS=<your_discord_server_id>

        # Multiple server IDs:

        GUILD_IDS=[<server_id_1>, <server_id_2>, ...]
        ```

4. **Start the bot:**
    ```bash
    npm run
    ```
    For development (with hot-reloading):
    ```bash
    npm run dev
    ```

## 🎮 Commands <a name="commands"></a>

Kiyo utilizes slash commands, a modern and intuitive way to interact with bots on Discord (introduced in Discord API v9). Here's a preview of Kiyo's command categories and examples:

### Fun/Entertainment 🎉

-   `/8ball <question>`: Ask the magic 8-ball a yes/no question and get a mystical response.
-   `/roll`: Roll a virtual dice and get a random number.
-   `/meme`: Get a random meme to brighten your day or share a laugh with your friends.

### Moderation 🛡️

-   `/kick <target> <reason>`: Kick a user from the server for disruptive behavior.
-   `/ban <target> <reason>`: Ban a user from the server, preventing their return.
-   `/purge <number>`: Delete a specified number of messages in the current channel.

### Utility 🧰

-   `/weather <location>`: Get the current weather forecast for a specific location.
-   `/translate <text> <target_language>`: Translate text into another language.
-   `/poll <question> <option1> <option2> ...`: Create a poll with multiple options for your server members to vote on.

**For a Complete Command List:** Use the `/help` command in your Discord server to get a detailed list of all commands and their descriptions.

## ⛏️ Build Using <a name = "built_using"></a>

-   [Node.js](https://nodejs.org/en/) - Server Environment
-   [Discord.js](https://discord.js.org/) - Discord API Wrapper
-   [MongoDB](https://www.mongodb.com/) - Database

## Contributing <a name = "contributing"></a>

If you'd like to contribute to Kiyo, please follow these steps:

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a pull request.

We welcome all contributions to make Kiyo even better!

## ✍️ Authors <a name = "authors"></a>

-   [@KIO2gamer](https://github.com/KIO2gamer) - Initial Work and Idea

## 🎉 Acknowledgments <a name = "acknowledgments"></a>

-   A big thank you to the Discord.js community for the fantastic library and support.
-   Thanks to all the contributors (Use `/credits` in Discord) who have helped make Kiyo possible!
-   Thanks to ChatGPT's custom GPT, Discord Bot Builder, and Gemini 1.5 Pro (2B Model) for optimizing and giving more suggestions to the errors I've encountered.
