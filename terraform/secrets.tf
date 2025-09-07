# Secret Manager secrets for secure configuration
resource "google_secret_manager_secret" "db_password" {
  secret_id = "mealplanner-db-password"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

resource "google_secret_manager_secret" "secret_key" {
  secret_id = "mealplanner-secret-key"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "secret_key_version" {
  secret      = google_secret_manager_secret.secret_key.id
  secret_data = var.secret_key
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "mealplanner-database-url"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "database_url_version" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${var.db_user}:${var.db_password}@localhost/${var.db_name}?host=/cloudsql/${google_sql_database_instance.mealplanner.connection_name}"
}
