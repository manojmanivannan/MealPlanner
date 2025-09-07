# Changelog

All notable changes to the MealPlanner project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-09

### 🚀 Major Features Added

#### Infrastructure & Deployment
- **Complete GCP Infrastructure**: Full Terraform configuration for production-ready deployment
  - Cloud Run services for backend and frontend with auto-scaling
  - Cloud SQL PostgreSQL database with automated backups
  - Secret Manager integration for secure configuration
  - Artifact Registry for Docker image storage
  - IAM roles and service accounts with least privilege access

#### CI/CD Pipeline
- **GitHub Actions Workflow**: Comprehensive CI/CD pipeline with:
  - Automated testing on every push and PR
  - Docker image building and pushing to Artifact Registry
  - Infrastructure deployment via Terraform
  - Database initialization with seeding
  - Feature branch builds without deployment
  - Workload Identity for secure authentication

#### Security & Monitoring
- **Security Enhancements**:
  - GitHub Actions OIDC integration with workload identity
  - Secret management via GitHub Secrets and GCP Secret Manager
  - CORS configuration for Cloud Run origins
  - Non-root container users for improved security

- **Cost Monitoring**:
  - Budget alerts at 50%, 75%, 90%, and 100% thresholds
  - Pub/Sub integration for alert notifications
  - Default $30 monthly budget with email notifications

#### Developer Experience
- **Comprehensive Documentation**:
  - Complete deployment guide with step-by-step instructions
  - GitHub secrets setup guide with security best practices
  - Troubleshooting section with common issues and solutions
  - Maintenance procedures for ongoing operations

### 🔧 Technical Improvements

#### Backend Updates
- **Docker Configuration**:
  - Fixed host binding for Cloud Run compatibility
  - Added proper health check endpoints (`/health` and `/healthz`)
  - Optimized container with proper user permissions
  - Added environment variable support for production configuration

- **CORS Configuration**:
  - Updated to support Cloud Run URLs (`*.run.app`)
  - Environment-based frontend URL configuration
  - Proper HTTP methods and headers support

#### Frontend Updates
- **Nginx Configuration**:
  - Updated to listen on port 8080 for Cloud Run
  - Added security headers and gzip compression
  - Improved caching for static assets
  - Health check endpoint at `/health`

#### Database Integration
- **Cloud SQL Setup**:
  - Automated database initialization via Cloud Run Jobs
  - PostgreSQL 15 with optimized configuration
  - Connection via Cloud SQL Proxy for security
  - Automated backup configuration with 7-day retention

### 📦 New Files Added

#### Infrastructure
- `terraform/` - Complete Terraform configuration
  - `main.tf` - Core infrastructure resources
  - `service_account.tf` - IAM and workload identity setup
  - `secrets.tf` - Secret Manager configuration
  - `billing.tf` - Cost monitoring and budget alerts
  - `database_init.tf` - Database initialization job
  - `apis.tf` - Required GCP APIs and Artifact Registry
  - `variables.tf` - Terraform variables with defaults
  - `outputs.tf` - Infrastructure outputs

#### CI/CD
- `.github/workflows/deploy.yml` - Complete CI/CD pipeline
- `.github/workflows/backend-tests.yml` - Enhanced with image building

#### Documentation
- `DEPLOYMENT.md` - Comprehensive deployment guide
- `docs/github-secrets-setup.md` - GitHub secrets configuration guide
- `CHANGELOG.md` - This changelog file

### 🔄 Changed Files

#### Configuration Updates
- `backend/Dockerfile` - Fixed for Cloud Run deployment
- `frontend/Dockerfile` - Optimized for production
- `nginx.conf` - Updated for Cloud Run and security
- `backend/app.py` - Added health endpoints and CORS fixes
- `terraform/variables.tf` - Updated with project defaults

#### Deployment Configuration
- `cloudbuild.yaml` - Updated for Artifact Registry
- `docker-compose.yml` - Maintained for local development

### 🛠️ Infrastructure Components

#### GCP Services Utilized
1. **Cloud Run**: Serverless container platform for backend and frontend
2. **Cloud SQL**: Managed PostgreSQL database with automated backups
3. **Secret Manager**: Secure storage for database credentials and API keys
4. **Artifact Registry**: Docker image repository with vulnerability scanning
5. **Cloud Storage**: Terraform state backend (optional)
6. **Billing Budgets**: Cost monitoring with automated alerts
7. **IAM**: Workload identity and service account management

#### Resource Specifications
- **Backend**: Cloud Run with 1 vCPU, 1GB RAM, 0-10 instances
- **Frontend**: Cloud Run with 0.5 vCPU, 512MB RAM, 0-5 instances
- **Database**: Cloud SQL db-f1-micro with 10GB SSD, auto-resize enabled
- **Budget**: $30 monthly limit with multi-threshold alerts

### 📋 Deployment Requirements

#### Prerequisites
- Google Cloud Platform account with billing enabled
- GitHub repository with admin access
- Terraform >= 1.0
- gcloud CLI
- Docker (optional, for local testing)

#### Required Secrets
- `DB_PASSWORD`: PostgreSQL database password
- `SECRET_KEY`: JWT signing key for backend authentication
- `BILLING_ACCOUNT_ID`: GCP billing account identifier

### 🎯 Next Steps for Users

1. **Initial Setup**:
   - Follow the [Deployment Guide](DEPLOYMENT.md)
   - Configure GitHub secrets as per [GitHub Secrets Setup](docs/github-secrets-setup.md)
   - Run initial Terraform deployment

2. **First Deployment**:
   - Push to main branch to trigger CI/CD pipeline
   - Verify service URLs and health checks
   - Test application functionality

3. **Ongoing Operations**:
   - Monitor costs via GCP Billing Console
   - Check application logs in Cloud Run
   - Update secrets and configurations as needed

### 🔍 Breaking Changes

- **Environment Variables**: Updated environment variable names for Cloud Run compatibility
- **Port Configuration**: Changed from port 80 to 8080 for Cloud Run standard
- **Health Endpoints**: Added new `/healthz` endpoint alongside existing `/health`

### 🐛 Known Issues

- CORS wildcard for `*.run.app` may need specific configuration for custom domains
- Database initialization job requires manual trigger on first deployment
- Billing budget alerts require valid billing account ID

### 📊 Performance Improvements

- **Container Optimization**: Multi-stage builds and non-root users
- **Caching**: Improved static asset caching with appropriate headers
- **Auto-scaling**: Cloud Run instances scale from 0 to handle traffic efficiently
- **Database**: Connection pooling via Cloud SQL Proxy for better performance

---

## [Unreleased]

### Planned Features
- Custom domain support with SSL certificates
- Enhanced monitoring with Cloud Operations Suite
- Blue-green deployment strategy
- Database migration management
- Integration testing in CI/CD pipeline

---

**For more information**: See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions.
