import dotenv from 'dotenv'
import {
	S3Client,
	GetObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from "@aws-sdk/client-sqs"
import fetch from "node-fetch";
import FormData from "form-data";

dotenv.config();

export const lambdaHandler = async (event, context) => {
    let response = { 
        'statusCode': 500,
        'body': JSON.stringify({
            message: 'Code Never Fired',
        })
    }

    try {
        const s3Client = new S3Client({
            region: "us-west-2",
        });

        for (let i = 0; i < event.Records.length; i += 1) {
            const bucketKeySplitAtPipes = event.Records[i].s3.object.key.split("%7C")
            const bucketKey = bucketKeySplitAtPipes.join("|").split("%2B").join("+")
            const bucketName = event.Records[i].s3.bucket.name
            const fileName = `/tmp/${bucketKey}`
            console.log(`Saved To: ${fileName}`)

            const params = {
                Bucket: bucketName,
                Key: bucketKey
            };

            const getObjectOutput = await s3Client.send(new GetObjectCommand(params));

            const formData = new FormData();
            formData.append('file', getObjectOutput.Body, {
                contentType: getObjectOutput.ContentType,
                knownLength: getObjectOutput.ContentLength,
                filename: bucketKey
            });
            formData.append('model', 'whisper-1');
            formData.append('temperature', 0.2);

            const transcript = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${process.env.CHAT_GPT_SECRET_KEY}`,
                    ...formData.getHeaders()
                }
            }).then(res => res.json());

            const delCommand = new DeleteObjectCommand(params);
            await s3Client.send(delCommand);

            if (
                transcript.text && 
                transcript.text !== "" && 
                transcript.text !== '.' && 
                transcript.text.toLowerCase() !== 'you' && 
                transcript.text.toLowerCase() !== 'you.' &&
                transcript.text.toLowerCase() !== 'bye' &&
                transcript.text.toLowerCase() !== 'bye.' && 
                transcript.text !== 'MBC 뉴스 김재경입니다.' &&
                transcript.text !== 'MBC 뉴스 김재경입니다'
            ) {
                const sqsClient = new SQSClient({
                    region: "us-west-2",
                });

                const id = bucketKeySplitAtPipes[3]
                const attributes = JSON.stringify({
                    discordId: bucketKeySplitAtPipes[2],
                    username: bucketKeySplitAtPipes[0],
                    text: transcript.text,
                    timeStamp: bucketKeySplitAtPipes[1]
                })

                console.log(bucketKeySplitAtPipes)

                // const commandToSqs = new SendMessageCommand({
                //     QueueUrl: process.env.SQS_URL,
                //     MessageBody: JSON.stringify({ 
                //         text: transcript.text,
                //         userName: bucketKeySplitAtPipes[0],
                //         time: bucketKeySplitAtPipes[1],
                //         guildId: bucketKeySplitAtPipes[4],
                //         campaignName: bucketKeySplitAtPipes[5].split("%2B").join(" "),
                //         sessionNumber: bucketKeySplitAtPipes[6].split('.')[0],
                //     })
                // });
                const commandToSqs = new SendMessageBatchCommand({
                    QueueUrl: process.env.SQS_URL,
                    Entries: [
                        {
                            Id: `${id}-a`,
                            MessageBody: JSON.stringify({ 
                                "PK": "entry",
                                "SK": id,
                                "id": `entry_${id}`,
                                "type": "entry",
                                "attributes": attributes
                            })
                        },
                        {
                            Id: `${id}-b`,
                            MessageBody: JSON.stringify({ 
                                "PK": `session#${bucketKeySplitAtPipes[4].replace('.wav','')}`,
                                "SK": `entry#${id}`,
                                "id": `entry_${id}`,
                                "type": "entry",
                                "attributes": attributes
                            })
                        },
                        {
                            Id: `${id}-c`,
                            MessageBody: JSON.stringify({ 
                                "PK": `session#${bucketKeySplitAtPipes[4].replace('.wav','')}`,
                                "SK": `${bucketKeySplitAtPipes[1]}#entry#${id}`,
                                "id": `entry_${id}`,
                                "type": "entry",
                                "attributes": attributes
                            })
                        }
                    ]
                });
                await sqsClient.send(commandToSqs);
            }
        }

        response = {
            'statusCode': 200,
            'body': "Success!"
        }
    } catch (error) {
        console.error(error)
        response = {
            'statusCode': 500,
            'body': JSON.stringify(error)
        }
    }

    return response
};
