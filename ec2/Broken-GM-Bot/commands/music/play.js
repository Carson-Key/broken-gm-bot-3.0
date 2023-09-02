import { SlashCommandBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Add a song to the play queue')
        .addStringOption(option =>
			option
				.setName('query')
				.setRequired(true)
				.setDescription('The url of the song to play')),
	async execute(interaction) {
		const channel = interaction.member.voice.channel;
        if (!channel) {
            await interaction.reply('You are not in a voice channel');
            return
        }

        const query = interaction.options.getString('query', true);
        await interaction.deferReply();

        try {
            const { track } = await interaction.client.player.play(channel, query, {
                nodeOptions: {
                    metadata: interaction,
                    leaveOnEmpty: false,
                    leaveOnEnd: false,
                    selfDeaf: false
                },
            });

            return interaction.followUp(`Queue: **${track.title}**`);
        } catch (e) {
            console.log(`${e}`)
            return interaction.followUp(`Something went wrong`);
        }
	},
};