import { SlashCommandBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip currently playing'),
	async execute(interaction) {
        const queue = interaction.client.player.nodes.get(interaction.guild.id)

        if (!queue) {
            await interaction.reply('There nothing currently playing');
        }
        
        queue.node.skip();
    
        await interaction.reply('Skipped');
	},
};