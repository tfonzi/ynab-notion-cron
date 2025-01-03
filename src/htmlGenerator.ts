import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CategoryData } from './types';

const s3Client = new S3Client({});
const BUCKET_NAME = 'ynab-notion-category-visualizations';

const calculateForecastAngle = (): number => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const percentageOfMonth = currentDay / daysInMonth;
    return -90 - (percentageOfMonth * 360);
};

const generateCategoryChart = (category: CategoryData): string => {
    const percentage = Math.round((category.balance / category.budgeted) * 100);
    const remainingPercentage = Math.max(0, 100 - percentage);
    const forecastAngle = calculateForecastAngle();

    return `<div class="chart-wrapper">
            <h3>${category.name}</h3>
            <div class="chart-container">
                <div class="pie" style="--percentage: ${percentage}%">
                    <div class="reference-line"></div>
                    <div class="forecast-line" style="--forecast-angle: ${forecastAngle}deg"></div>
                </div>
            </div>
            <div class="legend">
                <div class="legend-item">
                    <div class="color-box remaining"></div>
                    <span>Remaining: ${percentage}% ($${category.balance.toFixed(2)})</span>
                </div>
                <div class="legend-item">
                    <div class="color-box spent"></div>
                    <span>Spent: ${remainingPercentage}% ($${(category.budgeted - category.balance).toFixed(2)})</span>
                </div>
            </div>
        </div>`;
};

export const generateDashboardHtml = (categories: CategoryData[]): string => {
    const validCategories = categories.filter(category => category.budgeted > 0);
    console.log(`Generating HTML dashboard for ${validCategories.length} categories (filtered out ${categories.length - validCategories.length} zero-budget categories)`);
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>YNAB Category Budget Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        :root {
            --spacing-xs: 0.25rem;
            --spacing-sm: 0.5rem;
            --spacing-md: 0.75rem;
            --spacing-lg: 1rem;
            --font-size-xs: 0.625rem;
            --font-size-sm: 0.75rem;
            --font-size-md: 0.875rem;
            --font-size-lg: 1.25rem;
            --color-bg: #333;
            --color-card: #444;
            --color-text: white;
            --color-success: #4CAF50;
            --color-danger: #e74c3c;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            height: 100vh;
            background: var(--color-bg);
            color: var(--color-text);
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            padding: var(--spacing-xs);
            overflow: hidden;
        }

        h1 {
            text-align: center;
            font-size: var(--font-size-lg);
            margin-bottom: var(--spacing-sm);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .dashboard-grid {
            flex: 1;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: var(--spacing-sm);
            padding: var(--spacing-xs);
            overflow: auto;
            align-content: start;
            max-width: 1600px;
            margin: 0 auto;
            width: 100%;
        }

        .chart-wrapper {
            background: var(--color-card);
            padding: var(--spacing-md);
            border-radius: var(--spacing-xs);
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
        }

        h3 {
            font-size: var(--font-size-md);
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .chart-container {
            position: relative;
            width: min(200px, 100%);
            margin: auto;
            aspect-ratio: 1;
            transition: transform 0.2s ease;
            cursor: pointer;
        }

        .chart-container:hover {
            transform: scale(1.05);
        }

        @keyframes shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-5deg); }
            75% { transform: rotate(5deg); }
        }

        @keyframes fall {
            0% {
                transform: translateY(-20px);
                opacity: 1;
            }
            100% {
                transform: translateY(100px);
                opacity: 0;
            }
        }

        .shake {
            animation: shake 0.5s ease-in-out;
        }

        .money {
            position: absolute;
            color: #85bb65;
            font-size: 1.2rem;
            pointer-events: none;
            z-index: 1;
        }

        .pie {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: var(--color-danger);
        }

        .forecast-line {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 50%;
            height: 0;
            border-top: 1px dashed rgba(0, 0, 0, 0.5);
            transform-origin: left;
            transform: rotate(var(--forecast-angle));
            z-index: 2;
        }

        .reference-line {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 50%;
            height: 0;
            border-top: 1px solid rgba(0, 0, 0, 0.5);
            transform-origin: left;
            transform: rotate(-90deg);  /* Points straight up */
            z-index: 2;
        }

        .pie::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: var(--color-success);
            mask: conic-gradient(
                black var(--percentage),
                transparent var(--percentage)
            );
            -webkit-mask: conic-gradient(
                black var(--percentage),
                transparent var(--percentage)
            );
        }

        .pie::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: radial-gradient(
                circle at 30% 30%,
                rgba(255, 255, 255, 0.2) 0%,
                rgba(255, 255, 255, 0.05) 30%,
                transparent 60%
            );
            mask: conic-gradient(
                black var(--percentage),
                transparent var(--percentage)
            );
            -webkit-mask: conic-gradient(
                black var(--percentage),
                transparent var(--percentage)
            );
        }

        .legend {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
            font-size: var(--font-size-sm);
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            white-space: nowrap;
        }

        .color-box {
            width: var(--spacing-sm);
            height: var(--spacing-sm);
            flex-shrink: 0;
        }

        .remaining { background: var(--color-success); }
        .spent { background: var(--color-danger); }

        @media (max-width: 600px) {
            .dashboard-grid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }
            
            :root {
                --font-size-lg: 1rem;
                --font-size-md: 0.75rem;
                --font-size-sm: 0.625rem;
            }
        }
    </style>
    <script>
        (function() {
            document.addEventListener('DOMContentLoaded', function() {
                document.querySelectorAll('.chart-container').forEach(function(container) {
                    container.addEventListener('click', function() {
                        // Add shake animation
                        var pie = this.querySelector('.pie');
                        pie.classList.add('shake');
                        setTimeout(function() {
                            pie.classList.remove('shake');
                        }, 500);

                        // Create falling money
                        for (var i = 0; i < 8; i++) {
                            var money = document.createElement('div');
                            money.textContent = '$';
                            money.className = 'money';
                            money.style.left = (Math.random() * 100) + '%';
                            money.style.animation = 'fall ' + (0.5 + Math.random() * 0.5) + 's ease-in forwards';
                            container.appendChild(money);
                            (function(element) {
                                setTimeout(function() {
                                    element.remove();
                                }, 1500);
                            })(money);
                        }
                    });
                });
            });
        })();
    </script>
</head>
<body>
    <h1>YNAB Category Budget Dashboard</h1>
    <div class="dashboard-grid">
        ${validCategories.map(generateCategoryChart).join('\n')}
    </div>
</body>
</html>`;
};

export const uploadCategoryVisualizations = async (categories: CategoryData[]): Promise<string> => {
    console.log('Generating and uploading dashboard visualization');
    
    const html = generateDashboardHtml(categories);
    const fileName = 'dashboard.html';
    
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: html,
            ContentType: 'text/html'
        }));
        
        const url = `http://${BUCKET_NAME}.s3-website-${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        console.log(`Successfully uploaded dashboard. URL: ${url}`);
        return url;
    } catch (error) {
        console.error('Failed to upload dashboard:', error);
        throw error;
    }
}; 