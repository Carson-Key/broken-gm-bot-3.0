import { SlashCommandBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('test')
		.setDescription('Sends a test message'),
	async execute(interaction) {
		await interaction.reply({ content: 'You tested the bot... look at you', ephemeral: true });
	},
};