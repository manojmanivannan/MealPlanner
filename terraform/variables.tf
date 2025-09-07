variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "n8n-meal-planner-research"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-east1"  # Cheapest GCP region for most services
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "mealplanner"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "mealplanner"
}

variable "secret_key" {
  description = "Secret key for backend JWT tokens"
  type        = string
  sensitive   = true
}

variable "billing_account_id" {
  description = "Google Cloud Billing Account ID"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "prod"
}
