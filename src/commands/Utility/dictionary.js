const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

const axios = require("axios");
const { handleError } = require("../../utils/errorHandler");

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("dictionary")
        .setDescription("Look up the definition of a word")
        .addStringOption((option) =>
            option.setName("word").setDescription("The word to look up").setRequired(true),
        ),

    async execute(interaction) {
        const word = interaction.options.getString("word");

        await interaction.deferReply();

        try {
            // Try primary API first
            let data = await this.fetchFromPrimaryAPI(word);

            // If primary fails, try fallback API
            if (!data) {
                data = await this.fetchFromFallbackAPI(word);
            }

            if (!data) {
                await interaction.editReply(`❌ No definition found for "**${word}**".`);
                return;
            }

            const embed = this.createDefinitionEmbed(data);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await handleError(interaction, error, "API", "Failed to fetch word definition");
        }
    },

    async fetchFromPrimaryAPI(word) {
        try {
            const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
            const response = await axios.get(apiUrl);
            const data = response.data[0];

            if (!data) return null;

            // Extract comprehensive information
            const meanings = data.meanings || [];
            const phonetic = data.phonetic || data.phonetics?.find((p) => p.text)?.text || "";

            const definitions = [];
            meanings.slice(0, 3).forEach((meaning) => {
                const defs = meaning.definitions.slice(0, 2);
                defs.forEach((def) => {
                    definitions.push({
                        partOfSpeech: meaning.partOfSpeech,
                        definition: def.definition,
                        example: def.example || null,
                    });
                });
            });

            return {
                word: data.word,
                phonetic,
                definitions,
                source: "DictionaryAPI",
            };
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    async fetchFromFallbackAPI(word) {
        try {
            // Use WordsAPI-style free alternative (Merriam-Webster Collegiate Thesaurus is free)
            // Using the free API from words.bighugelabs.com as fallback
            const apiUrl = `https://api.datamuse.com/words?sp=${word}&md=d&max=1`;
            const response = await axios.get(apiUrl);

            if (!response.data || response.data.length === 0) return null;

            const wordData = response.data[0];
            if (!wordData.defs) return null;

            const definitions = wordData.defs.slice(0, 3).map((def) => {
                const [partOfSpeech, ...defParts] = def.split("\t");
                return {
                    partOfSpeech,
                    definition: defParts.join(" "),
                    example: null,
                };
            });

            return {
                word: wordData.word,
                phonetic: "",
                definitions,
                source: "Datamuse",
            };
        } catch {
            return null;
        }
    },

    createDefinitionEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle(`📖 ${data.word}`)
            .setColor(0x5865f2)
            .setTimestamp();

        if (data.phonetic) {
            embed.setDescription(`**Pronunciation:** ${data.phonetic}\n`);
        }

        // Add definitions as fields
        data.definitions.forEach((def, index) => {
            let fieldValue = def.definition;
            if (def.example) {
                fieldValue += `\n*Example: "${def.example}"*`;
            }

            embed.addFields({
                name: `${index + 1}. ${def.partOfSpeech}`,
                value: fieldValue.substring(0, 1024), // Discord field value limit
                inline: false,
            });
        });

        embed.setFooter({
            text: `Powered by ${data.source}`,
            iconURL: "https://i.imgur.com/AfFp7pu.png",
        });

        return embed;
    },
};
