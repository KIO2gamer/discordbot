const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const { handleError } = require("./../../utils/errorHandler");
const mongoose = require("mongoose");

module.exports = {
    cooldown: 30,
    data: new SlashCommandBuilder()
        .setName("clear_db")
        .setDescription("⚠️ DANGER: Wipes all database contents. Admin only.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    description_full:
        "Completely wipes all collections and data from the connected MongoDB database. This action is irreversible and should be used with extreme caution. Only server administrators can use this command.",
    usage: "/clear_db",
    examples: ["/clear_db"],

    /**
     * Executes the clear database command.
     *
     * @param {Object} interaction - The interaction object from Discord.
     * @param {Object} interaction.member - The member object of the user who initiated the interaction.
     * @param {Object} interaction.member.permissions - The permissions object of the member.
     * @param {Object} interaction.user - The user object of the member who initiated the interaction.
     * @param {Object} interaction.channel - The channel object where the interaction was initiated.
     * @param {Function} interaction.reply - Function to edit the initial reply of the interaction.
     * @param {Function} interaction.followUp - Function to send a follow-up message to the interaction.
     *
     * @returns {Promise<void>} - A promise that resolves when the command execution is complete.
     *
     * @description
     * This command checks if the user has the Administrator permission. If not, it sends an error message.
     * If the user has the required permission, it sends a warning message and waits for the user to type `CONFIRM`.
     * If the user confirms, it deletes all collections in the MongoDB database.
     * If an error occurs during the process, it sends an appropriate error message.
     */
    async execute(interaction) {
        // Check if user has the highest admin role
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral,
            });
        }

        // Initial warning message
        await interaction.reply({
            content:
                "⚠️ **DANGER**: This will permanently delete ALL data in the database. Are you absolutely sure?\nType `CONFIRM` to proceed.",
            flags: MessageFlags.Ephemeral,
        });

        try {
            // Create message collector for confirmation
            const filter = (m) => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({
                filter,
                time: 30000,
                max: 1,
            });

            collector.on("collect", async (message) => {
                if (message.content === "CONFIRM") {
                    try {
                        // Get all collections
                        const collections = await mongoose.connection.db.collections();

                        // Drop each collection
                        for (const collection of collections) {
                            await collection.drop();
                        }

                        await interaction.editReply("✅ Database has been completely wiped.");
                    } catch (error) {
                        handleError("Database clear error:", error);
                        await interaction.editReply(
                            "❌ An error occurred while clearing the database.",
                        );
                    }
                } else {
                    await interaction.editReply("❌ Database wipe cancelled.");
                }
                message.delete().catch((error) => handleError("Failed to delete message:", error));
            });

            collector.on("end", (collected) => {
                if (collected.size === 0) {
                    interaction.editReply({
                        content: "❌ Command timed out. Database wipe cancelled.",
                        flags: MessageFlags.Ephemeral,
                    });
                }
            });
        } catch (error) {
            handleError("Command error:", error);
            await interaction.editReply({
                content: "❌ An error occurred while executing the command.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
