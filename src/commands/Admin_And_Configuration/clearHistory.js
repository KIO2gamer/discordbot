const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const ChatHistory = require("./../../database/ChatHistory");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName("clear_history")
        .setDescription("Clears your AI chat history")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    description_full:
        "Deletes all your previous chat interactions with the AI assistant, giving you a fresh start. This action cannot be undone.",

    usage: "/clear_history",
    examples: ["/clear_history"],

    /**
     * Executes the clearHistory command to delete the user's chat history.
     *
     * @param {Object} interaction - The interaction object from the Discord API.
     * @param {Object} interaction.user - The user object from the interaction.
     * @param {string} interaction.user.id - The ID of the user whose chat history is to be deleted.
     * @returns {Promise<void>} - A promise that resolves when the chat history is deleted and the reply is sent.
     */
    async execute(interaction) {
        try {
            // Delete the user's chat history
            await ChatHistory.findOneAndDelete({ userId: interaction.user.id });

            await interaction.reply({
                content: "Your AI chat history has been cleared.",
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            await handleError(interaction, error);
        }
    },
};
