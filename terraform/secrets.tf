resource "google_secret_manager_secret" "db_password" {
  secret_id = "mealplanner-db-password"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "mealplanner-database-url"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "database_url_version" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${var.db_user}:${var.db_password}@//${google_sql_database_instance.mealplanner.connection_name}/${var.db_name}"
}
