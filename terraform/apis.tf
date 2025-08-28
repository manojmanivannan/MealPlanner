resource "google_project_service" "run" {
  service = "run.googleapis.com"
}
resource "google_project_service" "sqladmin" {
  service = "sqladmin.googleapis.com"
}
resource "google_project_service" "secretmanager" {
  service = "secretmanager.googleapis.com"
}
resource "google_project_service" "storage" {
  service = "storage.googleapis.com"
}
resource "google_project_service" "artifactregistry" {
  service = "artifactregistry.googleapis.com"
}
