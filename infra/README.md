# Infrastructure

This directory will contain:

- `helm/` — Helm charts for each service
- `helmfile.yaml` — deploy the full platform in one command
- `terraform/` — cloud infrastructure (VPC, RDS, Redis, S3/R2, EKS)
- `k8s/` — raw Kubernetes manifests (used as Helm chart source)

## Status

Infrastructure-as-code is not yet committed. The platform currently runs via `docker-compose` for local development.

See the [Deployment](../README.md#deployment) section in the README for the intended production topology.

## Contributing

If you're adding a new service, create a Helm chart under `helm/<service-name>/` following the pattern of existing charts once they are added. Minimum required templates: `deployment.yaml`, `service.yaml`, `configmap.yaml`, `_helpers.tpl`, `values.yaml`.
