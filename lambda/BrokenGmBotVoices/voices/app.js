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
