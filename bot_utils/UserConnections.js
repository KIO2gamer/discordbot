const mongoose = require('mongoose')

// Define the user schema
const userSchema = new mongoose.Schema({
    discordUserId: {
        type: String,
        required: true,
        unique: true,
    },
    youtubeId: {
        type: String,
        required: true,
    },
})

// Export the model
module.exports = mongoose.model('User', userSchema)
