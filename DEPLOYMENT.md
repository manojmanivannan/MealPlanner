# MealPlanner - GCP Deployment Guide

This guide provides comprehensive instructions for deploying the MealPlanner application to Google Cloud Platform (GCP) using Terraform and GitHub Actions CI/CD.

## Table of Contents
- [Prerequisites](#prerequisites)
- [One-time GCP Setup](#one-time-gcp-setup)
- [GitHub Repository Setup](#github-repository-setup)
- [Initial Deployment](#initial-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:

1. **Google Cloud Account**: With billing enabled
2. **gcloud CLI**: Installed and authenticated
3. **Terraform**: Version 1.0 or later
4. **Docker**: For local testing (optional)
5. **GitHub Account**: With admin access to the repository

### Install Required Tools

```bash
# Install gcloud CLI (Ubuntu/Debian)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Install Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Verify installations
gcloud --version
terraform --version
```

## One-time GCP Setup

### 1. Create and Configure GCP Project

```bash
# Set your project ID
export PROJECT_ID="n8n-meal-planner-research"

# Create project (if not already created)
gcloud projects create $PROJECT_ID --name="MealPlanner"

# Set as default project
gcloud config set project $PROJECT_ID

# Enable billing (replace BILLING_ACCOUNT_ID with your actual billing account ID)
export BILLING_ACCOUNT_ID="YOUR-BILLING-ACCOUNT-ID"
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID
```

### 2. Enable Required APIs

The Terraform configuration will enable most APIs automatically, but you can enable them manually:

```bash
gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    storage.googleapis.com \
    artifactregistry.googleapis.com \
    billingbudgets.googleapis.com \
    cloudbuild.googleapis.com \
    iam.googleapis.com
```

### 3. Set Up Terraform Backend (Optional but Recommended)

Create a Cloud Storage bucket for Terraform state:

```bash
gsutil mb gs://$PROJECT_ID-terraform-state
gsutil versioning set on gs://$PROJECT_ID-terraform-state

# Create backend.tf in terraform directory
cat > terraform/backend.tf << EOF
terraform {
  backend "gcs" {
    bucket = "$PROJECT_ID-terraform-state"
    prefix = "terraform/state"
  }
}
EOF
```

## GitHub Repository Setup

### 1. Fork and Clone Repository

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/MealPlanner.git
cd MealPlanner
```

### 2. Set Up GitHub Secrets

Navigate to your GitHub repository: **Settings > Secrets and variables > Actions**

#### Repository Secrets (Add these in GitHub UI):

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `DB_PASSWORD` | PostgreSQL database password | `SecureDBPassword123!` |
| `SECRET_KEY` | JWT secret key for backend | `your-super-secret-jwt-key-here` |
| `BILLING_ACCOUNT_ID` | GCP Billing Account ID | `0X0X0X-0X0X0X-0X0X0X` |

#### Repository Variables (Add these in GitHub UI):

| Variable Name | Value |
|---------------|--------|
| `PROJECT_ID` | `n8n-meal-planner-research` |
| `REGION` | `us-east1
| `ARTIFACT_REPO` | `mealplanner-docker` |

### 3. Set Up Workload Identity (One-time setup)

The Terraform configuration includes workload identity setup, but you need to update the repository name:

1. Edit `terraform/service_account.tf`
2. Replace `manojmanivannan/MealPlanner` with your repository name (e.g., `yourusername/MealPlanner`)

## Initial Deployment

### 1. Create Initial Infrastructure

First, deploy the infrastructure using Terraform locally:

```bash
cd terraform

# Initialize Terraform
terraform init

# Create terraform.tfvars file
cat > terraform.tfvars << EOF
project_id = "n8n-meal-planner-research"
region = "us-east1"
db_user = "mealplanner"
db_password = "YOUR-DB-PASSWORD"
secret_key = "YOUR-SECRET-KEY"
billing_account_id = "YOUR-BILLING-ACCOUNT-ID"
environment = "prod"
EOF

# Plan and apply
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

### 2. Configure GitHub Actions Authentication

After Terraform creates the workload identity pool, configure GitHub Actions:

```bash
# Get the workload identity provider
terraform output | grep workload_identity_provider

# Note the output for GitHub Actions configuration
```

### 3. First Deployment via GitHub Actions

1. Push your changes to the `main` branch
2. GitHub Actions will automatically:
   - Run tests
   - Build Docker images
   - Push to Artifact Registry
   - Deploy via Terraform
   - Initialize the database

```bash
git add .
git commit -m "Initial deployment setup"
git push origin main
```

### 4. Verify Deployment

Check the GitHub Actions workflow status and retrieve the deployment URLs:

```bash
# Get service URLs
terraform output backend_url
terraform output frontend_url
```

## Monitoring and Maintenance

### 1. Viewing Logs

```bash
# Backend logs
gcloud logs read "resource.type=cloud_run_revision resource.labels.service_name=mealplanner-backend" --limit 50

# Frontend logs
gcloud logs read "resource.type=cloud_run_revision resource.labels.service_name=mealplanner-frontend" --limit 50

# Database initialization logs
gcloud logs read "resource.type=cloud_run_job resource.labels.job_name=mealplanner-db-init" --limit 50
```

### 2. Scaling Services

```bash
# Update backend scaling
gcloud run services update mealplanner-backend \
    --region=us-east1 \
    --min-instances=1 \
    --max-instances=20

# Update frontend scaling
gcloud run services update mealplanner-frontend \
    --region=us-east1 \
    --min-instances=1 \
    --max-instances=10
```

### 3. Database Management

#### Connect to Database

```bash
# Get connection name
terraform output cloud_sql_instance_connection_name

# Connect via Cloud SQL Proxy
cloud_sql_proxy -instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:5432

# In another terminal
psql -h 127.0.0.1 -p 5432 -U mealplanner -d mealplanner
```

#### Update Database

```bash
# Run database initialization job
gcloud run jobs execute mealplanner-db-init \
    --region=us-east1 \
    --wait
```

### 4. Cost Dashboard and Alerts

#### View Costs

1. Go to [GCP Billing Console](https://console.cloud.google.com/billing)
2. Navigate to "Cost Table" or "Reports"
3. Filter by Project: `n8n-meal-planner-research`

#### Adjust Budget Alerts

```bash
# List existing budgets
gcloud billing budgets list --billing-account=$BILLING_ACCOUNT_ID

# Update budget amount (example: increase to $50)
# Edit terraform/billing.tf and update the units value
# Then run terraform apply
```

### 5. Certificate and Domain Management

If you want to use a custom domain:

```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
    --service=mealplanner-frontend \
    --domain=yourdomain.com \
    --region=us-east1
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

```bash
# Re-authenticate gcloud
gcloud auth login
gcloud auth application-default login

# Check current project
gcloud config get-value project
```

#### 2. Docker Image Build Failures

```bash
# Test build locally
docker build -t test-backend ./backend
docker build -t test-frontend -f frontend/Dockerfile .
```

#### 3. Database Connection Issues

```bash
# Check Cloud SQL status
gcloud sql instances describe mealplanner-db-XXXX --region=us-east1

# Test connection
gcloud sql connect mealplanner-db-XXXX --user=mealplanner --region=us-east1
```

#### 4. GitHub Actions Failures

Common fixes:
- Verify all secrets are set correctly
- Check workload identity configuration
- Ensure repository name matches in Terraform configuration
- Verify billing account ID is correct

### Debugging Commands

```bash
# Check service status
gcloud run services describe mealplanner-backend --region=us-east1
gcloud run services describe mealplanner-frontend --region=us-east1

# View recent deployments
gcloud run revisions list --service=mealplanner-backend --region=us-east1

# Check secrets
gcloud secrets list

# Test endpoints
curl https://YOUR-BACKEND-URL/health
curl https://YOUR-FRONTEND-URL/health
```

### Rollback Process

If you need to rollback:

```bash
# Rollback to previous revision
gcloud run services update-traffic mealplanner-backend \
    --to-revisions=PREVIOUS-REVISION=100 \
    --region=us-east1

# Or rollback via Terraform
git revert HEAD
git push origin main
```

### Cleanup Resources

To destroy all resources:

```bash
cd terraform
terraform destroy -var-file=terraform.tfvars
```

## Support

For issues related to:
- **Application bugs**: Open an issue in the GitHub repository
- **GCP billing**: Contact Google Cloud Support
- **Deployment issues**: Check the troubleshooting section above

## Security Considerations

1. **Secrets**: Never commit secrets to version control
2. **Database**: Consider enabling SSL/TLS for production
3. **Access**: Use IAM roles with least privilege
4. **Network**: Consider VPC and firewall rules for enhanced security
5. **Monitoring**: Set up Cloud Security Command Center for security insights

---

**Last Updated**: 2024-01-09
**Version**: 1.0
