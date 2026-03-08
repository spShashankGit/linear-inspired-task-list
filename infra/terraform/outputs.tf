output "artifact_repository" {
  description = "Artifact Registry repository name"
  value       = google_artifact_registry_repository.containers.repository_id
}

output "artifact_registry_host" {
  description = "Artifact Registry host prefix"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.containers.repository_id}"
}

output "cluster_name" {
  description = "GKE cluster name (if created)"
  value       = var.create_cluster ? google_container_cluster.autopilot[0].name : null
}

output "namespace" {
  description = "Kubernetes namespace used by manifests"
  value       = var.namespace
}
