import { S3 } from 'aws-sdk';
import { CategoryData } from './types';

const s3 = new S3();
const BUCKET_NAME = 'ynab-notion-category-visualizations';

export const generateCategoryHtml = (category: CategoryData): string => {
    const ratio = category.balance / category.budgeted;
    const percentage = Math.round(ratio * 100);
    const remainingPercentage = Math.max(0, 100 - percentage);

    return `<!DOCTYPE html>
<html>
<head>
    <title>${category.name} Budget Ratio</title>
    <style>
        body {
            margin: 0;
            background: #333;
            color: white;
            font-family: Arial, sans-serif;
        }
        .container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            padding: 1rem;
        }
        .chart-container {
            position: relative;
            width: min(80vw, 400px);
            aspect-ratio: 1;
        }
        .pie {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: conic-gradient(#3498db ${percentage}%, #e74c3c ${remainingPercentage}%);
        }
        .legend {
            margin-top: 1.5rem;
            display: flex;
            gap: 1.5rem;
            flex-wrap: wrap;
            justify-content: center;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: clamp(0.875rem, 2vw, 1rem);
        }
        .color-box {
            width: clamp(1rem, 2vw, 1.25rem);
            height: clamp(1rem, 2vw, 1.25rem);
        }
        .balance {
            background: #3498db;
        }
        .remaining {
            background: #e74c3c;
        }
        h2 {
            font-size: clamp(1.5rem, 3vw, 2rem);
            margin-bottom: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>${category.name} Budget Ratio</h2>
        <div class="chart-container">
            <div class="pie"></div>
        </div>
        <div class="legend">
            <div class="legend-item">
                <div class="color-box balance"></div>
                <span>Balance: ${percentage}% ($${category.balance.toFixed(2)})</span>
            </div>
            <div class="legend-item">
                <div class="color-box remaining"></div>
                <span>Remaining: ${remainingPercentage}% ($${(category.budgeted - category.balance).toFixed(2)})</span>
            </div>
        </div>
    </div>
</body>
</html>`;
};

export const uploadCategoryVisualizations = async (categories: CategoryData[]): Promise<void> => {
    const uploadPromises = categories.map(async (category) => {
        const html = generateCategoryHtml(category);
        const fileName = `${category.name.toLowerCase().replace(/\s+/g, '-')}.html`;

        await s3.putObject({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: html,
            ContentType: 'text/html',
            ACL: 'public-read'
        }).promise();

        return `http://${BUCKET_NAME}.s3-website-${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    });

    await Promise.all(uploadPromises);
}; 