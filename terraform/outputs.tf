output "cloud_run_backend_url" {
  description = "URL for the backend Cloud Run service"
  value       = google_cloud_run_service.backend.status[0].url
}

output "cloud_sql_instance_connection_name" {
  description = "Cloud SQL instance connection name"
  value       = google_sql_database_instance.mealplanner.connection_name
}

output "frontend_bucket_url" {
  description = "URL for the public static site bucket"
  value       = "https://storage.googleapis.com/${google_storage_bucket.frontend_bucket.name}/"
}

output "service_account_email" {
  description = "Service account email used for Cloud Run and Cloud SQL access"
  value       = google_service_account.mealplanner.email
}
