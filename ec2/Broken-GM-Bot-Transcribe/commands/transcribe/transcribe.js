import { SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';
import { EndBehaviorType } from "@discordjs/voice"; 
import { pipeline } from 'node:stream/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';
import { toS3AsStream } from '../../helpers/aws/s3.js';
import { invokeLambda } from '../../helpers/aws/lambda.js';
import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from "@aws-sdk/client-sqs"
import pkg from '@discordjs/opus';
const { OpusEncoder } = pkg;
import WavFileWriter from 'wav'
const wavWriter = WavFileWriter.FileWriter;
import fs from 'node:fs';
const sqsClient = new SQSClient({
    region: "us-west-2",
});

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
        let sessionId

        if (!fs.existsSync('./sessionsMetaData.json')) {
            fs.appendFile('./sessionsMetaData.json', '{}', () => {})
        }

        const data = fs.readFileSync('./sessionsMetaData.json')
        const dataJson = JSON.parse(data)

        if (!dataJson[interaction.guild.id]) {
            dataJson[interaction.guild.id] = {}
        }
        if (!dataJson[interaction.guild.id][campaignName]) {
            const campaignId = uuidv4()
            dataJson[interaction.guild.id][campaignName] = { "id": campaignId, sessionCount: 0, "sessions": {} }

            const commandToSqs = new SendMessageCommand({
                QueueUrl: "https://sqs.us-west-2.amazonaws.com/552004519449/TranscribeDynamoSqs",
                MessageBody: JSON.stringify({ 
                    "PK": "campaign",
                    "SK": campaignId,
                    "id": `campaign_${campaignId}`,
                    "type": "campaign",
                    "attributes": JSON.stringify({
                        "name": campaignName, 
                        "guildId": interaction.guild.id, 
                        "gmID": interaction.member.id
                    })
                })
            });
            sqsClient.send(commandToSqs);
        }

        if (!sessionNumber) {
            sessionId = uuidv4()
            sessionNumber = dataJson[interaction.guild.id][campaignName].sessionCount + 1
            dataJson[interaction.guild.id][campaignName].sessionCount = sessionNumber
            dataJson[interaction.guild.id][campaignName].sessions[sessionNumber.toString()] = sessionId
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = today.getMonth() + 1;
            const dd = today.getDate();
            const formattedToday = `${mm}-${dd}-${yyyy}`;
            const sessionAttributes = JSON.stringify({
                "sessionNumber": sessionNumber.toString(),
                "startDate": formattedToday
            })

            const commandToSqs = new SendMessageBatchCommand({
                QueueUrl: "https://sqs.us-west-2.amazonaws.com/552004519449/TranscribeDynamoSqs",
                Entries: [
                    {
                        Id: `${sessionId}-a`,
                        MessageBody: JSON.stringify({ 
                            "PK": "session",
                            "SK": sessionId,
                            "id": `session_${sessionId}`,
                            "type": "session",
                            "attributes": sessionAttributes
                        })
                    },
                    {
                        Id: `${sessionId}-b`,
                        MessageBody: JSON.stringify({ 
                            "PK": `campaign#${dataJson[interaction.guild.id][campaignName].id}`,
                            "SK": `session#${sessionId}`,
                            "id": `session_${sessionId}`,
                            "type": "session",
                            "attributes": sessionAttributes
                        })
                    },
                ]
            });
            sqsClient.send(commandToSqs);
        } else if (dataJson[interaction.guild.id][campaignName].sessions[sessionNumber.toString()]) {
            sessionId = dataJson[interaction.guild.id][campaignName].sessions[sessionNumber.toString()]
        } else {
            sessionId = uuidv4()
            dataJson[interaction.guild.id][campaignName].sessions[sessionNumber.toString()] = sessionId
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = today.getMonth() + 1;
            const dd = today.getDate();
            const formattedToday = `${mm}-${dd}-${yyyy}`;
            const sessionAttributes = JSON.stringify({
                "sessionNumber": sessionNumber.toString(),
                "startDate": formattedToday
            })

            const commandToSqs = new SendMessageBatchCommand({
                QueueUrl: "https://sqs.us-west-2.amazonaws.com/552004519449/TranscribeDynamoSqs",
                Entries: [
                    {
                        Id: `${sessionId}-a`,
                        MessageBody: JSON.stringify({ 
                            "PK": "session",
                            "SK": sessionId,
                            "id": `session_${sessionId}`,
                            "type": "session",
                            "attributes": sessionAttributes
                        })
                    },
                    {
                        Id: `${sessionId}-b`,
                        MessageBody: JSON.stringify({ 
                            "PK": `campaign#${dataJson[interaction.guild.id][campaignName].id}`,
                            "SK": `session#${sessionId}`,
                            "id": `session_${sessionId}`,
                            "type": "session",
                            "attributes": sessionAttributes
                        })
                    },
                ]
            });
            sqsClient.send(commandToSqs);
        }

        fs.writeFile(`./sessionsMetaData.json`, JSON.stringify(dataJson), (error) => {
            if (error) throw error;
        });

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
                const fileName = path.join('.', `${userName}|${dateObject}|${userId}|${uuidv4()}|${sessionId}.wav`);

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