output "kubernetes_cluster_name" {
  description = "Nombre del cluster de Kubernetes aprovisionado"
  value       = google_container_cluster.primary.name
}

output "kubernetes_cluster_endpoint" {
  description = "Endpoint del API Server del Control Plane de Kubernetes"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "vpc_network_name" {
  description = "Nombre de la VPC creada para el cluster"
  value       = google_compute_network.vpc_network.name
}
