import { uploadVoiceToS3 } from './helpers/elevenLabs.js'
import { voiceMetaData } from './helpers/constants/voiceMetaData.js'
import dotenv from 'dotenv'

dotenv.config();

export const lambdaHandler = async (event, context) => {
    let response = { 
        'statusCode': 500,
        'body': JSON.stringify({
            message: 'Code Never Fired',
        })
    }

    const s3ObjectInfo = await uploadVoiceToS3(event.text, voiceMetaData[event.voiceName])

    try {
        response = {
            'statusCode': 200,
            'body': JSON.stringify(s3ObjectInfo)
        }
    } catch (error) {
        response = error
    }

    return response
};
