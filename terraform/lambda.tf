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
  depends_on       = [aws_iam_role.github_actions, aws_iam_role_policy.github_actions]

  runtime = "nodejs18.x"
  timeout = 15

  environment {
    variables = {
      YNAB_ACCESS_TOKEN = var.ynab_access_token
      YNAB_BUDGET_ID    = "778d3042-d921-4b18-a75a-cfe84a632043"
    }
  }
}

# CloudWatch Log Group for Lambda logs
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.ynab_notion_cron.function_name}"
  retention_in_days = 14
  depends_on        = [aws_iam_role.github_actions, aws_iam_role_policy.github_actions]
}

# S3 access policy for Lambda
resource "aws_iam_role_policy" "lambda_s3_policy" {
  name       = "lambda_s3_policy"
  role       = aws_iam_role.lambda_role.id
  depends_on = [aws_iam_role.github_actions, aws_iam_role_policy.github_actions]

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

# EventBridge rule for scheduled Lambda execution
resource "aws_cloudwatch_event_rule" "lambda_schedule" {
  name                = "ynab_notion_cron_schedule"
  description         = "Trigger Lambda function every 3 hours starting at 6am"
  schedule_expression = "cron(0 6/3 * * ? *)" # Run at 6am, 9am, 12pm, 3pm, 6pm, 9pm, 12am, 3am UTC
  depends_on          = [aws_iam_role.github_actions, aws_iam_role_policy.github_actions]
}

# EventBridge target to point to the Lambda function
resource "aws_cloudwatch_event_target" "lambda_target" {
  rule       = aws_cloudwatch_event_rule.lambda_schedule.name
  target_id  = "YnabNotionCronLambda"
  arn        = aws_lambda_function.ynab_notion_cron.arn
  depends_on = [aws_iam_role.github_actions, aws_iam_role_policy.github_actions]
}

# Lambda permission to allow EventBridge to invoke the function
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ynab_notion_cron.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_schedule.arn
  depends_on    = [aws_iam_role.github_actions, aws_iam_role_policy.github_actions]
} 