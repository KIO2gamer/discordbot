/**
 * Command Template - Use this as a reference for creating new commands
 * This template includes all best practices and available options
 */

const { SlashCommandBuilder } = require("discord.js");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    // ============================================
    // CORE PROPERTIES (Required)
    // ============================================

    /**
     * Slash command data - required by Discord.js
     * @type {SlashCommandBuilder}
     */
    data: new SlashCommandBuilder()
        .setName("command-name")
        .setDescription("Brief description of what this command does")
        .setDMPermission(false) // Prevent in DM usage if desired
        .addStringOption((option) =>
            option
                .setName("option-name")
                .setDescription("Description of this option")
                .setRequired(true),
        ),

    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            // Get options
            // const optionValue = interaction.options.getString("option-name");

            // Defer reply for long-running operations
            // await interaction.deferReply();

            // Your command logic here
            await interaction.reply({
                content: "Command executed successfully!",
                ephemeral: false,
            });
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while executing this command.",
            );
        }
    },

    // ============================================
    // OPTIONAL PROPERTIES
    // ============================================

    /**
     * Cooldown in seconds (default: 3)
     * @type {number}
     */
    cooldown: 5,

    /**
     * Category for this command (auto-set by loader)
     * @type {string}
     */
    category: "Utility",

    /**
     * Subcategory for organization (optional)
     * @type {string}
     */
    subCategory: "general",

    /**
     * User permissions required to execute this command
     * @type {string[]}
     * @example ["MANAGE_MESSAGES", "BAN_MEMBERS"]
     */
    userPermissions: [],

    /**
     * Bot permissions required to execute this command
     * @type {string[]}
     * @example ["SEND_MESSAGES", "EMBED_LINKS"]
     */
    botPermissions: [],

    /**
     * Is this command for NSFW channels only?
     * @type {boolean}
     */
    nsfw: false,

    /**
     * Is this command disabled?
     * @type {boolean}
     */
    enabled: true,

    /**
     * Command aliases (alternative names)
     * @type {string[]}
     */
    aliases: ["alias1", "alias2"],

    /**
     * Full description for help command
     * @type {string}
     */
    description_full: "Detailed description of what this command does and how to use it.",

    /**
     * Usage examples
     * @type {string[]}
     */
    examples: ["/command-name", "/command-name option-name"],

    /**
     * Autocomplete handler (if using autocomplete options)
     * @param {AutocompleteInteraction} interaction
     * @returns {Promise<void>}
     */
    async autocomplete(interaction) {
        // Handle autocomplete here
        // const focusedOption = interaction.options.getFocused(true);
        // await interaction.respond([...]);
    },

    /**
     * Handle button interactions specific to this command
     * @param {ButtonInteraction} interaction
     * @returns {Promise<void>}
     */
    async handleButton(interaction) {
        try {
            // Handle button logic
        } catch (error) {
            await handleError(interaction, error, "BUTTON_HANDLER");
        }
    },

    /**
     * Handle select menu interactions specific to this command
     * @param {StringSelectMenuInteraction} interaction
     * @returns {Promise<void>}
     */
    async handleSelectMenu(interaction) {
        try {
            // Handle select menu logic
        } catch (error) {
            await handleError(interaction, error, "SELECT_MENU_HANDLER");
        }
    },

    /**
     * Handle modal submissions specific to this command
     * @param {ModalSubmitInteraction} interaction
     * @returns {Promise<void>}
     */
    async handleModal(interaction) {
        try {
            // Handle modal logic
        } catch (error) {
            await handleError(interaction, error, "MODAL_HANDLER");
        }
    },
};

/**
 * USAGE GUIDE:
 *
 * 1. REQUIRED PROPERTIES:
 *    - data: SlashCommandBuilder with command name and description
 *    - execute: Async function that runs when command is called
 *
 * 2. OPTIONAL PROPERTIES:
 *    - cooldown: Seconds before user can use command again (default: 3)
 *    - userPermissions: Discord permissions required by user
 *    - botPermissions: Discord permissions required by bot
 *    - enabled: Set to false to disable without deleting
 *    - aliases: Alternative command names
 *
 * 3. SLASH COMMAND OPTIONS:
 *    - addStringOption(): Text input
 *    - addIntegerOption(): Number input
 *    - addNumberOption(): Decimal input
 *    - addBooleanOption(): Yes/No input
 *    - addUserOption(): User mention
 *    - addRoleOption(): Role selection
 *    - addChannelOption(): Channel selection
 *    - addAttachmentOption(): File upload
 *    - addSubcommand(): Subcommand group
 *    - addSubcommandGroup(): Nested subcommands
 *
 * 4. GETTING OPTIONS:
 *    - interaction.options.getString("name")
 *    - interaction.options.getInteger("name")
 *    - interaction.options.getBoolean("name")
 *    - interaction.options.getUser("name")
 *    - interaction.options.getRole("name")
 *    - interaction.options.getChannel("name")
 *    - interaction.options.getAttachment("name")
 *
 * 5. REPLYING TO INTERACTIONS:
 *    - interaction.reply(content): Send message
 *    - interaction.deferReply(): Wait before replying (for long operations)
 *    - interaction.editReply(content): Edit previous reply
 *    - interaction.followUp(content): Send follow-up message
 *    - { ephemeral: true }: Only visible to command user
 *
 * 6. EMBEDS:
 *    const embed = new EmbedBuilder()
 *        .setTitle(\"Title\")\n *        .setDescription(\"Description\")\n *        .addFields(\n *            { name: \"Field 1\", value: \"Value 1\" },\n *            { name: \"Field 2\", value: \"Value 2\" }\n *        )\n *        .setColor(\"#0099ff\")\n *        .setFooter({ text: \"Footer text\" });\n *    await interaction.reply({ embeds: [embed] });\n *
 * 7. ERROR HANDLING:\n *    Use the handleError() utility function for consistent error messages\n *    It will automatically log errors and notify the user\n *\n * 8. DATABASE USAGE:\n *    Import required database models\n *    await Model.findOne({ ... });\n *    await Model.findByIdAndUpdate(id, { ... });\n *    await Model.deleteOne({ ... });\n */
