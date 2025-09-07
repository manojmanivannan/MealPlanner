#!/bin/bash

# MealPlanner Deployment Validation Script
# This script validates the GCP deployment after CI/CD pipeline completion

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="n8n-meal-planner-research"
REGION="us-east1"  # Cheapest GCP region

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a URL is accessible
check_url() {
    local url=$1
    local service_name=$2
    local timeout=10
    
    print_status "Testing $service_name at $url"
    
    if curl -f -s --connect-timeout $timeout "$url" > /dev/null; then
        print_success "$service_name is responding"
        return 0
    else
        print_error "$service_name is not responding at $url"
        return 1
    fi
}

# Function to check health endpoint
check_health() {
    local url=$1
    local service_name=$2
    
    print_status "Checking health endpoint for $service_name"
    
    health_response=$(curl -s -f "$url/health" 2>/dev/null || echo "FAILED")
    
    if [[ "$health_response" == *"OK"* ]]; then
        print_success "$service_name health check passed"
        return 0
    else
        print_error "$service_name health check failed"
        return 1
    fi
}

# Function to check Cloud Run services
check_cloud_run_services() {
    print_status "Checking Cloud Run services status"
    
    # Get backend service info
    backend_info=$(gcloud run services describe mealplanner-backend \
        --region=$REGION \
        --format="value(status.url,status.conditions[0].status)" 2>/dev/null || echo "ERROR ERROR")
    
    backend_url=$(echo $backend_info | cut -d' ' -f1)
    backend_status=$(echo $backend_info | cut -d' ' -f2)
    
    if [[ "$backend_status" == "True" ]]; then
        print_success "Backend service is ready"
        echo "  URL: $backend_url"
    else
        print_error "Backend service is not ready"
        return 1
    fi
    
    # Get frontend service info
    frontend_info=$(gcloud run services describe mealplanner-frontend \
        --region=$REGION \
        --format="value(status.url,status.conditions[0].status)" 2>/dev/null || echo "ERROR ERROR")
    
    frontend_url=$(echo $frontend_info | cut -d' ' -f1)
    frontend_status=$(echo $frontend_info | cut -d' ' -f2)
    
    if [[ "$frontend_status" == "True" ]]; then
        print_success "Frontend service is ready"
        echo "  URL: $frontend_url"
    else
        print_error "Frontend service is not ready"
        return 1
    fi
    
    # Test endpoints
    check_url "$backend_url" "Backend"
    check_health "$backend_url" "Backend"
    
    check_url "$frontend_url" "Frontend"
    check_url "$frontend_url/health" "Frontend Health"
}

# Function to check database
check_database() {
    print_status "Checking Cloud SQL database"
    
    # Get database instance info
    db_info=$(gcloud sql instances list \
        --filter="name~mealplanner-db" \
        --format="value(name,state)" 2>/dev/null || echo "")
    
    if [[ -z "$db_info" ]]; then
        print_error "No database instance found"
        return 1
    fi
    
    db_name=$(echo $db_info | cut -d' ' -f1)
    db_state=$(echo $db_info | cut -d' ' -f2)
    
    if [[ "$db_state" == "RUNNABLE" ]]; then
        print_success "Database instance '$db_name' is running"
    else
        print_error "Database instance '$db_name' is not running (state: $db_state)"
        return 1
    fi
}

# Function to check secrets
check_secrets() {
    print_status "Checking Secret Manager secrets"
    
    secrets=("mealplanner-db-password" "mealplanner-secret-key" "mealplanner-database-url")
    
    for secret in "${secrets[@]}"; do
        if gcloud secrets describe "$secret" > /dev/null 2>&1; then
            print_success "Secret '$secret' exists"
        else
            print_error "Secret '$secret' not found"
            return 1
        fi
    done
}

# Function to check Artifact Registry
check_artifact_registry() {
    print_status "Checking Artifact Registry images"
    
    # Check if repository exists
    if gcloud artifacts repositories describe mealplanner-docker \
        --location=$REGION > /dev/null 2>&1; then
        print_success "Artifact Registry repository exists"
    else
        print_error "Artifact Registry repository not found"
        return 1
    fi
    
    # Check for images
    backend_images=$(gcloud artifacts docker images list \
        $REGION-docker.pkg.dev/$PROJECT_ID/mealplanner-docker/backend \
        --format="value(IMAGE)" --limit=1 2>/dev/null || echo "")
    
    if [[ -n "$backend_images" ]]; then
        print_success "Backend Docker images found"
    else
        print_warning "No backend Docker images found"
    fi
    
    frontend_images=$(gcloud artifacts docker images list \
        $REGION-docker.pkg.dev/$PROJECT_ID/mealplanner-docker/frontend \
        --format="value(IMAGE)" --limit=1 2>/dev/null || echo "")
    
    if [[ -n "$frontend_images" ]]; then
        print_success "Frontend Docker images found"
    else
        print_warning "No frontend Docker images found"
    fi
}

# Function to check budget alerts
check_billing_budget() {
    print_status "Checking billing budget"
    
    # Note: This requires billing account access
    budgets=$(gcloud billing budgets list --format="value(displayName)" 2>/dev/null || echo "")
    
    if [[ "$budgets" == *"MealPlanner"* ]]; then
        print_success "Billing budget is configured"
    else
        print_warning "Unable to verify billing budget (may require additional permissions)"
    fi
}

# Function to test API endpoints
test_api_endpoints() {
    print_status "Testing API endpoints"
    
    # Get backend URL
    backend_url=$(gcloud run services describe mealplanner-backend \
        --region=$REGION \
        --format="value(status.url)" 2>/dev/null || echo "")
    
    if [[ -z "$backend_url" ]]; then
        print_error "Could not get backend URL"
        return 1
    fi
    
    # Test health endpoint
    if check_health "$backend_url" "Backend API"; then
        # Test additional endpoints if health passes
        print_status "Testing additional API endpoints"
        
        # Test recipe endpoint (might return auth error but should be reachable)
        recipes_response=$(curl -s -o /dev/null -w "%{http_code}" "$backend_url/recipes" 2>/dev/null || echo "000")
        
        if [[ "$recipes_response" =~ ^[2345][0-9][0-9]$ ]]; then
            print_success "Recipes endpoint is reachable (HTTP $recipes_response)"
        else
            print_warning "Recipes endpoint may not be reachable"
        fi
    fi
}

# Main validation function
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    MealPlanner Deployment Validation${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    print_status "Starting validation for project: $PROJECT_ID"
    print_status "Region: $REGION"
    echo ""
    
    # Check if gcloud is authenticated and project is set
    current_project=$(gcloud config get-value project 2>/dev/null || echo "")
    if [[ "$current_project" != "$PROJECT_ID" ]]; then
        print_warning "Current gcloud project is '$current_project', expected '$PROJECT_ID'"
        print_status "Setting project to $PROJECT_ID"
        gcloud config set project $PROJECT_ID
    fi
    
    # Validation checks
    validation_passed=true
    
    echo -e "${YELLOW}--- Infrastructure Checks ---${NC}"
    check_cloud_run_services || validation_passed=false
    echo ""
    
    check_database || validation_passed=false
    echo ""
    
    check_secrets || validation_passed=false
    echo ""
    
    check_artifact_registry || validation_passed=false
    echo ""
    
    echo -e "${YELLOW}--- Application Tests ---${NC}"
    test_api_endpoints || validation_passed=false
    echo ""
    
    echo -e "${YELLOW}--- Billing & Monitoring ---${NC}"
    check_billing_budget || validation_passed=false
    echo ""
    
    # Final result
    echo -e "${BLUE}========================================${NC}"
    if [[ "$validation_passed" == true ]]; then
        echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
        echo -e "${GREEN}All checks completed successfully!${NC}"
        echo ""
        echo "🚀 Your MealPlanner application is deployed and ready!"
        echo ""
        echo "📱 Access your application:"
        frontend_url=$(gcloud run services describe mealplanner-frontend --region=$REGION --format="value(status.url)" 2>/dev/null || echo "")
        backend_url=$(gcloud run services describe mealplanner-backend --region=$REGION --format="value(status.url)" 2>/dev/null || echo "")
        
        if [[ -n "$frontend_url" ]]; then
            echo "   Frontend: $frontend_url"
        fi
        if [[ -n "$backend_url" ]]; then
            echo "   Backend:  $backend_url"
        fi
    else
        echo -e "${RED}❌ VALIDATION FAILED${NC}"
        echo -e "${RED}Some checks failed. Please review the errors above.${NC}"
        exit 1
    fi
    echo -e "${BLUE}========================================${NC}"
}

# Check if running with help flag
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "MealPlanner Deployment Validation Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "This script validates the GCP deployment by checking:"
    echo "  - Cloud Run services (backend and frontend)"
    echo "  - Cloud SQL database instance"
    echo "  - Secret Manager secrets"
    echo "  - Artifact Registry images"
    echo "  - API endpoint functionality"
    echo "  - Billing budget configuration"
    echo ""
    echo "Prerequisites:"
    echo "  - gcloud CLI authenticated and configured"
    echo "  - Project ID: n8n-meal-planner-research"
    echo "  - Deployment completed via Terraform/GitHub Actions"
    exit 0
fi

# Run main function
main
