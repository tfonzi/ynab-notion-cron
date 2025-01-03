data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "github-actions-role"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json
}

data "aws_iam_policy_document" "github_actions_policy" {
  # Lambda permissions

  statement {
    actions = [
      "lambda:Get*",
      "lambda:List*"
    ]
    resources = ["*"]
  }

  statement {
    actions = [
      "lambda:CreateFunction",
      "lambda:DeleteFunction",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
      "lambda:PublishVersion",
      "lambda:CreateAlias",
      "lambda:DeleteAlias",
      "lambda:UpdateAlias",
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Project"
      values   = ["ynab-notion-cron"]
    }
  }

  # IAM permissions for managing roles and policies
  statement {
    actions = [
      "iam:Get*",
      "iam:List*"
    ]
    resources = ["*"]
  }

  statement {
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:RemoveRoleFromInstanceProfile",
      "iam:DeleteInstanceProfile"
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Project"
      values   = ["ynab-notion-cron"]
    }
  }

  # Additional statement for OIDC provider access
  statement {
    actions = [
      "iam:GetOpenIDConnectProvider"
    ]
    resources = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
    ]
  }

  # CloudWatch Logs permissions for listing log groups (account level)
  statement {
    actions = [
      "logs:DescribeLogGroups"
    ]
    resources = ["*"]
  }

  # CloudWatch Logs permissions for specific log group
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:DeleteLogGroup",
      "logs:ListTagsForResource",
      "logs:PutRetentionPolicy"
    ]
    resources = [
      aws_cloudwatch_log_group.lambda_logs.arn,
      "${aws_cloudwatch_log_group.lambda_logs.arn}:*"
    ]
  }

  # S3 permissions for Terraform state (if using S3 backend)
  statement {
    actions = [
      "s3:ListBucket",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ]
    resources = [
      "arn:aws:s3:::${var.terraform_state_bucket}",
      "arn:aws:s3:::${var.terraform_state_bucket}/*"
    ]
  }

  # DynamoDB permissions for Terraform state locking
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem"
    ]
    resources = [var.terraform_state_lock_table_arn]
  }

  # S3 permissions
  statement {
    actions = [
      "s3:CreateBucket",
      "s3:DeleteBucket",
      "s3:PutBucketPolicy",
      "s3:Get*",
      "s3:PutBucketAcl",
      "s3:PutBucketCORS",
      "s3:PutBucketWebsite",
      "s3:PutBucketVersioning",
      "s3:PutBucketPublicAccessBlock",
      "s3:PutBucketOwnershipControls",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.category_visualizations.arn,
      "${aws_s3_bucket.category_visualizations.arn}/*"
    ]
  }

  # EventBridge permissions
  statement {
    actions = [
      "events:PutRule",
      "events:DeleteRule",
      "events:PutTargets",
      "events:RemoveTargets",
      "events:Describe*",
      "events:List*",
      "events:Get*",
      "events:TagResource",
      "events:UntagResource"
    ]
    resources = [aws_cloudwatch_event_rule.lambda_schedule.arn]
  }

  # Cost Explorer permissions
  statement {
    actions = [
      "ce:List*",
      "ce:Get*"
    ]
    resources = ["*"]
  }

  # Cost Allocation Tag permissions
  statement {
    actions = [
      "ce:UpdateCostAllocationTagsStatus"
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "ce:tagKey"
      values   = ["Project"]
    }
  }

  # Cost Explorer and Budgets permissions
  statement {
    actions = [
      "budgets:View*",
      "budgets:Describe*",
      "budgets:List*",
      "ce:Get*",
      "ce:List*",
      "ce:Describe*"
    ]
    resources = ["*"]
  }

  statement {
    actions = [
      "budgets:CreateBudget",
      "budgets:DeleteBudget",
      "budgets:ModifyBudget",
      "ce:UpdateCostAllocationTagsStatus",
      "ce:CreateCostAllocationTag",
      "ce:DeleteCostAllocationTag",
      "ce:UpdateCostAllocationTag"
    ]
    resources = [
      aws_budgets_budget.project_budget.arn,
      "arn:aws:ce::${data.aws_caller_identity.current.account_id}:tag/${aws_ce_cost_allocation_tag.ce_tag.tag_key}"
    ]
  }
}

resource "aws_iam_role_policy" "github_actions" {
  name   = "github-actions-policy"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_policy.json
}

# OIDC Provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
} 