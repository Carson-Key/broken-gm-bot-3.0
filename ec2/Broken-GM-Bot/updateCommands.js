import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID

const main = async () => {
	const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

	rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: [] })
	
	const commands = await getCommands()
	await updateCommands(rest, commands)
}


const getCommands = async () => {
	const commands = [];
	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);
	
	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = (await import(filePath)).default;
			
			if ('data' in command && 'execute' in command) {
				commands.push(command.data.toJSON());
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}

	return commands
}

const updateCommands = async (rest, commands) => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data = await rest.put(
			Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
};

main()