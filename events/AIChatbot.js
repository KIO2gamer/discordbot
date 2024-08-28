const { Events } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});


module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.author.bot) return;

		if (message.content === '?chat') {
			
		}
	},
};
