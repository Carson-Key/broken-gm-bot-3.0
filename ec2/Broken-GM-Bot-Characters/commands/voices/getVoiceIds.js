import fetch from 'node-fetch';
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pages } from '../../helpers/embedMessages/pages.js';

const generateVoicePage = async (data) => {
    return new EmbedBuilder()
        .setColor(0x0099FF)
	    .setTitle(`${data.name}`)
        .addFields(
            { name: 'Voice ID', value: data.voice_id },
            { name: 'Type', value: data.category },
            { name: 'Preview', value: data.preview_url },
        )
}

export default {
	data: new SlashCommandBuilder()
		.setName('get-voice-ids')
		.setDescription('The bot will return a list of voice IDs, for voices you can have the bot speak in'),
	async execute(interaction) {
        const response = await fetch(
			'https://api.elevenlabs.io/v1/voices', 
			{
				method: 'GET', 
				headers: {
					'xi-api-key': process.env.ELEVENLABS_KEY
				},
			}
		);
        const data = await response.json();

		pages(interaction, data.voices, generateVoicePage)
	},
};