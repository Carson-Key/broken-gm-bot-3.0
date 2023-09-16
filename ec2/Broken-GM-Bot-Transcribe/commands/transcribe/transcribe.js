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
		.setDescription('Start to transcribe')
        .addStringOption(option =>
			option
				.setName('campaign-name')
				.setRequired(true)
				.setDescription('The name of the campaign you are transcribing'))
        .addNumberOption(option =>
            option
                .setName('session-number')
                .setDescription('The session number you are transcribing')),
	async execute(interaction) {
        const campaignName = interaction.options.getString('campaign-name', true);
        let sessionNumber = interaction.options.getNumber('session-number')
        if (!sessionNumber) {
            if (!fs.existsSync('./sessionsMetaData.json')) {
                fs.appendFile('./sessionsMetaData.json', '{}', () => {})
            }

            const data = fs.readFileSync('./sessionsMetaData.json')
            const dataJson = JSON.parse(data)

            if (!dataJson[interaction.guild.id]) {
                dataJson[interaction.guild.id] = {}
            }
            if (!dataJson[interaction.guild.id][campaignName]) {
                dataJson[interaction.guild.id][campaignName] = 0
            }

            dataJson[interaction.guild.id][campaignName] = dataJson[interaction.guild.id][campaignName] + 1

            sessionNumber = dataJson[interaction.guild.id][campaignName]
            fs.writeFile(`./sessionsMetaData.json`, JSON.stringify(dataJson), (error) => {
                if (error) throw error;
            });
        }

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
            if (!['938666876131770389', '1112063938776010869', '1147591645798350962'].includes(userId)) {
                const dateObject = Date.now()
            const userName = await interaction.guild.members.cache.get(userId).user.displayName

            const parsedCampaignName = campaignName.split(' ').join('+');
            const fileName = path.join('.', `${userName}|${dateObject}|${userId}|${uuidv4()}|${channel.guild.id}|${parsedCampaignName}|${sessionNumber}.wav`);

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

        return interaction.followUp({ content: `Started Trascribing for session ${sessionNumber} of ${campaignName}`});
	},
};