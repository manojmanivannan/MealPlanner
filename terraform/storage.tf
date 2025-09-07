resource "google_storage_bucket" "frontend_bucket" {
  name          = "${var.project_id}-frontend-static"
  location      = var.region
  force_destroy = true
  uniform_bucket_level_access = true
  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }
}

resource "google_storage_bucket_iam_member" "public_access" {
  bucket = google_storage_bucket.frontend_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
