import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { toS3AsStream } from "./aws/s3.js"

export const uploadVoiceToS3 = async (text, { id, model_id, stability, similarity_boost }) => {
    let fileName = "Error"

    const res = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${id}/stream`,
        data: {
            text,
            model_id,
            "voice_settings": {
                stability,
                similarity_boost
            }
        },
        headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': process.env.ELEVENLABS_KEY,
            'Content-Type': 'application/json',
        },
        responseType: 'stream'
    });

    const { writeStream, promise } = toS3AsStream({Bucket: "broken-gm-bot-characters-mp3s", Key: `${id}-${uuidv4()}.mp3`});
    res.data.pipe(writeStream);

    try {
        const returnFromS3 = await promise;
        console.log(`upload completed successfully: ${JSON.stringify(returnFromS3)}`);
        fileName = {bucket: returnFromS3.Bucket, key: returnFromS3.Key, url: returnFromS3.Location}
    } catch (error) {
        console.log('upload failed.', error.message);
    }

    return fileName
}