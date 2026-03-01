const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} = require("discord.js");

const { google } = require("googleapis");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 10,
    description_full:
        "YouTube tools: view channel statistics or search videos. Consolidates /ytstats and /youtube_search into one command.",
    usage: "/youtube stats <channel> | /youtube search <query> [filters]",
    examples: [
        "/youtube stats channel:@Markiplier",
        "/youtube search query:coding tutorials order:viewCount duration:long",
    ],

    data: new SlashCommandBuilder()
        .setName("youtube")
        .setDescription("YouTube utilities: stats and search")
        .addSubcommand((sub) =>
            sub
                .setName("stats")
                .setDescription("Get YouTube channel statistics")
                .addStringOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Channel URL, ID, handle (@username), or video URL")
                        .setRequired(true)
                        .setMinLength(2)
                        .setMaxLength(200),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("search")
                .setDescription("Search for YouTube videos")
                .addStringOption((option) =>
                    option.setName("query").setDescription("The search query").setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Filter by channel name")
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName("duration")
                        .setDescription("Filter by video duration")
                        .setRequired(false)
                        .addChoices(
                            { name: "Any", value: "any" },
                            { name: "Short (< 4 minutes)", value: "short" },
                            { name: "Medium (4-20 minutes)", value: "medium" },
                            { name: "Long (> 20 minutes)", value: "long" },
                        ),
                )
                .addStringOption((option) =>
                    option
                        .setName("order")
                        .setDescription("Order of search results")
                        .setRequired(false)
                        .addChoices(
                            { name: "Relevance", value: "relevance" },
                            { name: "Date", value: "date" },
                            { name: "View Count", value: "viewCount" },
                            { name: "Rating", value: "rating" },
                        ),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max_results")
                        .setDescription("Maximum number of results per page (1-10)")
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10),
                ),
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "stats") {
            return executeStats(interaction);
        }
        if (sub === "search") {
            return executeSearch(interaction);
        }
        return interaction.reply({ content: "Unknown subcommand.", flags: MessageFlags.Ephemeral });
    },
};

// ========== YOUTUBE STATS IMPLEMENTATION ==========
async function executeStats(interaction) {
    try {
        await interaction.deferReply();

        const channelInput = interaction.options.getString("channel");
        const apiKey = process.env.YOUTUBE_API_KEY;

        if (!apiKey) {
            await handleError(
                interaction,
                new Error("API key missing"),
                "CONFIGURATION",
                "The YouTube API is not properly configured. Please contact the bot administrator.",
            );
            return;
        }

        try {
            const youtube = google.youtube({
                version: "v3",
                auth: apiKey,
            });

            const channelId = await extractChannelId(youtube, channelInput).catch((error) => {
                if (error.code === 403) throw error;
                return null;
            });

            if (!channelId) {
                await handleError(
                    interaction,
                    new Error("Invalid channel"),
                    "VALIDATION",
                    "Could not find a valid YouTube channel. Please check your input and try again.",
                );
                return;
            }

            const channelData = await getChannelData(youtube, channelId);
            if (!channelData) {
                await handleError(
                    interaction,
                    new Error("Channel not found"),
                    "NOT_FOUND",
                    "The specified YouTube channel could not be found.",
                );
                return;
            }

            const [latestVideos, playlistsData] = await Promise.all([
                getLatestVideos(youtube, channelId),
                getPlaylistsCount(youtube, channelId),
            ]);

            const embed = createChannelEmbed(channelData, latestVideos, channelId, playlistsData);
            const components = createChannelButtons(channelData, latestVideos);

            await interaction.editReply({
                embeds: [embed],
                components: [components],
            });
        } catch (error) {
            if (error.code === 403) {
                await handleError(
                    interaction,
                    error,
                    "API_ERROR",
                    "The YouTube API quota has been exceeded. Please try again tomorrow.",
                );
            } else if (error.code === 404) {
                await handleError(
                    interaction,
                    error,
                    "NOT_FOUND",
                    "The specified YouTube channel or video could not be found.",
                );
            } else if (error.code === 400) {
                await handleError(
                    interaction,
                    error,
                    "VALIDATION",
                    "Invalid input format. Please provide a valid YouTube channel URL, ID, or handle.",
                );
            } else {
                await handleError(
                    interaction,
                    error,
                    "API_ERROR",
                    "An error occurred while fetching YouTube data. Please try again later.",
                );
            }
        }
    } catch (error) {
        await handleError(
            interaction,
            error,
            "COMMAND_EXECUTION",
            "An error occurred while processing the YouTube statistics request.",
        );
    }
}

async function extractChannelId(youtube, input) {
    if (/^UC[\w-]{21}[AQgw]$/.test(input)) {
        return input;
    }

    const channelMatch = input.match(
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|c)\/(UC[\w-]{21}[AQgw])/,
    );
    if (channelMatch) {
        return channelMatch[1];
    }

    const videoMatch = input.match(
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/,
    );
    if (videoMatch) {
        const response = await youtube.videos.list({
            part: "snippet",
            id: videoMatch[1],
        });
        if (response.data.items.length > 0) {
            return response.data.items[0].snippet.channelId;
        }
    }

    const searchTerm = input.includes("@") ? input.replace("@", "") : input.replace(/.*\//, "");
    const response = await youtube.search.list({
        part: "snippet",
        q: searchTerm,
        type: "channel",
        maxResults: 1,
    });

    return response.data.items.length > 0 ? response.data.items[0].snippet.channelId : null;
}

async function getChannelData(youtube, channelId) {
    const response = await youtube.channels.list({
        part: "snippet,statistics,brandingSettings,contentDetails,status,topicDetails",
        id: channelId,
    });

    if (response.data.items.length === 0) {
        return null;
    }

    return response.data.items[0];
}

async function getLatestVideos(youtube, channelId) {
    const response = await youtube.search.list({
        part: "id,snippet",
        channelId: channelId,
        type: "video",
        order: "date",
        maxResults: 5,
    });

    if (response.data.items.length === 0) {
        return [];
    }

    const videoIds = response.data.items.map((item) => item.id.videoId);
    const statsResponse = await youtube.videos.list({
        part: "statistics,contentDetails,liveStreamingDetails",
        id: videoIds.join(","),
    });

    return response.data.items.map((item, index) => {
        const statsItem = statsResponse.data.items[index];
        if (!statsItem) return item;

        item.statistics = statsItem.statistics || {};
        item.contentDetails = statsItem.contentDetails || {};
        item.liveStreamingDetails = statsItem.liveStreamingDetails || {};
        return item;
    });
}

async function getPlaylistsCount(youtube, channelId) {
    try {
        const response = await youtube.playlists.list({
            part: "id",
            channelId: channelId,
            maxResults: 0,
        });
        return {
            totalCount: response.data.pageInfo.totalResults,
            error: null,
        };
    } catch (error) {
        return {
            totalCount: 0,
            error: error.message,
        };
    }
}

function formatNumber(num) {
    if (!num) return "0";
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + "B";
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
}

function calculateEngagementRateFromVideos(videos = []) {
    let totalViews = 0;
    let totalInteractions = 0;
    let counted = 0;

    for (const video of videos) {
        const stats = video.statistics || {};
        const views = Number(stats.viewCount || 0);
        const likes = Number(stats.likeCount || 0);
        const comments = Number(stats.commentCount || 0);

        if (views <= 0) continue;

        totalViews += views;
        totalInteractions += likes + comments;
        counted += 1;
    }

    if (counted === 0 || totalViews === 0) return "N/A";

    const rate = ((totalInteractions / totalViews) * 100).toFixed(2);
    return `${rate}% (last ${counted} videos)`;
}

function formatDuration(duration) {
    if (!duration) return "0:00";
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "0:00";

    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
}

function createChannelButtons(channelData, latestVideos) {
    const buttons = [];

    buttons.push(
        new ButtonBuilder()
            .setLabel("Channel")
            .setStyle(ButtonStyle.Link)
            .setURL(`https://youtube.com/channel/${channelData.id}`),
    );

    if (latestVideos.length > 0) {
        buttons.push(
            new ButtonBuilder()
                .setLabel("Latest Video")
                .setStyle(ButtonStyle.Link)
                .setURL(`https://youtube.com/watch?v=${latestVideos[0].id.videoId}`),
        );
    }

    if (channelData.snippet.customUrl) {
        buttons.push(
            new ButtonBuilder()
                .setLabel("Custom URL")
                .setStyle(ButtonStyle.Link)
                .setURL(`https://youtube.com/${channelData.snippet.customUrl}`),
        );
    }

    const row = new ActionRowBuilder().addComponents(...buttons);
    return row;
}

function createStatisticsField(statistics, playlistsData, engagementRateDisplay = "N/A") {
    const fields = [
        `**Subscribers:** ${statistics.hiddenSubscriberCount ? "🔒 Hidden" : formatNumber(statistics.subscriberCount)}`,
        `**Total Views:** ${formatNumber(statistics.viewCount)}`,
        `**Total Videos:** ${formatNumber(statistics.videoCount)}`,
        `**Avg. Engagement:** ${engagementRateDisplay}`,
    ];

    if (playlistsData?.totalCount) {
        fields.push(`**Playlists:** ${formatNumber(playlistsData.totalCount)}`);
    }

    const value = fields.join("\n").substring(0, 1024) || "No statistics available";
    return {
        name: "📊 Statistics",
        value,
        inline: true,
    };
}

function createChannelInfoField(snippet, status = {}) {
    const fields = [
        `**Created:** <t:${Math.floor(new Date(snippet.publishedAt).getTime() / 1000)}:R>`,
        `**Country:** ${snippet.country || "Not specified"}`,
        `**Language:** ${snippet.defaultLanguage || "Not specified"}`,
    ];

    if (status?.privacyStatus) fields.push(`**Privacy:** ${status.privacyStatus}`);
    if (status?.madeForKids) fields.push("**Made for Kids:** ⚠️ Yes");

    const value = fields.join("\n").substring(0, 1024) || "No channel info available";
    return {
        name: "📅 Channel Info",
        value,
        inline: true,
    };
}

function createChannelEmbed(channelData, latestVideos, channelId, playlistsData) {
    const { snippet, statistics, brandingSettings, status, topicDetails } = channelData;

    const isVerified = snippet.customUrl ? "✅ Verified" : "";
    const title = `${(snippet.title || "Unknown Channel").substring(0, 240)} ${isVerified}`.trim();

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(
            snippet.description
                ? snippet.description.slice(0, 250) +
                      (snippet.description.length > 250 ? "..." : "")
                : "No description available",
        )
        .setThumbnail(snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url)
        .setColor("#FF0000");

    const engagementRateDisplay = calculateEngagementRateFromVideos(latestVideos);

    embed.addFields(
        createStatisticsField(statistics, playlistsData, engagementRateDisplay),
        createChannelInfoField(snippet, status),
    );

    if (topicDetails?.topicCategories?.length > 0) {
        const maxTopics = 5;
        const total = Math.min(topicDetails.topicCategories.length, maxTopics);
        let topicsStr = "";
        for (let i = 0; i < total; i++) {
            const url = topicDetails.topicCategories[i];
            const topic = url.split("/").pop().replace(/_/g, " ");
            topicsStr += (i === 0 ? "" : "\n") + topic;
        }
        embed.addFields({
            name: "🏷️ Topics",
            value: topicsStr.substring(0, 1024),
            inline: false,
        });
    }

    if (latestVideos.length > 0) {
        const videoLines = [];
        for (let i = 0; i < latestVideos.length; i++) {
            const video = latestVideos[i];

            const {
                snippet: vSnippet = {},
                id: vId = {},
                statistics: vStats = {},
                contentDetails: vContent = {},
                liveStreamingDetails: vLive = {},
            } = video;

            const isLive = !vLive?.actualEndTime && Boolean(vLive?.scheduledStartTime);
            const duration = isLive ? "🔴 LIVE" : formatDuration(vContent.duration);
            const views = formatNumber(Number(vStats.viewCount || 0));
            const likes = formatNumber(Number(vStats.likeCount || 0));
            const timestamp = isLive
                ? vLive.actualStartTime || vLive.scheduledStartTime
                : vSnippet.publishedAt;
            const tsSeconds = Math.floor(new Date(timestamp || Date.now()).getTime() / 1000);

            const title = (vSnippet.title || "Untitled").replace(/\n/g, " ").substring(0, 80);
            const videoId = vId.videoId || vId;

            videoLines.push(
                `[${title}](https://youtube.com/watch?v=${videoId})\n┗ ${duration} • ${views} • ${likes} • <t:${tsSeconds}:R>`,
            );
        }

        const videoValue = videoLines.join("\n").substring(0, 1024) || "No videos found";
        embed.addFields({
            name: "📺 Latest Videos",
            value: videoValue,
            inline: false,
        });
    }

    if (brandingSettings?.channel?.featuredChannelsUrls?.length > 0) {
        embed.addFields({
            name: "🤝 Featured Channels",
            value: `This channel features ${brandingSettings.channel.featuredChannelsUrls.length} other channels`,
            inline: false,
        });
    }

    embed
        .setFooter({
            text: `Channel ID: ${channelId}`,
            iconURL: "https://www.youtube.com/s/desktop/28b67e7f/img/favicon_144x144.png",
        })
        .setTimestamp();

    return embed;
}

// ========== YOUTUBE SEARCH IMPLEMENTATION ==========
async function executeSearch(interaction) {
    if (!process.env.YOUTUBE_API_KEY) {
        await interaction.reply({
            content:
                "YouTube search service is not properly configured. Please contact an administrator.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const query = interaction.options.getString("query").trim();

    if (query.length < 2) {
        await interaction.reply({
            content: "❌ Search query must be at least 2 characters long.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const channelFilter = interaction.options.getString("channel");
    const durationFilter = interaction.options.getString("duration") || "any";
    const orderFilter = interaction.options.getString("order") || "relevance";
    const maxResults = interaction.options.getInteger("max_results") || 3;
    let currentPage = 1;
    let nextPageToken = "";
    let prevPageToken = "";

    const youtube = google.youtube({
        version: "v3",
        auth: process.env.YOUTUBE_API_KEY,
    });

    const displayResults = async () => {
        try {
            const searchParams = {
                part: "snippet",
                q: query,
                type: "video",
                maxResults: maxResults,
                pageToken: nextPageToken || prevPageToken || "",
                order: orderFilter,
            };

            if (channelFilter) {
                searchParams.channelId = await getChannelIdForSearch(youtube, channelFilter);
            }

            if (durationFilter !== "any") {
                searchParams.videoDuration = durationFilter;
            }

            const searchResponse = await youtube.search.list(searchParams);
            const videoDetails = await fetchVideoDetails(youtube, searchResponse);
            const results = searchResponse.data;

            nextPageToken = results.nextPageToken || "";
            prevPageToken = currentPage > 1 ? results.prevPageToken || "" : "";

            if (results.items.length === 0) {
                return {
                    content: `No results found for "${query}".`,
                    embeds: [],
                };
            }

            const embed = buildSearchEmbed(results, videoDetails, query, currentPage, maxResults);
            const row = buildSearchActionRow(currentPage, nextPageToken, prevPageToken);

            return {
                embeds: [embed],
                components: row ? [row] : [],
            };
        } catch (error) {
            console.error("Error fetching YouTube results:", error);

            let errorMessage = "An error occurred while searching YouTube.";
            let errorTitle = "❌ Search Error";

            if (error.code === 403) {
                errorMessage = "YouTube API quota exceeded. Please try again tomorrow.";
                errorTitle = "📊 Quota Exceeded";
            } else if (error.code === 400) {
                errorMessage = "Invalid search parameters. Please check your input.";
                errorTitle = "📝 Invalid Parameters";
            } else if (error.code === 404) {
                errorMessage = "No results found for your search.";
                errorTitle = "❌ No Results";
            } else if (error.code === 429) {
                errorMessage = "Too many requests. Please wait a moment before trying again.";
                errorTitle = "🔄 Rate Limited";
            }

            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle(errorTitle)
                .setDescription(errorMessage);

            return {
                content: "",
                embeds: [embed],
                components: [],
            };
        }
    };

    const message = await interaction.reply(await displayResults());

    const collector = message.createMessageComponentCollector({
        time: 300000,
    });

    collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({
                content: "You are not allowed to interact with these buttons.",
                flags: MessageFlags.Ephemeral,
            });
        }

        await i.deferUpdate().catch(() => {});

        if (i.customId === "prev") {
            currentPage--;
        } else if (i.customId === "next") {
            currentPage++;
        }

        const updatedContent = await displayResults();
        await i.editReply(updatedContent).catch(console.error);
    });

    collector.on("end", () => {
        message.edit({ components: [] }).catch(console.error);
    });
}

async function getChannelIdForSearch(youtube, channelName) {
    try {
        const response = await youtube.search.list({
            part: "snippet",
            type: "channel",
            q: channelName,
            maxResults: 1,
        });

        if (response.data.items.length > 0) {
            return response.data.items[0].id.channelId;
        }
        return null;
    } catch (error) {
        console.error("Error fetching channel ID:", error);
        return null;
    }
}

async function fetchVideoDetails(youtube, searchResponse) {
    const videoIds = searchResponse.data.items.map((item) => item.id.videoId).join(",");

    const videoResponse = await youtube.videos.list({
        part: "contentDetails,statistics",
        id: videoIds,
    });

    return videoResponse.data.items.reduce((acc, item) => {
        acc[item.id] = {
            contentDetails: item.contentDetails,
            statistics: item.statistics,
        };
        return acc;
    }, {});
}

function buildSearchEmbed(results, videoDetails, query, currentPage, maxResults) {
    const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle(`🔍 YouTube Search: "${query}"`)
        .setDescription(
            `**Page ${currentPage}** | ${results.pageInfo?.totalResults || "Multiple"} results found`,
        )
        .setThumbnail("https://www.youtube.com/s/desktop/28b67e7f/img/favicon_144x144.png");

    results.items.forEach((item, index) => {
        const details = videoDetails[item.id.videoId];
        const duration = details ? formatDuration(details.contentDetails.duration) : "N/A";
        const views = details ? parseInt(details.statistics.viewCount).toLocaleString() : "N/A";
        const likes = details
            ? parseInt(details.statistics.likeCount || 0).toLocaleString()
            : "N/A";
        const publishedAt = new Date(item.snippet.publishedAt).toLocaleDateString();

        const videoInfo =
            `**Channel:** [${item.snippet.channelTitle}](https://youtube.com/channel/${item.snippet.channelId})\n` +
            `**Duration:** ${duration} | **Views:** ${views} | **Likes:** ${likes}\n` +
            `**Published:** ${publishedAt}`;

        embed.addFields({
            name: `${(currentPage - 1) * maxResults + index + 1}. ${item.snippet.title}`,
            value: `[Watch Video](https://www.youtube.com/watch?v=${item.id.videoId})\n${videoInfo}`,
            inline: false,
        });
    });

    return embed;
}

function buildSearchActionRow(currentPage, nextPageToken, prevPageToken) {
    const buttons = [];

    if (prevPageToken) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId("prev")
                .setLabel("◀️ Previous")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1),
        );
    }

    buttons.push(
        new ButtonBuilder()
            .setCustomId("page_indicator")
            .setLabel(`Page ${currentPage}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
    );

    if (nextPageToken) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId("next")
                .setLabel("Next ▶️")
                .setStyle(ButtonStyle.Primary),
        );
    }

    return buttons.length > 1 ? new ActionRowBuilder().addComponents(buttons) : null;
}
