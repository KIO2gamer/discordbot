const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');

module.exports = {
  description_full:
    "Displays information about the bot itself, including its developer, uptime, ping, memory usage, and the number of commands it has.",
  usage: "/botinfo",
  examples: ["/botinfo"],
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Get info about the bot."),

	async execute(interaction) {
		await sendBotInfo(interaction);
	},
};

async function sendBotInfo(interaction) {
	try {
		// Defer the reply to give the bot more time to gather info
		const sent = await interaction.deferReply({ fetchReply: true });
		const uptime = formatUptime(interaction.client.uptime);

		// Define the description and fields for the embed
		const description = `\`\`\`fix\nDeveloper:   kio2gamer\nStatus:      Under Development\nLanguage:    JavaScript\nCreated on:  ${interaction.client.user.createdAt.toUTCString()}\`\`\``;
		const pingField = `\`\`\`fix\nPing:   ${sent.createdTimestamp - interaction.createdTimestamp} ms\nWS:     ${interaction.client.ws.ping} ms\nUptime: ${uptime}\nNode:   ${process.version}\nDJS:    v${djsVersion}\`\`\``;
		const statsField = `\`\`\`fix\nBot ID: ${interaction.client.user.id}\nType: Private\nCommands: ${interaction.client.commands.size}\nCommands Type: Slash Commands\nMemory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\`\`\``;

		// Create the embed
		const embed = new EmbedBuilder()
			.setTitle('Bot Info [Click to invite (Owner only!!!)]')
			.setURL(
				`https://discord.com/oauth2/authorize?client_id=1155222493079015545&permissions=8&integration_type=0&scope=bot`
			)
			.setColor('Purple')
			.setDescription(description)
			.addFields(
				{ name: 'Ping', value: pingField, inline: true },
				{ name: 'Stats', value: statsField, inline: true }
			);

		// Edit the deferred reply with the embed
		await interaction.editReply({ embeds: [embed] });
	} catch (error) {
		console.error('Error fetching bot info:', error);
		await interaction.editReply({
			content: 'Oops! There was an error.',
			ephemeral: true,
		});
	}
}

function formatUptime(uptimeMilliseconds) {
	const seconds = Math.floor(uptimeMilliseconds / 1000);
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor(((seconds % 86400) % 3600) / 60);
	const secondsLeft = ((seconds % 86400) % 3600) % 60;

	return `${days}d ${hours}h ${minutes}m ${secondsLeft}s`;
}
