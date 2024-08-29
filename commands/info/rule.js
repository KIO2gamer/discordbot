/**
 * Displays a specific rule from the server's rules list. The number of the rule to be displayed is specified as an argument.
 *
 * @param {import('discord.js').CommandInteraction} interaction - The Discord interaction object.
 * @returns {Promise<void>} - A Promise that resolves when the rule is displayed.
 */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	description_full:
		'Displays a specific rule from the server’s rules list. The number of the rule to be displayed is specified as an argument.',
	usage: '/rule <number>',
	examples: ['/rule 1', '/rule 5'],
	data: new SlashCommandBuilder()
		.setName('rule')
		.setDescription('Shows the rules of the server in snippets (selection).')
		.setDefaultMemberPermissions(
			PermissionFlagsBits.ManageMessages // Changed permission to ManageMessages for better fit
		)
		.addIntegerOption(option =>
			option
				.setName('number')
				.setDescription('Input a number which corresponds to that rule.')
				.setRequired(true)
		),

	async execute(interaction) {
		const number = interaction.options.getInteger('number');
		switch (number) {
			case 1:
				return interaction.reply(
					'**Rule 1 - No Spamming**\n> This includes obnoxious noises in voice, @mention spam, character spam, image spam, and message spam.'
				);
			case 2:
				return interaction.reply(
					'**Rule 2 - No unnecessary explicit content**\n> This includes NSFW, 18+, sexual and offensive content which makes the members uncomfortable to see.'
				);
			case 3:
				return interaction.reply(
					'**Rule 3 - No harassment**\n> This includes any form of harassment or encouraging of harassment.'
				);
			case 4:
				return interaction.reply(
					'**Rule 4 - No talking in other languages**\n> Please type only in intelligible English as we are unable to moderate consistently throughout the day.'
				);
			case 5:
				return interaction.reply(
					'**Rule 5 - No politics or any religious discussion**\n> Please refrain from talking about politics and any religious support in the chat as it will become chaotic and nearly impossible to moderate.'
				);
			case 6:
				return interaction.reply(
					'**Rule 6 - No inappropriate language or bypassing them**\n> Even though we have set up AutoMod to delete any inappropriate language, you should not bypass them. Failing to do so might lead to a mute or in higher degrees, ban. This includes swearing, trash talking, etc. Refrain from directing it at another member unsuspectingly.'
				);
			case 7:
				return interaction.reply(
					'**Rule 7 - Username should be pingable**\n> Please do not use special characters or unicodes in your username as you might be pinged for something.'
				);
			case 8:
				return interaction.reply(
					'**Rule 8 - Use the channels correctly**\n> Please use the channels in the correct places to avoid disturbance in the chat. For out of context discussions, please refer to the appropriate channel.'
				);
			case 9:
				return interaction.reply(
					'**Rule 9 - No ghost pinging**\n> Please refrain from ghost pinging members as they are quite annoying and waste others valuable time.'
				);
			case 10:
				return interaction.reply(
					'**Rule 10 - No advertising**\n> Please do not advertise anything in our server. This includes websites, social media, etc. Same applies to DM-advertising.'
				);
			case 11:
				return interaction.reply(
					"**Rule 11 - Follow Discord's community guidelines.**\n> https://discord.com/guidelines"
				);
			default:
				return interaction.reply({
					content: 'Input a valid number from 1 to 11.',
					ephemeral: true,
				});
		}
	},
};
