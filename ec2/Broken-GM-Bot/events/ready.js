import fs from 'node:fs';
import path from 'node:path';
import { Events } from 'discord.js';
import { Player } from 'discord-player';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		const player = new Player(client);
		await player.extractors.loadDefault();

		client.player = player;

		const playerEventsPath = path.join(__dirname, 'player');
		const playerEventFiles = fs.readdirSync(playerEventsPath).filter(file => file.endsWith('.js'));

		for (const file of playerEventFiles) {
			const filePath = path.join(playerEventsPath, file);
			const event = (await import(filePath)).default;
			client.player.events.on(event.name, (...args) => event.execute(...args));
		}

		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};