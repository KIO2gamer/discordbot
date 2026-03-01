const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");
/**
 * Provides a Discord slash command to perform mathematical calculations using the mathjs library.
 *
 * The `calculate` command allows users to enter a mathematical expression, which is then evaluated and the result is returned in an embed message.
 * The command can handle a wide range of mathematical operations and functions, including arithmetic, trigonometry, logarithms, and more.
 *
 * @module commands/utility/calc
 * @param {string} expression - The mathematical expression to calculate (e.g., '2 + 5 * 3').
 * @returns {Promise<void>} - Resolves when the calculation result is sent as a reply to the user's interaction.
 */

const math = require("mathjs"); // Import mathjs
const { handleError } = require("../../utils/errorHandler");
const { renderLatexToPng } = require("../../utils/renderLatex");

// Cache for built-in math functions/constants to avoid repeated lookups
const MATH_BUILTINS = new Set(Object.keys(math));

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("calculate")
        .setDescription("Perform a calculation using mathjs.")
        .addStringOption((option) =>
            option
                .setName("expression")
                .setDescription("The mathematical expression to calculate (e.g., 2 + 5 * 3)")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("vars")
                .setDescription('Variable assignments, e.g. x=2,y=3 or {"x":2,"y":3}')
                .setRequired(false),
        ),
    description_full:
        "Perform mathematical calculations using the mathjs library. This command can handle a wide range of mathematical operations and functions.",
    usage: "/calculate <expression>",
    examples: [
        "/calculate 2 + 2",
        "/calculate sin(45) * cos(30)",
        "/calculate sqrt(16) + log(100)",
    ],
    async execute(interaction) {
        const expression = interaction.options.getString("expression");
        const varsStr = interaction.options.getString("vars");

        // Parse variables into a mathjs scope
        const scope = parseVariables(varsStr);

        try {
            // Parse the expression to generate LaTeX and evaluate
            const node = math.parse(expression);
            const simplified = math.simplify(node);

            // Detect unbound symbols (variables not provided in scope and not built-ins)
            const hasUnbound = hasUnboundSymbols(node, scope);

            // Evaluate numerically only when no unbound symbols
            let result;
            if (!hasUnbound) {
                result = node.evaluate(scope);
            } else {
                result = simplified; // symbolic result
            }

            // Build LaTeX strings
            const latexExpr = node.toTex({ parenthesis: "keep", implicit: "show" });
            const latexSimplified = simplified.toTex({ parenthesis: "keep", implicit: "show" });
            const latexResult = resultToLatex(result);

            const embed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle("🧮 Calculation Result")
                .addFields(
                    {
                        name: "Expression (LaTeX):",
                        value: "```tex\n" + latexExpr + "\n```",
                        inline: false,
                    },
                    {
                        name: "Simplified (LaTeX):",
                        value: "```tex\n" + latexSimplified + "\n```",
                        inline: false,
                    },
                    {
                        name: "Result (plain):",
                        value:
                            typeof result === "object" &&
                            result &&
                            typeof result.toString === "function"
                                ? "`" + result.toString() + "`"
                                : "`" + String(result) + "`",
                        inline: false,
                    },
                )
                .setTimestamp();

            // If variables were provided, show them for clarity
            if (Object.keys(scope).length > 0) {
                const varsDisplay = Object.entries(scope)
                    .map(
                        ([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`,
                    )
                    .join(", ");
                embed.addFields({
                    name: "Variables:",
                    value: "```\n" + varsDisplay + "\n```",
                    inline: false,
                });
            }

            // Render images for expression, simplified, and result LaTeX
            const [exprPng, simplifiedPng, resultPng] = await Promise.all([
                renderLatexToPng(latexExpr, { display: true, padding: 12, background: "#ffffff" }),
                renderLatexToPng(latexSimplified, {
                    display: true,
                    padding: 12,
                    background: "#ffffff",
                }),
                renderLatexToPng(latexResult, {
                    display: true,
                    padding: 12,
                    background: "#ffffff",
                }),
            ]);

            const files = [
                { attachment: exprPng, name: "expression.png" },
                { attachment: simplifiedPng, name: "simplified.png" },
                { attachment: resultPng, name: "result.png" },
            ];

            // Create separate embeds for each image
            const exprEmbed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle("Expression (image)")
                .setImage("attachment://expression.png");

            const simplifiedEmbed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle("Simplified (image)")
                .setImage("attachment://simplified.png");

            const resultEmbed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle("Result (image)")
                .setImage("attachment://result.png");

            await interaction.reply({
                embeds: [embed, exprEmbed, simplifiedEmbed, resultEmbed],
                files,
            });
        } catch (error) {
            handleError("Error calculating expression:", error);
            await interaction.reply({
                content: "Invalid mathematical expression. Please check your input.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

/**
 * Parse variable assignments from a string
 * @param {string|null} varsStr - Variable string in format "x=2,y=3" or JSON
 * @returns {Object} Scope object with parsed variables
 */
function parseVariables(varsStr) {
    const scope = {};
    if (!varsStr || !varsStr.trim()) return scope;

    const raw = varsStr.trim();
    try {
        if (raw.startsWith("{") && raw.endsWith("}")) {
            const obj = JSON.parse(raw);
            for (const [k, v] of Object.entries(obj)) {
                if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) {
                    scope[k] = typeof v === "string" ? evaluateOrString(v) : v;
                }
            }
        } else {
            // Parse CSV/semicolon/space-separated pairs like x=2,y=3
            const pairs = raw.split(/[,;\s]+/).filter(Boolean);
            for (const p of pairs) {
                const idx = p.indexOf("=");
                if (idx === -1) continue;
                const key = p.slice(0, idx).trim();
                const valStr = p.slice(idx + 1).trim();
                if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
                scope[key] = evaluateOrString(valStr);
            }
        }
    } catch {
        // If parsing variables fails, proceed without them
    }
    return scope;
}

/**
 * Evaluate a string as math or return as-is
 * @param {string} valStr - Value string to evaluate
 * @returns {*} Evaluated or original value
 */
function evaluateOrString(valStr) {
    try {
        return math.evaluate(valStr);
    } catch {
        return valStr;
    }
}

/**
 * Check if node has unbound symbols
 * @param {Object} node - Math.js parse node
 * @param {Object} scope - Variable scope
 * @returns {boolean} True if unbound symbols exist
 */
function hasUnboundSymbols(node, scope) {
    let found = false;
    node.traverse((n) => {
        if (found) return; // Early exit if already found
        if (n && n.isSymbolNode) {
            const name = n.name;
            // Use safe call to Object.prototype.hasOwnProperty to avoid accessing prototype methods
            if (Object.prototype.hasOwnProperty.call(scope, name) || MATH_BUILTINS.has(name))
                return;
            found = true;
        }
    });
    return found;
}

/**
 * Convert result to LaTeX representation
 * @param {*} result - Result value
 * @returns {string} LaTeX string
 */
function resultToLatex(result) {
    if (result && typeof result === "object" && typeof result.toTex === "function") {
        return result.toTex({ parenthesis: "keep", implicit: "show" });
    }
    try {
        // Format and parse back to get proper LaTeX
        const formatted = math.format(result, { precision: 14 });
        const resultNode = math.parse(formatted);
        return resultNode.toTex({ parenthesis: "keep", implicit: "show" });
    } catch {
        return String(result);
    }
}
