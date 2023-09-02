import fs from 'node:fs';
import path from 'node:path';
import appRoot from 'app-root-path';

export default {
	name: "debug",
	async execute(queue, message) {
		if (message.includes("was marked as finished")) {
			const matchingArray = /Track {"title":"(.*?)","isTransitionMode":false} was marked as finished/g.exec(message);
			fs.unlink(path.join(appRoot.path, 'mp3s', matchingArray[1]), (err) => {
				if (err) {
					console.error(err)
					return
				}
			})
		}
	},
};