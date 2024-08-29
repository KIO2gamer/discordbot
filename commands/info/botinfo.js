/**
 * Displays information about the bot, including its developer, uptime, ping, memory usage, and the number of commands it has.
 *
 * @module commands/info/botinfo
 * @param {import('discord.js').Interaction} interaction - The interaction object for the command.
 * @returns {Promise<void>} - Resolves when the command has finished executing.
 */
const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const { randomBytes } = require('crypto');

module.exports = {
	description_full:
		'Displays information about the bot itself, including its developer, uptime, ping, memory usage, and the number of commands it has.',
	usage: '/botinfo',
	examples: ['/botinfo'],
	data: new SlashCommandBuilder().setName('botinfo').setDescription('Get info about the bot.'),

	async execute(interaction) {
		const sent = await interaction.deferReply({ fetchReply: true });
		const uptime = formatUptime(interaction.client.uptime);
		const randomColor = `#${randomBytes(3).toString('hex')}`;

		const embed = new EmbedBuilder()
			.setTitle('Bot Info [Click to invite (Owner only!!!)]')
			.setURL(
				`https://discord.com/oauth2/authorize?client_id=1155222493079015545&permissions=8&integration_type=0&scope=bot`
			)
			.setColor(randomColor)
			.setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
			.setDescription(
				`Hello! I'm ${interaction.client.user.username}. Here's some info about me:`
			)
			.addFields(
				{ name: '👨‍💻 Developer', value: 'kio2gamer', inline: true },
				{ name: '🚀 Status', value: 'Currently in development!', inline: true },
				{
					name: '🎂 Birthday',
					value: `<t:${Math.floor(interaction.client.user.createdTimestamp / 1000)}:R>`,
					inline: true,
				},
				{
					name: '⚡ Ping',
					value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`,
					inline: true,
				},
				{ name: '🕒 Uptime', value: uptime, inline: true },
				{
					name: '🧠 Memory Usage',
					value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
					inline: true,
				},
				{
					name: '🛠️ Tech Stack',
					value: `Node.js ${process.version}\nDiscord.js v${djsVersion}`,
					inline: true,
				},
				{
					name: '🎮 Servers',
					value: `${interaction.client.guilds.cache.size}`,
					inline: true,
				},
				{ name: '🔧 Commands', value: `${interaction.client.commands.size}`, inline: true }
			)
			.setFooter({ text: "Beep boop! I'm here to help!" })
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });
	},
};

function formatUptime(ms) {
	const seconds = Math.floor((ms / 1000) % 60);
	const minutes = Math.floor((ms / (1000 * 60)) % 60);
	const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
	const days = Math.floor(ms / (1000 * 60 * 60 * 24));

	return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
