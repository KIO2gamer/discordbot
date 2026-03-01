const fs = require("fs");
const path = require("path");
const base = "c:/Users/rana2/OneDrive/Documents/codes/project-kiyo/project-kiyo/src/commands";
let total = 0,
    withCooldown = 0;
const missing = [];
const cats = fs.readdirSync(base);
for (const cat of cats) {
    const catPath = path.join(base, cat);
    if (!fs.statSync(catPath).isDirectory()) continue;
    for (const f of fs.readdirSync(catPath)) {
        if (!f.endsWith(".js")) continue;
        total++;
        const content = fs.readFileSync(path.join(catPath, f), "utf8");
        if (/cooldown:\s*\d+/.test(content)) withCooldown++;
        else missing.push(cat + "/" + f);
    }
}
console.log("Total:", total, "| With cooldown:", withCooldown, "| Missing:", missing.length);
if (missing.length) console.log("Missing:", missing.join("\n"));
