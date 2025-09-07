output "backend_url" {
  description = "URL for the backend Cloud Run service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "URL for the frontend Cloud Run service"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "cloud_sql_instance_connection_name" {
  description = "Cloud SQL instance connection name"
  value       = google_sql_database_instance.mealplanner.connection_name
}

output "service_account_email" {
  description = "Service account email used for Cloud Run and Cloud SQL access"
  value       = google_service_account.mealplanner.email
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.mealplanner_docker.repository_id}"
}

output "database_url_secret" {
  description = "Secret Manager secret ID for database URL"
  value       = google_secret_manager_secret.database_url.secret_id
  sensitive   = true
}
