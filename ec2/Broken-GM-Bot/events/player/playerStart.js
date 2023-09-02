export default {
	name: "playerStart",
	async execute(client) {
		const queue = client.player.nodes.get(client.guild.id)
		const title = queue.currentTrack.title
		const interaction = queue.metadata
		const channel = await client.guild.channels.fetch(interaction.channelId)

		channel.send({content: `**Playing:** ${title}`})
	},
};