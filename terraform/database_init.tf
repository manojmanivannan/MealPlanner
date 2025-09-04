# Cloud Run Job for database initialization and seeding
resource "google_cloud_run_v2_job" "db_init" {
  name     = "mealplanner-db-init"
  location = var.region

  template {
    task_count  = 1
    parallelism = 1
    
    template {
      service_account = google_service_account.mealplanner.email
      
      timeout = "300s"
      
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/mealplanner-docker/backend:latest"
        
        command = ["/bin/bash"]
        args = [
          "-c",
          "python setup_db.py && echo 'Database initialization completed'"
        ]
        
        resources {
          limits = {
            cpu    = "1"
            memory = "1Gi"
          }
        }
        
        env {
          name  = "DB_HOST"
          value = "/cloudsql/${google_sql_database_instance.mealplanner.connection_name}"
        }
        env {
          name  = "DB_USER"
          value = var.db_user
        }
        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password.secret_id
              version = "latest"
            }
          }
        }
        env {
          name  = "DB_NAME"
          value = var.db_name
        }
        env {
          name = "SECRET_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secret_key.secret_id
              version = "latest"
            }
          }
        }
        env {
          name  = "ENVIRONMENT"
          value = "production"
        }
        
        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }
      
      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.mealplanner.connection_name]
        }
      }
    }
  }

  depends_on = [
    google_project_service.run,
    google_cloud_run_v2_service.backend,
    google_secret_manager_secret_version.db_password_version,
    google_secret_manager_secret_version.secret_key_version
  ]
}
