import { QueryType } from 'discord-player';
import { invokeLambda } from './aws/lambda.js'
import { downloadS3ObjectToPath, deleteS3Object } from './aws/s3.js'
import { camelCaseToWords } from './general.js'
import path from 'node:path';
import appRoot from 'app-root-path';

export const transcribeTextToVoice = async (
    interaction, 
    channel, 
    text, 
    {
        voiceName,
        voiceId,
        stability,
        similarity
    }
) => {
    try {
        let lambdaPayload = {
            voiceName,
            text
        }

        if (voiceId) {
            lambdaPayload = {
                text,
                voiceName: voiceId,
                stability,
                similarity
            }
        }

        const lambdaResponseBody = await invokeLambda(
            'BrokenGmBotVoices-VoicesFunction-sNiB1Tv6roxv', 
            lambdaPayload
        )

        const fileName = path.join(appRoot.path, 'mp3s', lambdaResponseBody.key);
        await downloadS3ObjectToPath(
            lambdaResponseBody.bucket, 
            lambdaResponseBody.key, 
            fileName
        )
        
        await interaction.client.player.play(channel, fileName, {
            searchEngine: QueryType.FILE,
            nodeOptions: {
                metadata: interaction,
                leaveOnEmpty: false,
                leaveOnEnd: false,
            },
        });

        await deleteS3Object(
            lambdaResponseBody.bucket, 
            lambdaResponseBody.key
        )

        return interaction.followUp({ 
            content: `**Having ${camelCaseToWords(lambdaPayload.voiceName)} say:** ${text}`, 
            ephemeral: true
        });
    } catch (error) {
        console.error(`Error: ${error}`)

        return interaction.followUp({
            content: `Something went wrong`, 
            ephemeral: true
        });
    }
}