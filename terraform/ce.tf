# Enable cost allocation tags
resource "aws_ce_cost_allocation_tag" "ce_tag" {
  tag_key = "Project"
  status  = "Active"
}

# Create budget for the tag
resource "aws_budgets_budget" "project_budget" {
  name              = "project-tag-budget"
  budget_type       = "COST"
  time_unit         = "MONTHLY"
  time_period_start = "2024-01-01_00:00"
  limit_amount      = "20"
  limit_unit        = "USD"

  cost_filter {
    name   = "TagKeyValue"
    values = ["Project$"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
} 