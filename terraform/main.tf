# Terraform template for GCP deployment

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_artifact_registry_repository" "mealplanner" {
  name     = "mealplanner-repo"
  format   = "DOCKER"
  location = var.region
}

resource "google_sql_database_instance" "mealplanner" {
  name             = "mealplanner-db"
  database_version = "POSTGRES_13"
  region           = var.region
  settings {
    tier = "db-f1-micro"
  }
}

resource "google_sql_user" "mealplanner" {
  name     = var.db_user
  instance = google_sql_database_instance.mealplanner.name
  password = var.db_password
}

resource "google_sql_database" "mealplanner" {
  name     = var.db_name
  instance = google_sql_database_instance.mealplanner.name
}

resource "google_cloud_run_service" "backend" {
  name     = "mealplanner-backend"
  location = var.region
  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/mealplanner-backend"
        env {
          name  = "DB_HOST"
          value = google_sql_database_instance.mealplanner.connection_name
        }
        env {
          name  = "DB_USER"
          value = var.db_user
        }
        env {
          name  = "DB_PASSWORD"
          value = var.db_password
        }
        env {
          name  = "DB_NAME"
          value = var.db_name
        }
        env {
          name  = "SECRET_KEY"
          value = var.secret_key
        }
      }
    }
  }
  traffics {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service" "frontend" {
  name     = "mealplanner-frontend"
  location = var.region
  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/mealplanner-frontend"
      }
    }
  }
  traffics {
    percent         = 100
    latest_revision = true
  }
}

output "backend_url" {
  value = google_cloud_run_service.backend.status[0].url
}

output "frontend_url" {
  value = google_cloud_run_service.frontend.status[0].url
}
