/**
 * Creates a slash command that allows users to create a poll with a question, options, and duration.
 *
 * The command accepts the following options:
 * - `question`: The question for the poll (required)
 * - `options`: The options for the poll, separated by commas (required)
 * - `multi_select`: Whether to allow multiple answer selections (required)
 * - `duration`: The duration of the poll in hours (required, max 32 hours)
 *
 * The command will create a poll embed with the provided question and options, and send it as a reply to the interaction. The poll will have the specified duration and multi-select setting.
 *
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object for the slash command
 */
const { SlashCommandBuilder, PollLayoutType, EmbedBuilder } = require('discord.js');

const MAX_POLL_DURATION_HOURS = 32;
const MAX_POLL_DURATION_MINUTES = MAX_POLL_DURATION_HOURS * 60;

module.exports = {
	description_full: 'Creates a poll with the given question, options, and duration.',
	usage: '/create_poll question:"poll question" options:"option1,option2,..." multi_select:true/false duration:hours',
	examples: [
		'/create_poll question:"What is your favorite color?" options:"Red,Blue,Green" multi_select:false duration:1',
		'/create_poll question:"Which games do you like?" options:"Minecraft,Fortnite,Valorant" multi_select:true duration:24',
	],
	data: new SlashCommandBuilder()
		.setName('create_poll')
		.setDescription('Create a poll')
		.addStringOption(option =>
			option.setName('question').setDescription('The question of the poll').setRequired(true)
		)
		.addStringOption(option =>
			option
				.setName('options')
				.setDescription('The options of the poll, separated by commas')
				.setRequired(true)
		)
		.addBooleanOption(option =>
			option
				.setName('multi_select')
				.setDescription('Allow multiple answer selections')
				.setRequired(true)
		)
		.addIntegerOption(option =>
			option
				.setName('duration')
				.setDescription(
					`Duration of the poll in hours (max ${MAX_POLL_DURATION_HOURS} hours)`
				)
				.setRequired(true)
		),

	async execute(interaction) {
		try {
			const question = interaction.options.getString('question');
			const options = interaction.options
				.getString('options')
				.split(',')
				.map(option => option.trim())
				.filter(option => option !== ''); // Remove empty options
			const multiSelect = interaction.options.getBoolean('multi_select');
			let durationHours = interaction.options.getInteger('duration');

			const MAX_OPTIONS = 25; // Discord's limit for poll options

			if (options.length < 2) {
				return interaction.reply({
					content: 'Please provide at least two options for the poll.',
					ephemeral: true,
				});
			}

			if (options.length > MAX_OPTIONS) {
				return interaction.reply({
					content: `Please provide no more than ${MAX_OPTIONS} options for the poll.`,
					ephemeral: true,
				});
			}

			const MAX_QUESTION_LENGTH = 256; // Discord's limit for embed titles

			if (question.length > MAX_QUESTION_LENGTH) {
				return interaction.reply({
					content: `The question must be ${MAX_QUESTION_LENGTH} characters or fewer.`,
					ephemeral: true,
				});
			}

			if (durationHours <= 0 || durationHours > MAX_POLL_DURATION_HOURS) {
				return interaction.reply({
					content: `Duration must be between 1 and ${MAX_POLL_DURATION_HOURS} hours.`,
					ephemeral: true,
				});
			}

			const durationMinutes = Math.min(durationHours * 60, MAX_POLL_DURATION_MINUTES);

			try {
				await interaction.reply({
					poll: {
						question: { text: question },
						answers: options.map(option => ({ text: option })),
						allowMultiselect: multiSelect,
						duration: durationMinutes,
						layoutType: PollLayoutType.Default,
					},
				});
			} catch (error) {
				console.error('Error creating poll:', error);
				await interaction.reply({
					content: 'An error occurred while creating the poll. Please try again later.',
					ephemeral: true,
				});
			}
		} catch (error) {
			console.error(error);
			await interaction.reply('An error occurred while trying to create the poll.');
		}
	},
};
