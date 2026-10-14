variable "project_id" {
  description = "ID del proyecto en Google Cloud Platform (GCP)"
  type        = string
  default     = "unisangil-arquitectura-cloud"
}

variable "region" {
  description = "Region de despliegue en la nube"
  type        = string
  default     = "us-central1"
}

variable "cluster_name" {
  description = "Nombre del cluster de Kubernetes (GKE)"
  type        = string
  default     = "cloud-native-k8s-cluster"
}

variable "environment" {
  description = "Entorno de despliegue (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "min_node_count" {
  description = "Numero minimo de nodos en el Node Pool por zona"
  type        = number
  default     = 1
}

variable "max_node_count" {
  description = "Numero maximo de nodos para autoescalado en el Node Pool"
  type        = number
  default     = 3
}

variable "machine_type" {
  description = "Tipo de maquina para los nodos trabajadores de Kubernetes"
  type        = string
  default     = "e2-standard-2"
}
