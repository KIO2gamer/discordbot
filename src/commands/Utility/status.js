const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

const axios = require("axios");
const { handleError } = require("../../utils/errorHandler.js");

// Validate URL format and prevent SSRF attacks
function validateURL(urlString) {
    try {
        const url = new URL(urlString);

        // Only allow HTTP and HTTPS protocols
        if (!["http:", "https:"].includes(url.protocol)) {
            return { valid: false, error: "Only HTTP and HTTPS protocols are supported" };
        }

        // Prevent checking private/internal IP addresses (SSRF protection)
        const hostname = url.hostname.toLowerCase();
        const privatePatterns = [
            /^localhost$/,
            /^127\./, // 127.0.0.0/8
            /^::1$/, // IPv6 loopback
            /^10\./, // 10.0.0.0/8
            /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
            /^192\.168\./, // 192.168.0.0/16
            /^169\.254\./, // Link-local addresses
            /^fc[0-9a-f]{2}:/i, // IPv6 private
            /^fe80:/i, // IPv6 link-local
        ];

        if (privatePatterns.some((pattern) => pattern.test(hostname))) {
            return { valid: false, error: "Cannot check status of private/internal IP addresses" };
        }

        return { valid: true, url };
    } catch {
        return { valid: false, error: "Invalid URL format" };
    }
}

// Determine embed color based on status code
function getStatusColor(statusCode) {
    if (statusCode >= 200 && statusCode < 300) return "#00ff00"; // Green - Success
    if (statusCode >= 300 && statusCode < 400) return "#FFD700"; // Gold - Redirect
    if (statusCode >= 400 && statusCode < 500) return "#FFA500"; // Orange - Client error
    if (statusCode >= 500) return "#ff0000"; // Red - Server error
    return "#808080"; // Gray - Unknown
}

// Format response size
function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

module.exports = {
    cooldown: 10,
    description_full:
        "Check the status of a server or service by providing a URL. This command will return detailed information such as the status code, content type, server details, response time, and more.",
    usage: "/status <url>",
    examples: [
        "/status https://www.example.com",
        "/status https://api.github.com",
        "/status https://discord.com",
    ],

    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("Check the status of a server or service")
        .addStringOption((option) =>
            option.setName("url").setDescription("URL to check").setRequired(true),
        ),

    async execute(interaction) {
        const urlInput = interaction.options.getString("url");

        // Validate URL first
        const validation = validateURL(urlInput);
        if (!validation.valid) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ff0000")
                .setTitle("❌ Invalid URL")
                .setDescription(validation.error)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Defer reply as the request might take a moment
        await interaction.deferReply();

        try {
            const startTime = Date.now();
            const response = await axios.get(validation.url.href, {
                timeout: 10000, // 10 second timeout
                maxRedirects: 5,
                validateStatus: () => true, // Accept all status codes
                headers: {
                    "User-Agent": "Kiyo-Discord-Bot/1.0 (+https://github.com)",
                },
            });
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            const contentType = response.headers["content-type"] || "Unknown";
            const contentLength = response.headers["content-length"];
            const lastModified = response.headers["last-modified"] || "N/A";
            const cacheControl = response.headers["cache-control"] || "N/A";
            const server = response.headers["server"] || "N/A";

            const fields = [
                {
                    name: "Status Code",
                    value: `${response.status} ${response.statusText}`,
                    inline: true,
                },
                {
                    name: "Response Time",
                    value: `${responseTime} ms`,
                    inline: true,
                },
                {
                    name: "Content Type",
                    value: contentType.split(";")[0], // Remove charset if present
                    inline: true,
                },
            ];

            if (contentLength) {
                fields.push({
                    name: "Content Size",
                    value: formatBytes(parseInt(contentLength)),
                    inline: true,
                });
            }

            fields.push(
                {
                    name: "Server",
                    value: server === "N/A" ? "Not disclosed" : server,
                    inline: true,
                },
                {
                    name: "Cache Control",
                    value: cacheControl,
                    inline: true,
                },
                {
                    name: "Last Modified",
                    value: lastModified,
                    inline: false,
                },
            );

            const embed = new EmbedBuilder()
                .setColor(getStatusColor(response.status))
                .setTitle("🌐 Server Status Check")
                .setDescription(`Status of **${validation.url.hostname}**`)
                .addFields(...fields)
                .setTimestamp()
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            const errorTitle = "❌ Error Checking Status";
            let errorDescription = "An unknown error occurred";

            if (error.code === "ENOTFOUND") {
                errorDescription = "The domain name could not be resolved.";
            } else if (error.code === "ECONNREFUSED") {
                errorDescription = "The connection was refused by the server.";
            } else if (error.code === "ECONNABORTED") {
                errorDescription = "Request timeout: The server took too long to respond (>10s).";
            } else if (error.code === "ERR_TLS_CERT_AUTH_ERROR") {
                errorDescription = "SSL/TLS certificate validation failed.";
            } else if (error.message.includes("timeout")) {
                errorDescription = "Request timeout: The server took too long to respond.";
            } else if (error.message) {
                errorDescription = error.message;
            }

            const errorEmbed = new EmbedBuilder()
                .setColor("#ff0000")
                .setTitle(errorTitle)
                .setDescription(errorDescription)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            await interaction.editReply({ embeds: [errorEmbed] });

            // Log the error in console for debugging
            handleError("Error fetching server status:", error);
        }
    },
};
