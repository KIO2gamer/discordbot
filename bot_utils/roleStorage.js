const mongoose = require('mongoose')

const RoleSchema = new mongoose.Schema({
    roleID: String,
    roleName: String,
    roleColor: String
})

module.exports = mongoose.model('Role', RoleSchema)
