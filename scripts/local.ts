import { handler } from '../src/index';

const mockEvent = {
    httpMethod: 'GET',
    path: '/',
    headers: {},
    queryStringParameters: null,
    pathParameters: null,
    body: null,
    isBase64Encoded: false,
};

async function runLocal() {
    console.log('Running Lambda function locally...');
    try {
        const result = await handler(mockEvent as any);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

runLocal(); 