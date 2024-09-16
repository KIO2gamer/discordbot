const { SlashCommandBuilder } = require('discord.js')
const fs = require('fs')

module.exports = {
    description_full:
        'Edits the name and/or color of a role stored in the roles.json data file. Provide either the name, color, or both to update.',
    usage: '/edit_role_in_data <role:role> [name:new_name] [color:#hexcolor]',
    examples: [
        '/edit_role_in_data role:Moderators name:"Senior Moderators"',
        '/edit_role_in_data role:VIP color:#FFD700',
    ],
    data: new SlashCommandBuilder()
        .setName('edit_role_in_data')
        .setDescription('Edits a role in the json file data.')
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role to edit')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('file')
                .setDescription('Which file you want to store role data into?')
                .setRequired(true)
                .addChoices(
                    {
                        name: 'Sub Roles',
                        value: './assets/json/subRoles.json',
                    },
                    { name: 'Other Roles', value: './assets/json/roles.json' }
                )
        )
        .addStringOption((option) =>
            option
                .setName('name')
                .setDescription('The new name for the role')
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('color')
                .setDescription(
                    'The new color for the role in hex format (#000000)'
                )
                .setRequired(false)
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('role')
        const newName = interaction.options.getString('name')
        const newColor = interaction.options.getString('color')
        const fileChoices = interaction.options.getString('file')

        fs.readFile(fileChoices, 'utf8', (err, data) => {
            if (fileChoices === './assets/json/roles.json') {
                if (err) {
                    console.error(err)
                    return interaction.reply(
                        'An error occurred while reading the file.'
                    )
                }

                let jsonData = {}
                try {
                    jsonData = JSON.parse(data)
                } catch (parseError) {
                    console.warn(
                        'File was empty or contained invalid JSON. Starting with an empty object.'
                    )
                }

                if (!jsonData.roles) {
                    jsonData.roles = []
                }

                const roleIndex = jsonData.roles.findIndex(
                    (existingRole) => existingRole.roleID === role.id
                )
                if (roleIndex === -1) {
                    return interaction.reply(
                        `The role "${role.name}" was not found in the data!`
                    )
                }

                if (newName) {
                    jsonData.roles[roleIndex].roleName = newName
                }
                if (newColor) {
                    jsonData.roles[roleIndex].roleColor = newColor
                }

                fs.writeFile(
                    fileChoices,
                    JSON.stringify(jsonData, null, 2),
                    (err) => {
                        if (err) {
                            console.error(err)
                            return interaction.reply(
                                'An error occurred while writing to the file.'
                            )
                        }
                        interaction.reply(
                            `Role "${role.name}" has been updated in the data!`
                        )
                    }
                )
            } else {
                if (err) {
                    console.error(err)
                    return interaction.reply(
                        'An error occurred while reading the file.'
                    )
                }

                let jsonData = {}
                try {
                    jsonData = JSON.parse(data)
                } catch (parseError) {
                    console.warn(
                        'File was empty or contained invalid JSON. Starting with an empty object.'
                    )
                }

                if (!jsonData.roles) {
                    jsonData.roles = []
                }

                const roleIndex = jsonData.roles.findIndex(
                    (existingRole) => existingRole.roleID === role.id
                )
                if (roleIndex === -1) {
                    return interaction.reply(
                        `The role "${role.name}" was not found in the data!`
                    )
                }

                if (newName) {
                    jsonData.roles[roleIndex].roleName = newName
                }
                if (newColor) {
                    jsonData.roles[roleIndex].roleColor = newColor
                }

                fs.writeFile(
                    fileChoices,
                    JSON.stringify(jsonData, null, 2),
                    (err) => {
                        if (err) {
                            console.error(err)
                            return interaction.reply(
                                'An error occurred while writing to the file.'
                            )
                        }
                        interaction.reply(
                            `Role "${role.name}" has been updated in the data!`
                        )
                    }
                )
            }
        })
    },
}
