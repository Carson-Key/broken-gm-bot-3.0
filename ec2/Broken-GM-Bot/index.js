import fs from 'node:fs';
import path from 'node:path';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const main = async () => {
	const DISCORD_TOKEN = process.env.DISCORD_TOKEN
	
	const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
	client.commands = new Collection();

	await getCommands(client)
	await getEvents(client)

	process.on('SIGINT', () => {
		console.info("\nClosed")
		process.exit(0)
	})
	
	client.login(DISCORD_TOKEN);
}

const getCommands = async (client) => {
	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);
	
	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = (await import(filePath)).default;
			
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}
}

const getEvents = async (client) => {
	const eventsPath = path.join(__dirname, 'events');
	const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
	
	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = (await import(filePath)).default;
		if (event.once) {
			client.once(event.name, async (...args) => { await event.execute(...args) });
		} else {
			client.on(event.name, (...args) => event.execute(...args));
		}
	}
}

main()
// export default main