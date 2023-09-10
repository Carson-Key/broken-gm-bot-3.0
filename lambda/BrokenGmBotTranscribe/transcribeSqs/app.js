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
            toAddToFireBase[`${body.time}|${body.userName}`] = body.text
        }

        const date = new Date();
        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();
        const transcription = db.collection('transcription').doc(`${day}-${month}-${year}`);
        await transcription.set(toAddToFireBase, { merge: true });
    } catch (error) {
        console.error(error)
        response = {
            'statusCode': 500,
            'body': JSON.stringify(error)
        }
    }

    return response
};
