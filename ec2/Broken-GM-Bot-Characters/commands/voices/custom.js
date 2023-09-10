import { SlashCommandBuilder } from 'discord.js';
import { transcribeTextToVoice } from '../../helpers/voices.js'

export default {
	data: new SlashCommandBuilder()
		.setName('custom')
		.setDescription('Has the bot say the text you provided using the id provided')
        .addStringOption(option =>
			option
				.setName('voice-id')
				.setRequired(true)
				.setDescription('The ID of the voice you want spoken'))
        .addStringOption(option =>
			option
				.setName('text')
				.setRequired(true)
				.setDescription('The text you want The Bot to say'))
        .addNumberOption(option =>
            option
                .setName('stability')
                .setDescription('The stability value'))
        .addNumberOption(option =>
            option
                .setName('similarity')
                .setDescription('The similarity value')),
        
	async execute(interaction) {
        const text = interaction.options.getString('text', true);
        const voiceId = interaction.options.getString('voice-id', true);
        const stability = interaction.options.getNumber('stability')
        const similarity = interaction.options.getNumber('similarity')

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
                voiceId,
                stability,
                similarity,
                userName: await interaction.guild.members.cache.get(interaction.member.id).user.displayName
            }
        )
	},
};