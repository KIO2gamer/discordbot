const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags,
} = require("discord.js");
const { handleError } = require("../../utils/errorHandler.js");
const RoleModel = require("./../../database/roleStorage.js");

module.exports = {
    cooldown: 10,
    description_full:
        "Manage roles stored in the database (add, view, edit, delete) via one command.",
    usage: "/roles_data <add|view|edit|delete> ...",
    examples: [
        "/roles_data add role:@Moderators",
        "/roles_data view",
        "/roles_data edit role:@VIP name:Very Important color:#FFD700",
        "/roles_data delete role:@Guests",
    ],

    data: new SlashCommandBuilder()
        .setName("roles_data")
        .setDescription("Manage stored roles in the database")
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Add a role to the database")
                .addRoleOption((opt) =>
                    opt.setName("role").setDescription("Role to add").setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("view")
                .setDescription("View stored roles")
                .addStringOption((opt) =>
                    opt.setName("search").setDescription("Search roles by name (optional)"),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("edit")
                .setDescription("Edit a stored role's name or color")
                .addRoleOption((opt) =>
                    opt.setName("role").setDescription("Role to edit").setRequired(true),
                )
                .addStringOption((opt) =>
                    opt.setName("name").setDescription("New name for the stored role"),
                )
                .addStringOption((opt) =>
                    opt.setName("color").setDescription("New color in hex format (#RRGGBB)"),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("delete")
                .setDescription("Delete a role from the database")
                .addRoleOption((opt) =>
                    opt.setName("role").setDescription("Role to delete").setRequired(true),
                ),
        )
        .addSubcommand((sub) =>
            sub.setName("stats").setDescription("View database role statistics"),
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        try {
            if (sub === "add") return this.handleAdd(interaction);
            if (sub === "view") return this.handleView(interaction);
            if (sub === "edit") return this.handleEdit(interaction);
            if (sub === "delete") return this.handleDelete(interaction);
            if (sub === "stats") return this.handleStats(interaction);
        } catch (error) {
            await handleError(
                interaction,
                error,
                "ROLE_DB",
                "An error occurred handling roles data",
            );
        }
    },

    async handleAdd(interaction) {
        // Permission check (ManageRoles) for mutating operations
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                content: "⚠️ You need the Manage Roles permission to add stored roles.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const role = interaction.options.getRole("role");

        try {
            const existing = await RoleModel.findOne({ roleID: role.id });
            if (existing) {
                return interaction.reply({
                    content: `The role "${role.name}" is already in the database!`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            const roleData = {
                roleID: role.id,
                roleName: role.name,
                roleColor: role.color?.toString(16) || role.hexColor?.replace("#", "") || "000000",
            };

            await new RoleModel(roleData).save();

            await interaction.reply({
                content: `✅ Role "${role.name}" successfully added to the database!`,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async handleView(interaction) {
        try {
            const search = interaction.options.getString("search");
            let roles = await RoleModel.find();

            if (!roles || roles.length === 0) {
                return interaction.reply({ content: "There are no roles stored in the database." });
            }

            // Filter by search term if provided
            if (search) {
                roles = roles.filter((r) =>
                    r.roleName.toLowerCase().includes(search.toLowerCase()),
                );

                if (roles.length === 0) {
                    return interaction.reply({
                        content: `No stored roles found matching "${search}".`,
                        flags: MessageFlags.Ephemeral,
                    });
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(`📋 Stored Roles ${search ? `(Search: "${search}")` : ""}`)
                .setColor("#00FFFF")
                .setDescription(
                    roles
                        .map(
                            (r, i) =>
                                `${i + 1}. **${r.roleName}** (ID: \`${r.roleID}\`, Color: #\`${r.roleColor}\`)`,
                        )
                        .join("\n"),
                )
                .setFooter({ text: `Total: ${roles.length} role(s)` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async handleStats(interaction) {
        try {
            const allRoles = await RoleModel.find();
            const total = allRoles.length;

            if (total === 0) {
                return interaction.reply({
                    content: "📊 No stored roles in the database yet.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const sorted = allRoles.sort((a, b) => new Date(b._id) - new Date(a._id));
            const recent = sorted.slice(0, 3);

            const embed = new EmbedBuilder()
                .setTitle("📊 Role Database Statistics")
                .setColor("#FFD700")
                .addFields(
                    {
                        name: "Total Stored",
                        value: `${total} role${total !== 1 ? "s" : ""}`,
                        inline: true,
                    },
                    {
                        name: "Database Size",
                        value: `${(allRoles.length * 0.05).toFixed(2)} KB (approx)`,
                        inline: true,
                    },
                )
                .setTimestamp();

            if (recent.length > 0) {
                embed.addFields({
                    name: "Recently Added",
                    value: recent.map((r) => `• **${r.roleName}**`).join("\n"),
                    inline: false,
                });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async handleEdit(interaction) {
        // Permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                content: "⚠️ You need the Manage Roles permission to edit stored roles.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const role = interaction.options.getRole("role");
        const newName = interaction.options.getString("name");
        const newColor = interaction.options.getString("color");

        try {
            const existing = await RoleModel.findOne({ roleID: role.id });
            if (!existing) {
                return interaction.reply({
                    content: `The role "${role.name}" was not found in the database!`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (!newName && !newColor) {
                return interaction.reply({
                    content: "⚠️ Nothing to update. Provide either a new name or color.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (newName) existing.roleName = newName;
            if (newColor) existing.roleColor = newColor.replace("#", "");

            await existing.save();

            await interaction.reply({
                content: `✅ Role "${role.name}" has been updated in the database!`,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async handleDelete(interaction) {
        // Permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                content: "⚠️ You need the Manage Roles permission to delete stored roles.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const role = interaction.options.getRole("role");

        try {
            const existing = await RoleModel.findOne({ roleID: role.id });
            if (!existing) {
                return interaction.reply({
                    content: `The role "${role.name}" was not found in the database!`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            await RoleModel.deleteOne({ roleID: role.id });

            await interaction.reply({
                content: `🗑️ Role "${role.name}" has been deleted from the database!`,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            await handleError(interaction, error);
        }
    },
};
