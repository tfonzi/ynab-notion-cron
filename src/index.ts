import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as ynab from 'ynab';
import { CategoryData } from './types';
import { uploadCategoryVisualizations } from './htmlGenerator';

// Initialize clients
const ynabAPI = new ynab.API(process.env.YNAB_ACCESS_TOKEN || '');

// Constants
const BUDGET_ID = process.env.YNAB_BUDGET_ID || '';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Lambda execution started');
    console.log('Environment check:', {
        budgetId: BUDGET_ID ? 'Set' : 'Not set',
        ynabToken: process.env.YNAB_ACCESS_TOKEN ? 'Set' : 'Not set',
        awsRegion: process.env.AWS_REGION
    });

    try {
        console.log('Incoming event:', JSON.stringify(event, null, 2));

        // Get all categories from YNAB
        console.log('Fetching categories from YNAB for budget:', BUDGET_ID);
        const categoriesResponse = await ynabAPI.categories.getCategories(BUDGET_ID);
        console.log('Retrieved category groups count:', categoriesResponse.data.category_groups.length);
        
        const categoryGroups = categoriesResponse.data.category_groups;

        // Find the Food category group
        console.log('Searching for Food category group');
        const foodGroup = categoryGroups.find(group => group.name === 'Food');
        if (!foodGroup) {
            console.error('Food category group not found in available groups:', categoryGroups.map(g => g.name));
            throw new Error('Food category group not found');
        }
        console.log('Found Food category group with', foodGroup.categories.length, 'categories');

        // Extract relevant data from categories
        console.log('Processing category data');
        const categoryData: CategoryData[] = foodGroup.categories.map(category => ({
            name: category.name,
            budgeted: category.budgeted / 1000,
            balance: category.balance / 1000,
            activity: category.activity / 1000
        }));
        console.log('Processed category data:', JSON.stringify(categoryData, null, 2));

        // Generate and upload HTML visualizations
        console.log('Starting visualization generation and upload');
        await uploadCategoryVisualizations(categoryData);
        console.log('Successfully uploaded visualizations');

        const response = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Success',
                categoryData,
                visualizationBaseUrl: `http://ynab-notion-category-visualizations.s3-website-${process.env.AWS_REGION}.amazonaws.com/`
            }),
        };
        console.log('Lambda execution completed successfully');
        return response;
    } catch (error) {
        console.error('Lambda execution failed:', error);
        console.error('Error stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
}; 