# 🚀 MealPlanner GCP Deployment - Complete Setup

## ✅ What Has Been Completed

Your MealPlanner application is now fully configured for deployment to Google Cloud Platform with a complete CI/CD pipeline. Here's what has been set up:

### 🏗️ Infrastructure (Terraform)
- **Cloud Run Services**: Backend (FastAPI) and Frontend (Nginx) with auto-scaling
- **Cloud SQL**: PostgreSQL 15 database with automated backups
- **Secret Manager**: Secure storage for database credentials and JWT keys
- **Artifact Registry**: Docker image repository with vulnerability scanning
- **IAM & Security**: Service accounts, workload identity, least-privilege access
- **Cost Monitoring**: Budget alerts at multiple thresholds ($30 monthly default)
- **Database Initialization**: Automated setup via Cloud Run Jobs

### 🔄 CI/CD Pipeline (GitHub Actions)
- **Automated Testing**: Runs on every push and pull request
- **Multi-Environment**: Feature branch builds (no deploy) vs. main branch deployment
- **Security**: OIDC authentication with workload identity (no service account keys)
- **Docker Images**: Builds and pushes to Artifact Registry
- **Infrastructure Deployment**: Terraform apply with state management
- **Database Setup**: Automatic database initialization after deployment

### 🔐 Security & Configuration
- **Secrets Management**: GitHub Secrets → GCP Secret Manager integration
- **CORS Configuration**: Properly configured for Cloud Run URLs
- **Health Checks**: Multiple endpoints with proper monitoring
- **Non-root Containers**: Security-hardened Docker images
- **Network Security**: Cloud Run with Cloud SQL private connectivity

### 📚 Documentation
- **Complete Deployment Guide**: Step-by-step instructions
- **GitHub Secrets Setup**: Detailed configuration guide
- **Validation Script**: Automated testing of deployment
- **Troubleshooting Guide**: Common issues and solutions
- **Changelog**: Comprehensive v1.0.0 release notes

## 🎯 Next Steps to Deploy

### 1. Set Up Your Environment

1. **Fork the Repository** (if not already done):
   ```bash
   # Fork https://github.com/manojmanivannan/MealPlanner to your account
   git clone https://github.com/YOUR-USERNAME/MealPlanner.git
   cd MealPlanner
   ```

2. **Update Repository Configuration**:
   - Edit `terraform/service_account.tf`
   - Replace `manojmanivannan/MealPlanner` with `YOUR-USERNAME/MealPlanner`

### 2. Configure GitHub Secrets

Follow the [GitHub Secrets Setup Guide](docs/github-secrets-setup.md):

**Required Secrets:**
- `DB_PASSWORD`: Strong PostgreSQL password
- `SECRET_KEY`: JWT signing key (use `openssl rand -base64 32`)
- `BILLING_ACCOUNT_ID`: Your GCP billing account ID

**Repository Variables:**
- `PROJECT_ID`: `n8n-meal-planner-research`
- `REGION`: `us-east1`
- `ARTIFACT_REPO`: `mealplanner-docker`

### 3. Initial Deployment

```bash
# 1. Set up GCP project and authentication
gcloud projects create n8n-meal-planner-research --name="MealPlanner"
gcloud config set project n8n-meal-planner-research
gcloud auth application-default login

# 2. Deploy infrastructure locally (first time)
cd terraform
terraform init
terraform plan -var="db_password=YOUR_DB_PASSWORD" -var="secret_key=YOUR_SECRET_KEY" -var="billing_account_id=YOUR_BILLING_ID"
terraform apply

# 3. Push to trigger CI/CD
git add .
git commit -m "Initial deployment setup"
git push origin main
```

### 4. Validate Deployment

```bash
# Run the validation script
./scripts/validate-deployment.sh

# Or manually check
gcloud run services list --region=us-east1
```

## 📋 Pre-Deployment Checklist

- [ ] GCP account with billing enabled
- [ ] GitHub repository forked/cloned
- [ ] Repository name updated in `terraform/service_account.tf`
- [ ] GitHub secrets configured (DB_PASSWORD, SECRET_KEY, BILLING_ACCOUNT_ID)
- [ ] GitHub variables configured (PROJECT_ID, REGION, ARTIFACT_REPO)
- [ ] gcloud CLI installed and authenticated
- [ ] Terraform installed (>= 1.0)

## 🛠️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Repo   │    │  GitHub Actions  │    │  GCP Project    │
│                 │    │                  │    │                 │
│ • Source Code   │───▶│ • Run Tests      │───▶│ • Cloud Run     │
│ • Terraform     │    │ • Build Images   │    │ • Cloud SQL     │
│ • Workflows     │    │ • Deploy Infra   │    │ • Artifact Reg  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Data Flow:**
1. Code push triggers GitHub Actions
2. Tests run automatically
3. Docker images built and pushed to Artifact Registry
4. Terraform deploys/updates infrastructure
5. Database initialization job runs
6. Services become available at Cloud Run URLs

## 💰 Cost Estimation

**Monthly costs (estimated):**
- **Cloud Run**: $0-10 (scales to zero, pay per use)
- **Cloud SQL**: $7-15 (db-f1-micro instance)
- **Artifact Registry**: $0-2 (for image storage)
- **Secret Manager**: $0-1 (for secret operations)
- **Other Services**: $0-2 (load balancing, monitoring)

**Total: $7-30/month** (budget alert set at $30)

## 🔍 Monitoring & Operations

### View Application
- **Frontend**: `https://mealplanner-frontend-XXXX-uc.a.run.app`
- **Backend API**: `https://mealplanner-backend-XXXX-uc.a.run.app`
- **Health Checks**: `/health` and `/healthz` endpoints

### Monitor Costs
- [GCP Billing Console](https://console.cloud.google.com/billing)
- Budget alerts configured for 50%, 75%, 90%, 100%
- Email notifications to project owners

### View Logs
```bash
# Backend logs
gcloud logs read "resource.type=cloud_run_revision resource.labels.service_name=mealplanner-backend" --limit 50

# Frontend logs
gcloud logs read "resource.type=cloud_run_revision resource.labels.service_name=mealplanner-frontend" --limit 50
```

### Database Access
```bash
# Connect to database
gcloud sql connect mealplanner-db-XXXX --user=mealplanner --region=us-east1
```

## 🆘 Support & Troubleshooting

1. **Check GitHub Actions**: View workflow logs for deployment issues
2. **Run Validation**: Use `./scripts/validate-deployment.sh`
3. **Review Logs**: Check Cloud Run service logs in GCP Console
4. **Read Documentation**: Detailed guides in `DEPLOYMENT.md`
5. **Common Issues**: See troubleshooting section in deployment guide

## 🎉 Success Indicators

After deployment, you should see:
- ✅ GitHub Actions workflow completed successfully
- ✅ Cloud Run services showing "Ready" status
- ✅ Database instance in "RUNNABLE" state
- ✅ Health endpoints returning "OK"
- ✅ Application accessible via Cloud Run URLs
- ✅ Budget alerts configured and active

---

## 🚀 Ready to Deploy!

Your MealPlanner application is now production-ready with:
- **Scalable Architecture**: Auto-scaling Cloud Run services
- **Automated Deployment**: Complete CI/CD with GitHub Actions
- **Security Best Practices**: Secrets management, workload identity, least privilege
- **Cost Control**: Budget monitoring and alerts
- **Comprehensive Documentation**: Everything you need to operate the system

**Time to deploy**: Follow the steps above and your application will be live in ~10-15 minutes!

---

**Questions?** Check the [DEPLOYMENT.md](DEPLOYMENT.md) guide or open an issue in the repository.
