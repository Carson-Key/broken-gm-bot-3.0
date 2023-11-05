import dotenv from 'dotenv'
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

dotenv.config();

export const lambdaHandler = async (event, context) => {
    let response = { 
        'statusCode': 500,
        'body': JSON.stringify({
            message: 'Code Never Fired',
        })
    }

    try {
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);
        
        response = {
            'statusCode': 200,
            'body': "Completed"
        }

        let sessionItems = {
            RequestItems: {
                "transcription_table": []
            }
        }

        for (let i = 0; i < event.Records.length; i += 1) {
            const body = JSON.parse(event.Records[i].body)

            sessionItems.RequestItems.transcription_table.push({
                "PutRequest": {
                    "Item": body
                }
            })
        }

        const command = new BatchWriteCommand(sessionItems);

        await docClient.send(command);
    } catch (error) {
        console.error(error)
        response = {
            'statusCode': 500,
            'body': JSON.stringify(error)
        }
    }

    return response
};
