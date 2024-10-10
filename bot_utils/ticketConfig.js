const mongoose = require('mongoose');

const ticketConfigSchema = new mongoose.Schema({
    guildId: String,
    ticketCategoryId: String
});

module.exports = mongoose.model('TicketConfig', ticketConfigSchema);
