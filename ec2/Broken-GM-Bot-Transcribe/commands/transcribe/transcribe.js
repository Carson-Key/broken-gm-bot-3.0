import { SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';
import { EndBehaviorType } from "@discordjs/voice"; 
import { pipeline } from 'node:stream/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';
import { toS3AsStream } from '../../helpers/aws/s3.js';
import { invokeLambda } from '../../helpers/aws/lambda.js';
import pkg from '@discordjs/opus';
const { OpusEncoder } = pkg;
import WavFileWriter from 'wav'
const wavWriter = WavFileWriter.FileWriter;
import fs from 'node:fs';

export default {
	data: new SlashCommandBuilder()
		.setName('transcribe')
		.setDescription('Start to transcribe'),
	async execute(interaction) {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            await interaction.reply('You are not in a voice channel');
            return
        }

        await interaction.deferReply();

        let connection = getVoiceConnection(interaction.guild.id)

        if (!connection) {
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false
            });
        }

        const receiver = connection.receiver;

        receiver.speaking.on('start', async (userId) => {
            if (!['938666876131770389'].includes(userId)) {
                const dateObject = Date.now()
            const userName = await interaction.guild.members.cache.get(userId).user.displayName
            const fileName = path.join('.', `${userName}|${dateObject}|${userId}|${uuidv4()}.wav`);

            const wavFileStream = new wavWriter(`${fileName}`, {
                sampleRate: 48000,
                bitDepth: 16,
                channels: 2
            });

            let subscription = receiver.subscribe(userId, { end: { 
                behavior: EndBehaviorType.AfterSilence, 
                duration: 500
            }}); 

            const encoder = new OpusEncoder(48000, 2); 

            subscription.on("data", chunk => { 
                wavFileStream.write(encoder.decode(chunk)) 
            }); 

            subscription.once("end", async () => { 
                if (wavFileStream) {
                    wavFileStream.end();
                }

                const { 
                    writeStream, 
                    promise 
                } = toS3AsStream({
                    Bucket: "broken-gm-bot-transcribe-wavs", 
                    Key: `${fileName}`
                });

                fs.createReadStream(fileName).pipe(writeStream)

                await promise;

                fs.unlink(fileName, (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })

                subscription.destroy()
            })
            }
        });

        const date = new Date();
        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();

        return interaction.followUp({ content: `Started Trascribing for a session on: ${day}-${month}-${year}`});
	},
};