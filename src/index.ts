import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as ynab from 'ynab';
import { CategoryData } from './types';
import { uploadCategoryVisualizations } from './htmlGenerator';

// Initialize clients
const ynabAPI = new ynab.API(process.env.YNAB_ACCESS_TOKEN || '');

// Constants
const BUDGET_ID = process.env.YNAB_BUDGET_ID || '';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Event:', JSON.stringify(event, null, 2));

        // Get all categories from YNAB
        const categoriesResponse = await ynabAPI.categories.getCategories(BUDGET_ID);
        const categoryGroups = categoriesResponse.data.category_groups;

        // Find the Food category group
        const foodGroup = categoryGroups.find(group => group.name === 'Food');
        if (!foodGroup) {
            throw new Error('Food category group not found');
        }

        // Extract relevant data from categories
        const categoryData: CategoryData[] = foodGroup.categories.map(category => ({
            name: category.name,
            budgeted: category.budgeted / 1000,
            balance: category.balance / 1000,
            activity: category.activity / 1000
        }));

        // Generate and upload HTML visualizations
        await uploadCategoryVisualizations(categoryData);

        return {
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
    } catch (error) {
        console.error('Error:', error);
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