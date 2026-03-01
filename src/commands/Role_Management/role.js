const {
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    MessageFlags,
} = require("discord.js");

const { handleError } = require("../../utils/errorHandler");
const {
    formatCategorizedPermissions,
    splitPermissionText,
} = require("../../utils/permissionFormatter");

// Create command with subcommands
const command = new SlashCommandBuilder()
    .setName("role")
    .setDescription("Role management system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    // Info subcommand
    .addSubcommand((sub) =>
        sub
            .setName("info")
            .setDescription("Get detailed information about a role")
            .addRoleOption((opt) =>
                opt.setName("role").setDescription("The role to get info about").setRequired(true),
            ),
    )
    // Edit subcommand
    .addSubcommand((sub) =>
        sub
            .setName("edit")
            .setDescription("Edit a role's properties")
            .addRoleOption((opt) =>
                opt.setName("role").setDescription("The role to edit").setRequired(true),
            )
            .addStringOption((opt) => opt.setName("name").setDescription("New role name"))
            .addStringOption((opt) =>
                opt.setName("color").setDescription("New color (hex format: #RRGGBB)"),
            )
            .addBooleanOption((opt) =>
                opt.setName("hoist").setDescription("Display separately in member list"),
            )
            .addBooleanOption((opt) =>
                opt.setName("mentionable").setDescription("Allow mentioning this role"),
            ),
    )
    // Assign subcommand
    .addSubcommand((sub) =>
        sub
            .setName("assign")
            .setDescription("Give a role to a user")
            .addUserOption((opt) =>
                opt
                    .setName("user")
                    .setDescription("The user to assign the role to")
                    .setRequired(true),
            )
            .addRoleOption((opt) =>
                opt.setName("role").setDescription("The role to assign").setRequired(true),
            ),
    )
    // Remove subcommand
    .addSubcommand((sub) =>
        sub
            .setName("remove")
            .setDescription("Remove a role from a user")
            .addUserOption((opt) =>
                opt
                    .setName("user")
                    .setDescription("The user to remove the role from")
                    .setRequired(true),
            )
            .addRoleOption((opt) =>
                opt.setName("role").setDescription("The role to remove").setRequired(true),
            ),
    )
    // List subcommand
    .addSubcommand((sub) =>
        sub
            .setName("list")
            .setDescription("Show all roles in the server")
            .addStringOption((opt) =>
                opt.setName("filter").setDescription("Filter: all, managed, hoisted, regular"),
            )
            .addIntegerOption((opt) =>
                opt.setName("page").setDescription("Page number").setMinValue(1),
            ),
    )
    // Bulk assign subcommand
    .addSubcommand((sub) =>
        sub
            .setName("bulk_assign")
            .setDescription("Assign multiple roles to a user at once")
            .addUserOption((opt) =>
                opt.setName("user").setDescription("User to assign roles to").setRequired(true),
            )
            .addStringOption((opt) =>
                opt
                    .setName("roles")
                    .setDescription("Role IDs or mentions (comma-separated)")
                    .setRequired(true),
            ),
    )
    // Create subcommand
    .addSubcommand((sub) =>
        sub
            .setName("create")
            .setDescription("Create a new role")
            .addStringOption((opt) =>
                opt.setName("name").setDescription("Role name").setRequired(true),
            )
            .addStringOption((opt) =>
                opt.setName("color").setDescription("Role color (hex format: #RRGGBB)"),
            )
            .addBooleanOption((opt) => opt.setName("hoist").setDescription("Display separately"))
            .addBooleanOption((opt) =>
                opt.setName("mentionable").setDescription("Allow mentioning"),
            )
            .addStringOption((opt) =>
                opt.setName("permissions").setDescription("Comma-separated permissions"),
            ),
    )
    // Delete subcommand
    .addSubcommand((sub) =>
        sub
            .setName("delete")
            .setDescription("Delete a role")
            .addRoleOption((opt) =>
                opt.setName("role").setDescription("The role to delete").setRequired(true),
            ),
    );

module.exports = {
    cooldown: 10,
    description_full: "Complete role management system",
    usage: "/role <subcommand> [options]",
    examples: [
        "/role info role:@Admin",
        "/role edit role:@Mod name:Moderator color:#FF0000",
        "/role assign user:@someone role:@VIP",
        "/role list",
        "/role create name:NewRole color:#00FF00",
    ],

    data: command,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case "info":
                    await handleRoleInfo(interaction);
                    break;
                case "edit":
                    await handleRoleEdit(interaction);
                    break;
                case "assign":
                    await handleRoleAssign(interaction);
                    break;
                case "remove":
                    await handleRoleRemove(interaction);
                    break;
                case "list":
                    await handleRoleList(interaction);
                    break;
                case "bulk_assign":
                    await handleBulkAssign(interaction);
                    break;
                case "create":
                    await handleRoleCreate(interaction);
                    break;
                case "delete":
                    await handleRoleDelete(interaction);
                    break;
            }
        } catch (error) {
            await handleError(interaction, error, "ROLE_MANAGEMENT", "An error occurred");
        }
    },
};

// Role info handler
async function handleRoleInfo(interaction) {
    const role = interaction.options.getRole("role");
    if (!role) return interaction.reply("Role not found");

    // Get member info
    const members = role.members.map((m) => ({ tag: m.user.tag, isBot: m.user.bot }));
    const memberStats = {
        total: members.length,
        bots: members.filter((m) => m.isBot).length,
        humans: members.filter((m) => !m.isBot).length,
    };

    // Create embed
    const embed = new EmbedBuilder()
        .setTitle(`Role: ${role.name}`)
        .setColor(role.color || "#000000")
        .addFields(
            {
                name: "General",
                value: [
                    `**ID:** ${role.id}`,
                    `**Name:** ${role.name}`,
                    `**Color:** ${role.hexColor}`,
                    `**Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:R>`,
                    `**Members:** ${memberStats.total} (${memberStats.humans} humans, ${memberStats.bots} bots)`,
                ].join("\n"),
            },
            {
                name: "Settings",
                value: [
                    `**Position:** ${role.position}`,
                    `**Mentionable:** ${role.mentionable ? "Yes" : "No"}`,
                    `**Displayed Separately:** ${role.hoist ? "Yes" : "No"}`,
                    `**Managed:** ${role.managed ? "Yes (Integration)" : "No"}`,
                ].join("\n"),
            },
        );

    // Add permissions
    const permText = formatCategorizedPermissions(role.permissions);
    const permParts = splitPermissionText(permText);
    embed.addFields({ name: "Permissions", value: permParts[0] || "None" });

    await interaction.reply({ embeds: [embed] });
}

// Role edit handler
async function handleRoleEdit(interaction) {
    const role = interaction.options.getRole("role");
    const name = interaction.options.getString("name");
    const color = interaction.options.getString("color");
    const hoist = interaction.options.getBoolean("hoist");
    const mentionable = interaction.options.getBoolean("mentionable");

    // Check permission hierarchy
    if (interaction.guild.members.me.roles.highest.position <= role.position) {
        return interaction.reply("I cannot edit roles higher than my own role");
    }

    // Edit role
    await role.edit({
        name: name || role.name,
        color: color || role.color,
        hoist: hoist !== null ? hoist : role.hoist,
        mentionable: mentionable !== null ? mentionable : role.mentionable,
    });

    await interaction.reply(`Role ${role} updated successfully!`);
}

// Role assign handler
async function handleRoleAssign(interaction) {
    const user = interaction.options.getUser("user");
    const role = interaction.options.getRole("role");
    const member = await interaction.guild.members.fetch(user.id);

    // Check permissions
    if (interaction.guild.members.me.roles.highest.position <= role.position) {
        return interaction.reply("I cannot assign roles higher than my own role");
    }

    if (member.roles.cache.has(role.id)) {
        return interaction.reply(`${user} already has the ${role} role`);
    }

    await member.roles.add(role);
    await interaction.reply(`Added ${role} role to ${user}`);
}

// Role remove handler
async function handleRoleRemove(interaction) {
    const user = interaction.options.getUser("user");
    const role = interaction.options.getRole("role");
    const member = await interaction.guild.members.fetch(user.id);

    // Check permissions
    if (interaction.guild.members.me.roles.highest.position <= role.position) {
        return interaction.reply("I cannot remove roles higher than my own role");
    }

    if (!member.roles.cache.has(role.id)) {
        return interaction.reply(`${user} doesn't have the ${role} role`);
    }

    await member.roles.remove(role);
    await interaction.reply(`Removed ${role} role from ${user}`);
}

// Role list handler with pagination
async function handleRoleList(interaction) {
    const filter = interaction.options.getString("filter") || "all";
    const pageNum = interaction.options.getInteger("page") || 1;
    const rolesPerPage = 10;

    const allRoles = interaction.guild.roles.cache.sort((a, b) => b.position - a.position);

    // Filter roles
    let filtered;
    switch (filter) {
        case "managed":
            filtered = allRoles.filter((r) => r.managed);
            break;
        case "hoisted":
            filtered = allRoles.filter((r) => r.hoist && !r.managed);
            break;
        case "regular":
            filtered = allRoles.filter((r) => !r.hoist && !r.managed);
            break;
        default:
            filtered = allRoles;
    }

    const totalPages = Math.ceil(filtered.size / rolesPerPage);
    const page = Math.max(1, Math.min(pageNum, totalPages));

    const rolesArray = Array.from(filtered.values());
    const start = (page - 1) * rolesPerPage;
    const pageRoles = rolesArray.slice(start, start + rolesPerPage);

    const embed = new EmbedBuilder()
        .setTitle(`🎯 Server Roles (${filtered.size} total, ${filter.toUpperCase()})`)
        .setColor("Orange")
        .setDescription(
            pageRoles.map((r) => `${r}: **${r.members.size}** members`).join("\n") || "No roles",
        )
        .setFooter({
            text: `Page ${page} of ${totalPages || 1} | Use page: option to navigate`,
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// Bulk assign roles to a user
async function handleBulkAssign(interaction) {
    const user = interaction.options.getUser("user");
    const rolesInput = interaction.options.getString("roles");
    const member = await interaction.guild.members.fetch(user.id);

    // Parse role input (IDs or mentions)
    const roleMatches = rolesInput.match(/<@&(\d+)>|\b\d{17,19}\b/g) || [];
    const roleIds = roleMatches.map((m) => m.replace(/[<@&>]/g, ""));

    if (roleIds.length === 0) {
        return interaction.reply({
            content: "⚠️ No valid roles found. Use role IDs or @mentions (comma-separated).",
            flags: MessageFlags.Ephemeral,
        });
    }

    let assigned = 0;
    let failed = 0;
    const errors = [];

    for (const roleId of roleIds) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            failed++;
            errors.push(`Role \`${roleId}\` not found`);
            continue;
        }

        if (interaction.guild.members.me.roles.highest.position <= role.position) {
            failed++;
            errors.push(`Can't assign ${role.name} (higher than my role)`);
            continue;
        }

        if (member.roles.cache.has(role.id)) {
            failed++;
            errors.push(`${user.username} already has ${role.name}`);
            continue;
        }

        try {
            await member.roles.add(role);
            assigned++;
        } catch {
            failed++;
            errors.push(`Failed to assign ${role.name}`);
        }
    }

    const resultEmbed = new EmbedBuilder()
        .setTitle("📋 Bulk Assign Results")
        .setColor(assigned > 0 ? "Green" : "Red")
        .addFields(
            {
                name: "Assigned",
                value: `✅ ${assigned} role${assigned !== 1 ? "s" : ""}`,
                inline: true,
            },
            { name: "Failed", value: `❌ ${failed} role${failed !== 1 ? "s" : ""}`, inline: true },
        );

    if (errors.length > 0) {
        resultEmbed.addFields({
            name: "Issues",
            value:
                errors.slice(0, 5).join("\n") +
                (errors.length > 5 ? `\n...+${errors.length - 5} more` : ""),
        });
    }

    await interaction.reply({ embeds: [resultEmbed], flags: MessageFlags.Ephemeral });
}

// Role create handler
async function handleRoleCreate(interaction) {
    const name = interaction.options.getString("name");
    const color = interaction.options.getString("color");
    const hoist = interaction.options.getBoolean("hoist");
    const mentionable = interaction.options.getBoolean("mentionable");
    const permsString = interaction.options.getString("permissions");

    // Create permissions
    let permissions = 0n;
    if (permsString) {
        try {
            const perms = permsString.split(",").map((p) => p.trim().toUpperCase());
            permissions = perms.reduce((acc, p) => acc | PermissionFlagsBits[p], 0n);
        } catch {
            return interaction.reply("Invalid permissions format");
        }
    }

    // Create role
    const role = await interaction.guild.roles.create({
        name,
        color: color || null,
        hoist: hoist || false,
        mentionable: mentionable || false,
        permissions,
        reason: `Created by ${interaction.user.tag}`,
    });

    await interaction.reply(`Created role ${role}`);
}

// Role delete handler
async function handleRoleDelete(interaction) {
    const role = interaction.options.getRole("role");

    // Check permissions
    if (interaction.guild.members.me.roles.highest.position <= role.position) {
        return interaction.reply("I cannot delete roles higher than my own role");
    }

    await role.delete(`Deleted by ${interaction.user.tag}`);
    await interaction.reply(`Deleted role: ${role.name}`);
}
