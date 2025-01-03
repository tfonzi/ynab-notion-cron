# Enable cost allocation tags
resource "aws_ce_cost_allocation_tag" "ce_tag" {
  tag_key = "Project"
  status  = "Active"
} 