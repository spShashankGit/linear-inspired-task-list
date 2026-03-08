# Deployment Proof Checklist (GCP + GKE)

Use this file as evidence capture for your submission.

## 1) Terraform provisioning evidence
Run:
```bash
cd infra/terraform
terraform init
terraform apply -var="project_id=<PROJECT_ID>" -var="create_cluster=true"
```
Capture:
- Terraform apply summary.
- Output values (`artifact_registry_host`, `cluster_name`, `namespace`).

## 2) Image build/push evidence
Run:
```bash
docker build -f apps/api/Dockerfile -t <API_IMAGE> .
docker build -f apps/web/Dockerfile -t <WEB_IMAGE> .
docker push <API_IMAGE>
docker push <WEB_IMAGE>
```
Capture:
- Successful push logs for both images.

## 3) Kubernetes apply evidence
Run:
```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap-nginx.yaml
kubectl apply -f infra/k8s/api-service.yaml
kubectl apply -f infra/k8s/web-service.yaml
kubectl apply -f infra/k8s/api-deployment.yaml
kubectl apply -f infra/k8s/web-deployment.yaml
kubectl apply -f infra/k8s/ingress.yaml
```
Capture:
- `kubectl get pods -n linear-demo`
- `kubectl get svc -n linear-demo`
- `kubectl get ingress -n linear-demo`

## 4) Runtime smoke-test evidence
Run:
```bash
bash infra/deployment/smoke-test.sh https://<YOUR_PUBLIC_URL>
```
Capture:
- Script output showing web and GraphQL checks passing.

## 5) Cost-control evidence
Capture:
- Planned demo window and teardown date.
- `terraform destroy` command output after review window closes.
