resource "aws_s3_bucket" "category_visualizations" {
  bucket = "ynab-notion-category-visualizations"
}

resource "aws_s3_bucket_website_configuration" "category_visualizations" {
  bucket = aws_s3_bucket.category_visualizations.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "category_visualizations" {
  bucket = aws_s3_bucket.category_visualizations.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "category_visualizations" {
  bucket = aws_s3_bucket.category_visualizations.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.category_visualizations.arn}/*"
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.category_visualizations]
}