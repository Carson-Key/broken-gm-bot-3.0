import { SlashCommandBuilder } from 'discord.js';
import { transcribeTextToVoice } from '../../helpers/voices.js'

export default {
	data: new SlashCommandBuilder()
		.setName('lucia')
		.setDescription('Has the bot say the text you provided in lucia\'s voice')
        .addStringOption(option =>
			option
				.setName('text')
				.setRequired(true)
				.setDescription('The text you want Lucia to say')),
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
                voiceName: "lucia",
                userName: await interaction.guild.members.cache.get(interaction.member.id).user.displayName
            }
        )
	},
};