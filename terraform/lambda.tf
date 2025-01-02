# IAM role for the Lambda function
resource "aws_iam_role" "lambda_role" {
  name = "ynab_notion_cron_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Basic Lambda execution policy attachment
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# Archive file containing Lambda function code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../dist"
  output_path = "${path.module}/lambda.zip"
  excludes    = ["*.map"] # Exclude source maps
}

# Lambda function
resource "aws_lambda_function" "ynab_notion_cron" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "ynab_notion_cron"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  runtime = "nodejs18.x"

  environment {
    variables = {
      YNAB_ACCESS_TOKEN = var.ynab_access_token
    }
  }
}

# CloudWatch Log Group for Lambda logs
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.ynab_notion_cron.function_name}"
  retention_in_days = 14
}

# S3 access policy for Lambda
resource "aws_iam_role_policy" "lambda_s3_policy" {
  name = "lambda_s3_policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.category_visualizations.arn,
          "${aws_s3_bucket.category_visualizations.arn}/*"
        ]
      }
    ]
  })
} 