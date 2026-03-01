const { SlashCommandBuilder } = require("discord.js");
const Reminder = require("./../../database/reminderStorage");

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("reminder")
        .setDescription("Set a reminder after a specified time")
        .addIntegerOption((option) =>
            option
                .setName("time")
                .setDescription("Time in seconds after which you want to be reminded")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("message").setDescription("Message to be reminded of").setRequired(true),
        ),

    description_full:
        "Set a reminder that will be sent after a specified time. The bot will mention you with your reminder message when the time is up.",
    usage: "/reminder <time> <message>",
    examples: [
        "/reminder 3600 Take the cake out of the oven",
        "/reminder 300 Check on the laundry",
        "/reminder 86400 Happy birthday to me!",
    ],

    async execute(interaction) {
        const time = interaction.options.getInteger("time"); // Time in seconds
        const reminderMessage = interaction.options.getString("message");
        const userId = interaction.user.id;
        const channelId = interaction.channel.id;

        // Calculate when the reminder should be sent
        const reminderTime = new Date(Date.now() + time * 1000);

        // Save the reminder in MongoDB
        const reminder = new Reminder({
            userId,
            reminderMessage,
            reminderTime,
            channelId,
        });

        await reminder.save();

        // Confirm that the reminder is set
        await interaction.reply(
            `Reminder set! I'll remind you in ${time} seconds: "${reminderMessage}"`,
        );

        // Schedule the reminder
        setTimeout(async () => {
            const channel = await interaction.client.channels.fetch(channelId);
            await channel.send(`⏰ <@${userId}> Reminder: ${reminderMessage}`);

            // After sending the reminder, delete it from the database
            await Reminder.findByIdAndDelete(reminder._id);
        }, time * 1000);
    },
};
