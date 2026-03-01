const Reminder = require("./../database/reminderStorage");
const { Events } = require("discord.js");
const { handleError } = require("../utils/errorHandler");

// Only schedule reminders within this lookahead window to cap memory usage
const SCHEDULE_HORIZON_MS = 24 * 60 * 60 * 1000; // 24 hours

// Track which reminder IDs already have an active timer to avoid duplicates
const scheduledIds = new Set();

/**
 * Schedules a single reminder and registers it in scheduledIds.
 */
function scheduleReminder(client, reminder) {
    const id = reminder._id.toString();
    if (scheduledIds.has(id)) return;

    const timeLeft = new Date(reminder.reminderTime).getTime() - Date.now();

    const sendReminder = async () => {
        scheduledIds.delete(id);
        try {
            const channel = await client.channels.fetch(reminder.channelId);
            if (!channel) {
                await Reminder.findByIdAndDelete(reminder._id);
                return;
            }
            await channel.send(`⏰ <@${reminder.userId}> Reminder: ${reminder.reminderMessage}`);
            await Reminder.findByIdAndDelete(reminder._id);
        } catch (error) {
            handleError(`Error sending reminder: ${error.message}`);
            await Reminder.findByIdAndUpdate(reminder._id, { status: "failed" });
        }
    };

    scheduledIds.add(id);
    if (timeLeft > 0) {
        setTimeout(sendReminder, timeLeft);
    } else {
        // Already overdue – fire async without blocking the caller
        sendReminder();
    }
}

/**
 * Fetches pending reminders and schedules those due within SCHEDULE_HORIZON_MS.
 * Reminders further out are left in the DB; the hourly re-check will pick them up later.
 */
async function scheduleUpcoming(client) {
    try {
        const horizon = new Date(Date.now() + SCHEDULE_HORIZON_MS);
        const pending = await Reminder.find({ reminderTime: { $lte: horizon } });

        for (const reminder of pending) {
            scheduleReminder(client, reminder);
        }
    } catch (error) {
        handleError(`Error in reminder schedule sweep: ${error.message}`);
    }
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        // Schedule reminders due within the next 24 hours
        await scheduleUpcoming(client);

        // Re-check every hour to schedule reminders that are now within the horizon
        setInterval(() => scheduleUpcoming(client), 60 * 60 * 1000);
    },
};
