import AWS from 'aws-sdk'

export const invokeLambda = async (FunctionName, Payload) => {
        AWS.config.region = 'us-west-2';

		var lambda = new AWS.Lambda();
		var params = {
			FunctionName,
			InvocationType: 'RequestResponse',
			LogType: 'Tail',
			Payload: JSON.stringify(Payload)
		};

		const data = await lambda.invoke(params).promise()
        const lambdaResponse = JSON.parse(data.Payload)
        const lambdaResponseBody = lambdaResponse.body

        return lambdaResponseBody
}