# GitHub Secrets Setup Guide

This document provides step-by-step instructions for setting up GitHub Secrets and Variables required for the MealPlanner CI/CD pipeline.

## Required Secrets

Navigate to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

### 1. Repository Secrets

Click **"New repository secret"** for each of the following:

#### `DB_PASSWORD`
- **Description**: PostgreSQL database password
- **Value**: A strong password for your database (e.g., `MySecureDBPassword123!`)
- **Security**: This will be used to create the database user in Cloud SQL

#### `SECRET_KEY` 
- **Description**: JWT secret key for backend authentication
- **Value**: A long, random string for JWT token signing (e.g., `your-super-secret-jwt-key-that-is-very-long-and-random`)
- **Security**: This should be a cryptographically secure random string

#### `BILLING_ACCOUNT_ID`
- **Description**: Your Google Cloud billing account ID
- **Value**: Find this in [GCP Billing Console](https://console.cloud.google.com/billing)
- **Format**: Looks like `0X0X0X-0X0X0X-0X0X0X`

### 2. Repository Variables

Click **"New repository variable"** for each of the following:

#### `PROJECT_ID`
- **Value**: `n8n-meal-planner-research`

#### `REGION`
- **Value**: `us-east1`

#### `ARTIFACT_REPO`
- **Value**: `mealplanner-docker`

## Quick Setup Script

You can use GitHub CLI to set these up quickly:

```bash
# Install GitHub CLI if not already installed
# Ubuntu/Debian: sudo apt install gh
# macOS: brew install gh

# Authenticate with GitHub
gh auth login

# Set repository secrets (you'll be prompted for values)
gh secret set DB_PASSWORD
gh secret set SECRET_KEY
gh secret set BILLING_ACCOUNT_ID

# Set repository variables
gh variable set PROJECT_ID --body "n8n-meal-planner-research"
gh variable set REGION --body "us-east1"
gh variable set ARTIFACT_REPO --body "mealplanner-docker"
```

## Generate Secure Values

### Generate a strong database password:
```bash
# Generate a 16-character password
openssl rand -base64 16
```

### Generate a JWT secret key:
```bash
# Generate a 32-byte secret key
openssl rand -base64 32
```

### Find your Billing Account ID:
1. Go to [GCP Billing Console](https://console.cloud.google.com/billing)
2. Select your billing account
3. Copy the Account ID from the URL or account details

## Verification

After setting up the secrets and variables, you can verify them:

```bash
# List all secrets (values won't be shown for security)
gh secret list

# List all variables
gh variable list
```

## Important Notes

1. **Never commit secrets**: Secrets should only be set in GitHub's secure storage
2. **Repository access**: Only repository collaborators with admin/write access can set secrets
3. **Environment protection**: Consider using environment-specific secrets for staging/production
4. **Rotation**: Regularly rotate your secrets for security
5. **Audit**: Monitor secret usage in your repository's security logs

## Troubleshooting

### Common Issues:

1. **Permission denied**: Ensure you have admin/write access to the repository
2. **Invalid billing account**: Verify the billing account ID format
3. **Weak passwords**: Use strong, unique passwords for production

### Testing Secrets:

After setup, push a change to trigger the GitHub Actions workflow. Check the workflow logs to ensure authentication is working properly.

---

**Next Steps**: After setting up secrets, proceed with the [Deployment Guide](../DEPLOYMENT.md)
