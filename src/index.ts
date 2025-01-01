import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as ynab from 'ynab';
import { Client } from '@notionhq/client';

// Initialize clients
const ynabAPI = new ynab.API(process.env.YNAB_ACCESS_TOKEN || '');
const notion = new Client({ auth: process.env.NOTION_API_KEY || '' });

// Constants
const BUDGET_ID = process.env.YNAB_BUDGET_ID || '';
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID || '';

interface CategoryData {
    name: string;
    budgeted: number;
    balance: number;
    activity: number;
}

const createRichText = (text: string) => ({
    type: 'text' as const,
    text: { content: text }
});

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
            budgeted: category.budgeted / 1000, // YNAB stores amounts in milliunits
            balance: category.balance / 1000,
            activity: category.activity / 1000
        }));

        // Update Notion page
        await notion.pages.update({
            page_id: NOTION_PAGE_ID,
            properties: {
                'Last Updated': {
                    date: {
                        start: new Date().toISOString(),
                    },
                },
            },
        });

        // Create or update the table in Notion
        const blocks = await notion.blocks.children.append({
            block_id: NOTION_PAGE_ID,
            children: [
                {
                    object: 'block' as const,
                    type: 'table' as const,
                    table: {
                        table_width: 4,
                        has_column_header: true,
                        has_row_header: false,
                        children: [
                            {
                                object: 'block' as const,
                                type: 'table_row' as const,
                                table_row: {
                                    cells: [
                                        [createRichText('Category')],
                                        [createRichText('Budgeted')],
                                        [createRichText('Balance')],
                                        [createRichText('Activity')]
                                    ]
                                }
                            },
                            ...categoryData.map(category => ({
                                object: 'block' as const,
                                type: 'table_row' as const,
                                table_row: {
                                    cells: [
                                        [createRichText(category.name)],
                                        [createRichText(`$${category.budgeted.toFixed(2)}`)],
                                        [createRichText(`$${category.balance.toFixed(2)}`)],
                                        [createRichText(`$${category.activity.toFixed(2)}`)]
                                    ]
                                }
                            }))
                        ]
                    }
                }
            ]
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Success',
                categoryData,
                notionUpdate: blocks
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