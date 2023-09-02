import AWS from 'aws-sdk'
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';

export const downloadS3ObjectToPath = async (bucket, key, filePath) => {
        let s3 = new AWS.S3();
        const params = {
            Bucket: bucket, 
            Key: key
        };

        await pipeline(
            await s3.getObject(params).createReadStream(), 
            fs.createWriteStream(filePath)
        )
}

export const deleteS3Object = async (bucket, key) => {
        let s3 = new AWS.S3();
        const params = {
            Bucket: bucket, 
            Key: key
        };

        await s3.deleteObject(params).promise()
}