# Terraform Infra (GCP)

This folder provisions baseline infrastructure for a low-cost demo:
- Required GCP APIs
- Artifact Registry for container images
- Service account
- Optional GKE Autopilot cluster (`create_cluster = true`)

## Quick start
```bash
cd infra/terraform
terraform init
terraform apply -var="project_id=<YOUR_PROJECT_ID>" -var="create_cluster=true"
```

If you only want to prepare registry and skip cluster cost, run:
```bash
terraform apply -var="project_id=<YOUR_PROJECT_ID>" -var="create_cluster=false"
```

## Cost and teardown
- Keep `create_cluster=false` until demo week.
- For full teardown after demo:
```bash
terraform destroy -var="project_id=<YOUR_PROJECT_ID>" -var="create_cluster=true"
```
