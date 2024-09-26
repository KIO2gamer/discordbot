const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { handleError } = require('../../bot_utils/errorHandler.js');

module.exports = {
    description_full:
        'Adds a role to the roles.json data file. Useful for managing roles that your bot might need to reference.',
    usage: '/add_role_to_data <role:role>',
    examples: ['/add_role_to_data role:Moderators'],
    data: new SlashCommandBuilder()
        .setName('add_role_to_data')
        .setDescription('Adds a role to the json file data.')
        .addRoleOption((option) =>
            option
                .setName('role')
                .setDescription('The role to add')
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
        .addIntegerOption((option) =>
            option
                .setName('maxsubs')
                .setDescription('Maximum number of subscribers')
                .setRequired(false)
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const fileChoices = interaction.options.getString('file');
        const maxsubs = interaction.options.getInteger('maxsubs');

        try {
            const sent = await interaction.deferReply({ ephemeral: true });

            fs.readFile(fileChoices, 'utf8', async (err, data) => {
                if (err) {
                    console.error(err);
                    await interaction.editReply('An error occurred while reading the file.');
                    throw new Error('An error occurred while reading the file.');
                }

                let jsonData = {};
                try {
                    jsonData = JSON.parse(data);
                } catch (parseError) {
                    console.warn(
                        'File was empty or contained invalid JSON. Starting with an empty object.'
                    );
                }

                if (!jsonData.roles) {
                    jsonData.roles = [];
                }

                // Check for Duplicates:
                const roleExists = jsonData.roles.some(
                    (existingRole) => existingRole.roleID === role.id
                );

                if (roleExists) {
                    return interaction.editReply(
                        `The role "${role.name}" is already in the data!`
                    );
                }

                const roleData = {
                    roleID: role.id,
                    roleName: role.name,
                    roleColor: role.color.toString(16),
                };

                if (maxsubs !== null) {
                    roleData.maxSubs = maxsubs;
                }

                jsonData.roles.push(roleData);

                fs.writeFile(
                    fileChoices,
                    JSON.stringify(jsonData, null, 2),
                    async (err) => {
                        if (err) {
                            console.error(err);
                            return interaction.editReply(
                                'An error occurred while writing to the file.'
                            );
                        }
                        await interaction.editReply('Role data successfully added to the file!');
                    }
                );
            });
        } catch (error) {
            handleError(error, interaction);
        }
    },
};
