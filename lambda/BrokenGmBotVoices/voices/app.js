import { uploadVoiceToS3 } from './helpers/elevenLabs.js'
import { voiceMetaData } from './helpers/constants/voiceMetaData.js'
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"
import dotenv from 'dotenv'

dotenv.config();

export const lambdaHandler = async (event, context) => {
    let response = { 
        'statusCode': 500,
        'body': JSON.stringify({
            message: 'Code Never Fired',
        })
    }

    const s3ObjectInfo = await uploadVoiceToS3(
        event.text, 
        (
            voiceMetaData[event.voiceName] ? 
                voiceMetaData[event.voiceName] :
                {
                    name: event.voiceName,
                    id: event.voiceName,
                    stability: event.stability ? event.stability : 0.75,
                    similarity_boost: event.similarity_boost ? event.similarity_boost : 0.75,
                    model_id: "eleven_monolingual_v1",
                }
        )
    )
    const sqsClient = new SQSClient({
        region: "us-west-2",
    });
    const commandToSqs = new SendMessageCommand({
        QueueUrl: "https://sqs.us-west-2.amazonaws.com/552004519449/TranscribeSqs",
        MessageBody: JSON.stringify({ 
            text: event.text,
            userName: `${event.userName} (${event.voiceName})`,
            time: Date.now(),
        })
    });
    await sqsClient.send(commandToSqs);

    try {
        response = {
            'statusCode': 200,
            'body': JSON.stringify(s3ObjectInfo)
        }
    } catch (error) {
        response = {
            'statusCode': 500,
            'body': JSON.stringify(error)
        }
    }

    return response
};
