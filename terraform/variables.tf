variable "ynab_access_token" {
  description = "YNAB API access token"
  type        = string
  sensitive   = true
}

variable "github_repository" {
  description = "The GitHub repository in format owner/repo-name"
  type        = string
}

variable "terraform_state_bucket" {
  description = "The S3 bucket name for storing Terraform state"
  type        = string
}

variable "terraform_state_lock_table_arn" {
  description = "The ARN of the DynamoDB table used for Terraform state locking"
  type        = string
}