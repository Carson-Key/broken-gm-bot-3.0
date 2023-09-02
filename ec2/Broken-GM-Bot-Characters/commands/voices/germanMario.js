import { SlashCommandBuilder } from 'discord.js';
import { transcribeTextToVoice } from '../../helpers/voices.js'

export default {
	data: new SlashCommandBuilder()
		.setName('german-mario')
		.setDescription('Has the bot say the text you provided in German Mario\'s voice')
        .addStringOption(option =>
			option
				.setName('text')
				.setRequired(true)
				.setDescription('The text you want German Mario to say')),
	async execute(interaction) {
        const text = interaction.options.getString('text', true);

        const channel = interaction.member.voice.channel;
        if (!channel) {
            await interaction.reply({ 
                content: 'You are not in a voice channel',
                ephemeral: true
            });
            
            return
        }

        await interaction.deferReply({ ephemeral: true });

        return await transcribeTextToVoice(
            interaction, 
            channel, 
            text, 
            {
                voiceName: "germanMario"
            }    
        )
	},
};