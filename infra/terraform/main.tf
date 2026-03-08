locals {
  required_services = toset([
    "artifactregistry.googleapis.com",
    "container.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com"
  ])
}

resource "google_project_service" "required" {
  for_each = local.required_services

  project                    = var.project_id
  service                    = each.key
  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_repository
  description   = "Container images for linear-inspired-task-list"
  format        = "DOCKER"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "app" {
  account_id   = "linear-inspired-app"
  display_name = "Linear Inspired App Service Account"

  depends_on = [google_project_service.required]
}

resource "google_container_cluster" "autopilot" {
  count = var.create_cluster ? 1 : 0

  name                = var.cluster_name
  project             = var.project_id
  location            = var.region
  enable_autopilot    = true
  deletion_protection = false

  release_channel {
    channel = "REGULAR"
  }

  depends_on = [google_project_service.required]
}
