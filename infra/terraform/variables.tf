variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Primary GCP region"
  type        = string
  default     = "europe-west3"
}

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "linear-inspired-demo"
}

variable "artifact_repository" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "linear-inspired"
}

variable "namespace" {
  description = "Kubernetes namespace for app workloads"
  type        = string
  default     = "linear-demo"
}

variable "create_cluster" {
  description = "Create GKE Autopilot cluster (set false to avoid costs)"
  type        = bool
  default     = false
}
