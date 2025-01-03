# Configure the required provider(s)
terraform {
  # Define which providers and versions this configuration needs
  required_providers {
    aws = {
      source  = "hashicorp/aws" # Official AWS provider from HashiCorp
      version = "~> 5.0"        # Use version 5.x, but not 6.x or higher
    }
  }

  # Configure remote state storage in S3
  backend "s3" {
    bucket         = "ynab-notion-cron-bucket" # S3 bucket where state will be stored
    key            = "terraform.tfstate"       # Name of the state file in the bucket
    region         = "us-east-1"               # Region where the S3 bucket exists
    dynamodb_table = "terraform-state-locks"   # DynamoDB table for state locking
    encrypt        = true                      # Enable server-side encryption
  }
}

# Configure the AWS Provider with default settings
provider "aws" {
  region = "us-east-1" # Default region for AWS resources

  default_tags {
    tags = {
      Project    = "ynab-notion-cron"
      ManagedBy  = "terraform"
      Repository = var.github_repository
    }
  }
} 