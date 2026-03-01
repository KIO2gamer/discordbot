const {
    ActionRowBuilder,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
} = require("discord.js");
const { handleError } = require("../../utils/errorHandler");
const translate = require("@iamtraction/google-translate");

// Language options with codes and names
const LANGUAGES = [
    { name: "English", value: "en", flag: "🇺🇸" },
    { name: "Spanish", value: "es", flag: "🇪🇸" },
    { name: "French", value: "fr", flag: "🇫🇷" },
    { name: "German", value: "de", flag: "🇩🇪" },
    { name: "Italian", value: "it", flag: "🇮🇹" },
    { name: "Portuguese", value: "pt", flag: "🇵🇹" },
    { name: "Dutch", value: "nl", flag: "🇳🇱" },
    { name: "Russian", value: "ru", flag: "🇷🇺" },
    { name: "Japanese", value: "ja", flag: "🇯🇵" },
    { name: "Chinese (Simplified)", value: "zh-CN", flag: "🇨🇳" },
    { name: "Chinese (Traditional)", value: "zh-TW", flag: "🇭🇰" },
    { name: "Korean", value: "ko", flag: "🇰🇷" },
    { name: "Arabic", value: "ar", flag: "🇸🇦" },
    { name: "Hindi", value: "hi", flag: "🇮🇳" },
    { name: "Thai", value: "th", flag: "🇹🇭" },
    { name: "Polish", value: "pl", flag: "🇵🇱" },
    { name: "Turkish", value: "tr", flag: "🇹🇷" },
    { name: "Greek", value: "el", flag: "🇬🇷" },
    { name: "Swedish", value: "sv", flag: "🇸🇪" },
    { name: "Norwegian", value: "no", flag: "🇳🇴" },
];

const LANGUAGE_MAP = Object.fromEntries(LANGUAGES.map((lang) => [lang.value, lang]));

module.exports = {
    cooldown: 10,
    description_full:
        "Translates your text to any language with an interactive menu. Simply enter your text and select the target language from a dropdown menu. The bot will auto-detect the source language and show you the translation with language information.",
    usage: "/translate <text>",
    examples: [
        "/translate text:Hello, how are you?",
        "/translate text:Buenos días",
        "/translate text:Bonjour le monde",
    ],

    data: new SlashCommandBuilder()
        .setName("translate")
        .setDescription("Translates text to your desired language with an easy-to-use menu.")
        .addStringOption((option) =>
            option
                .setName("text")
                .setDescription("The text you want to translate")
                .setRequired(true)
                .setMaxLength(4000),
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const text = interaction.options.getString("text");

        try {
            // Show language selection menu
            const selectRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`translate_lang_${interaction.user.id}`)
                    .setPlaceholder("🌐 Select a target language")
                    .addOptions(
                        LANGUAGES.map((lang) => ({
                            label: lang.name,
                            value: lang.value,
                            emoji: lang.flag,
                            description: `Translate to ${lang.name}`,
                        })),
                    ),
            );

            const embed = new EmbedBuilder()
                .setTitle("🌐 Translation Tool")
                .setDescription(
                    `**Your Text:**\n\`\`\`\n${text.substring(0, 1000)}${text.length > 1000 ? "\n... (text truncated)" : ""}\n\`\`\`\n\nSelect a language below to translate your text.`,
                )
                .setColor("#5865F2")
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                components: [selectRow],
            });

            // Create collector for language selection
            const filter = (i) =>
                i.customId.startsWith("translate_lang_") && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 300000, // 5 minutes
            });

            collector.on("collect", async (i) => {
                await i.deferUpdate();
                const targetLang = i.values[0];
                await this.performTranslation(interaction, text, targetLang, i);
                collector.stop();
            });

            collector.on("end", (collected) => {
                if (collected.size === 0) {
                    interaction
                        .editReply({
                            content: "Translation selection expired. Please try again.",
                            components: [],
                            embeds: [],
                        })
                        .catch(() => {});
                }
            });
        } catch (error) {
            await handleError(
                interaction,
                error,
                "TRANSLATION_ERROR",
                "Failed to initialize translation tool.",
            );
        }
    },

    /**
     * Perform the actual translation
     */
    async performTranslation(interaction, text, targetLang, updateInteraction) {
        try {
            // Translate the text
            const result = await translate(text, { to: targetLang });

            const targetLangName = LANGUAGE_MAP[targetLang]?.name || targetLang;
            const targetLangFlag = LANGUAGE_MAP[targetLang]?.flag || "🌐";

            const embed = new EmbedBuilder()
                .setTitle("✅ Translation Complete")
                .setColor("#57F287")
                .addFields(
                    {
                        name: "📝 Original Text",
                        value: `\`\`\`\n${text.substring(0, 1000)}${text.length > 1000 ? "\n... (truncated)" : ""}\n\`\`\``,
                        inline: false,
                    },
                    {
                        name: `${targetLangFlag} Translated to ${targetLangName}`,
                        value: `\`\`\`\n${result.text.substring(0, 1000)}${result.text.length > 1000 ? "\n... (truncated)" : ""}\n\`\`\``,
                        inline: false,
                    },
                    {
                        name: "ℹ️ Details",
                        value: (() => {
                            const sourceIso = result?.from?.language?.iso || "Auto-detected";
                            const sourceName = LANGUAGE_MAP[sourceIso]?.name || sourceIso;
                            return `**Source Language:** ${sourceName}\n**Target Language:** ${targetLang}`;
                        })(),
                        inline: false,
                    },
                )
                .setFooter({
                    text: `Requested by ${interaction.user.tag} • Powered by Google Translate`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            await updateInteraction.editReply({
                embeds: [embed],
                components: [],
            });
        } catch (error) {
            await handleError(
                updateInteraction,
                error,
                "TRANSLATION_ERROR",
                "Failed to translate the text. Please try again.",
            );
        }
    },
};
