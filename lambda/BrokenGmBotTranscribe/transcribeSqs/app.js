import dotenv from 'dotenv'
import { initializeApp } from 'firebase-admin/app';
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from "./brokengmbottranscription-firebase-adminsdk-v3hw1-cc353a89e1.js"

dotenv.config();
const app = initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = getFirestore();

export const lambdaHandler = async (event, context) => {
    let response = { 
        'statusCode': 500,
        'body': JSON.stringify({
            message: 'Code Never Fired',
        })
    }

    try {
        response = {
            'statusCode': 200,
            'body': "Completed"
        }

        console.log(event.Records)

        let toAddToFireBase = {}

        for (let i = 0; i < event.Records.length; i += 1) {
            const body = JSON.parse(event.Records[i].body)

            if (!toAddToFireBase[body.guildId]) {
                toAddToFireBase[body.guildId] = {}
            }
            if (!toAddToFireBase[body.guildId][body.campaignName]) {
                toAddToFireBase[body.guildId][body.campaignName] = {}
            }
            if (!toAddToFireBase[body.guildId][body.campaignName][body.sessionNumber]) {
                toAddToFireBase[body.guildId][body.campaignName][body.sessionNumber] = {}
            }

            toAddToFireBase[body.guildId][body.campaignName][body.sessionNumber][`${body.time}|${body.userName}`] = body.text
        }

        const arrayOfGuildIds = Object.keys(toAddToFireBase)
        for (let i = 0; i < arrayOfGuildIds.length; i += 1) {
            const transcription = db.collection('transcription').doc(arrayOfGuildIds[i]);
            await transcription.set(toAddToFireBase[arrayOfGuildIds[i]], { merge: true });
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
