import AWS from 'aws-sdk'
import stream from 'stream';

export const toS3AsStream = ({ Bucket, Key }) => {
    const s3 = new AWS.S3();
    const pass = new stream.PassThrough();
    return {
        writeStream: pass,
        promise: s3.upload({ Bucket, Key, Body: pass }).promise(),
    };
}

export const downloadS3ObjectToPath = async (bucket, key) => {
    let s3 = new AWS.S3();
    const params = {
        Bucket: bucket, 
        Key: key
    };

    return s3.getObject(params).createReadStream()
}