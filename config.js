module.exports = {
    intents: [
        GatewayIntentBits.Guilds,
        // ... other intents
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
};
