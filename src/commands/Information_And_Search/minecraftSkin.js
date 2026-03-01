const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");

const axios = require("axios");
const NodeCache = require("node-cache");
const { handleError } = require("../../utils/errorHandler.js");

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // Cache for 5 minutes (TTL: Time To Live, checkperiod: how often to check for expired entries)
const MOJANG_PROFILE_API = "https://api.mojang.com/users/profiles/minecraft/"; // Free official Mojang endpoint for username -> UUID
const CRAFATAR_BASE = "https://crafatar.com"; // Free image service for skins and renders
const EMBED_COLOR = "#2ECC71"; // A more visually appealing color for embeds
const ERROR_COLOR = "#E74C3C"; // Color for error embeds

module.exports = {
    cooldown: 10,
    description_full:
        "Retrieves general information about a Minecraft player using Mojang's API (UUID lookup) and Crafatar (skin render).",
    usage: "/minecraft <username>",
    examples: ["/minecraft Notch", "/minecraft Dinnerbone"],

    data: new SlashCommandBuilder()
        .setName("minecraft")
        .setDescription("Gets general info about a Minecraft player")
        .addStringOption((option) =>
            option.setName("username").setDescription("The Minecraft username").setRequired(true),
        ),

    async execute(interaction) {
        const username = interaction.options.getString("username");

        // Check Cache - Moved cache check to the beginning for quicker response
        const cachedEmbed = cache.get(username); // Directly cache the embed
        if (cachedEmbed) {
            await interaction.reply({
                embeds: [cachedEmbed],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        try {
            const playerData = await fetchPlayerData(username);

            if (!playerData) {
                // Player not found - Create specific error embed for better UX
                const notFoundEmbed = new EmbedBuilder()
                    .setColor(ERROR_COLOR)
                    .setTitle("Minecraft Player Not Found")
                    .setDescription(
                        `Could not find player with username: \`${username}\` on the Mojang services. Please check the username and try again.`,
                    )
                    .setTimestamp();
                await interaction.reply({
                    embeds: [notFoundEmbed],
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const infoEmbed = createInfoEmbed(playerData, username, interaction); // Pass username to embed function for potential use
            cache.set(username, infoEmbed); // Cache the created embed

            await interaction.reply({
                embeds: [infoEmbed],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            handleError("Error fetching Minecraft player data:", error);
            await handleError(interaction, error, "Failed to fetch Minecraft player data."); // More descriptive error message for handleError
        }
    },
};

async function fetchPlayerData(username) {
    try {
        // Mojang: username -> UUID
        const response = await axios.get(`${MOJANG_PROFILE_API}${encodeURIComponent(username)}`, {
            validateStatus: () => true,
        });

        // Not found (Mojang returns 204 No Content or 404)
        if (!response || response.status === 204 || response.status === 404 || !response.data) {
            return null;
        }

        if (response.status !== 200) {
            throw new Error(
                `Mojang API error: ${response.status} - ${response.statusText || "Unknown"}`,
            );
        }

        const { id, name } = response.data; // id is UUID without dashes
        const uuidRaw = String(id);
        const uuidDashed = formatUUID(uuidRaw);

        // Build Crafatar URLs
        const skinUrl = `${CRAFATAR_BASE}/skins/${uuidRaw}`; // Direct skin PNG
        const bodyRenderUrl = `${CRAFATAR_BASE}/renders/body/${uuidRaw}?overlay`; // 3D render

        return {
            username: name,
            uuid: uuidDashed,
            uuid_raw: uuidRaw,
            skinUrl,
            bodyRenderUrl,
        };
    } catch (error) {
        handleError(`Error fetching data from Mojang API for username ${username}:`, error);
        if (error.response) {
            if (error.response.status === 404 || error.response.status === 204) {
                return null;
            }
            throw new Error(
                `Mojang API error: ${error.response.status} - ${error.response.statusText}`,
            );
        } else if (error.request) {
            throw new Error("No response received from Mojang API. The service might be down.");
        } else {
            throw new Error("Error setting up the request to Mojang API.");
        }
    }
}

function formatUUID(uuidNoDashes) {
    // Ensure we have 32 hex chars, then insert dashes: 8-4-4-4-12
    const u = (uuidNoDashes || "").replace(/-/g, "").trim();
    if (u.length !== 32) return uuidNoDashes; // Fallback to original if unexpected
    return `${u.substring(0, 8)}-${u.substring(8, 12)}-${u.substring(12, 16)}-${u.substring(16, 20)}-${u.substring(20)}`;
}

function createInfoEmbed(playerData, username, interaction) {
    const uuidDashed = playerData.uuid;
    const uuidRaw = playerData.uuid_raw;
    const bodyRenderUrl = `https://crafatar.com/renders/body/${uuidDashed}?overlay`;
    const skinUrl = `https://crafatar.com/skins/${uuidDashed}`;

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setAuthor({
            name: "Minecraft Player Information",
            iconURL: "https://crafatar.com/avatars/8667ba71b85a4004af54457a9734eed7", // Minecraft Steve head
        })
        .setTitle(`🎮 ${playerData.username}`)
        .setURL(`https://namemc.com/profile/${uuidRaw}`)
        .setDescription(
            `Detailed information about Minecraft player **${playerData.username}**\n` +
                `${"-".repeat(40)}`,
        )
        .setThumbnail(`https://crafatar.com/avatars/${uuidDashed}?overlay`)
        .setImage(bodyRenderUrl)
        .addFields(
            {
                name: "👤 Player Details",
                value: [
                    `**Username:** \`${playerData.username}\``,
                    `**UUID:** \`${uuidDashed}\``,
                    `**Raw UUID:** \`${uuidRaw}\``,
                ].join("\n"),
                inline: false,
            },
            {
                name: "🖼️ Resources",
                value: [
                    `📥 [Download Skin](${skinUrl})`,
                    `🎨 [Download 3D Render](${bodyRenderUrl})`,
                    `🌐 [View on NameMC](https://namemc.com/profile/${uuidRaw})`,
                ].join("\n"),
                inline: false,
            },
        )
        .setFooter({
            text: `Data from Mojang API & Crafatar • Requested by ${interaction.user.tag}`,
            iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setTimestamp();

    return embed;
}
