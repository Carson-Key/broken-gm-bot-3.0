import { SlashCommandBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('Shuffle the queue'),
	async execute(interaction) {
        const queue = interaction.client.player.nodes.get(interaction.guild.id)

        if (!queue) {
            await interaction.reply('There is no queue');
        }
        
        queue.tracks.shuffle();
    
        await interaction.reply('The queue has been shuffled');
	},
};