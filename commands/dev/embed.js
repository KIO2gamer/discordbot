const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
	description_full: 'This command sends a pre-saved embed from a JSON file.',
	usage: '/sendembed <embed_name>',
	examples: ['/sendembed welcome', '/sendembed rules'],
	data: new SlashCommandBuilder()
		.setName('sendembed')
		.setDescription('Sends a pre-saved embed message.')
		.addStringOption(option =>
			option
				.setName('embed_name')
				.setDescription('Select the type of embed to send')
				.setRequired(true)
				.addChoices(
					{ name: 'Welcome', value: 'welcome' },
					{ name: 'Level Roles', value: 'level_roles' },
					{ name: 'Server Booster Perks', value: 'booster_perks' },
					{ name: 'Other Roles', value: 'other_roles' },
					{ name: 'Forms', value: 'forms' },
					{ name: 'Rules', value: 'rules' }, // Combined rules option
					{ name: 'Self-Assignable Roles', value: 'self_roles' }
				)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

	async execute(interaction) {
		const embedName = interaction.options.getString('embed_name');
		const folderPath = './assets/json/embeds';

		try {
			if (embedName === 'rules') {
				// Handle sending multiple rule embeds
				for (let i = 1; i <= 10; i++) {
					const ruleFilePath = `${folderPath}/rules-${i}.json`;

					if (fs.existsSync(ruleFilePath)) {
						const data = fs.readFileSync(ruleFilePath);
						const embedData = JSON.parse(data);
						const embed = EmbedBuilder.from(embedData);
						await interaction.channel.send({ embeds: [embed] });
					}
					// No error if a rule file is missing, it just skips to the next one
				}
			} else {
				// Handle sending single embeds
				const filePath = `${folderPath}/${embedName}.json`;

				await interaction.channel.send({ embeds: [embed] });
			}
		} catch (error) {
			console.error(`Error sending embed:`, error);
			await interaction.reply({
				content: 'An error occurred while sending the embed.',
				ephemeral: true,
			});
		}
	},
};
