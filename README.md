# Unidad 3: Arquitectura Cloud-Native, Infraestructura como Codigo, Observabilidad y Seguridad

Autor: Camilo Alexander Vargas Quintero
Asignatura: Arquitectura de Software - UNISANGIL

## 1. Alcance del Proyecto Practico

1. Microservicio en Node.js + TypeScript (src/):
   - API RESTful conectada a un Bus de Eventos (ITEM_CREATED).
   - Observabilidad Arquitectonica (Los 3 Pilares):
     * Metricas en formato Prometheus en /api/v1/metrics.
     * Logs estructurados en JSON con latencia y estado HTTP.
     * Trazas distribuidas mediante propagacion de cabecera X-Trace-Id.
   - Seguridad DevSecOps y Zero Trust:
     * Autenticacion JWT (HMAC-SHA256) en POST /api/v1/auth/token.
     * Cabeceras HTTP seguras y ejecucion Docker con usuario no-root.
   - Patrones de Resiliencia:
     * Circuit Breaker (CLOSED, OPEN, HALF_OPEN) con respuesta Fallback.
     * Retry con Exponential Backoff.
     * Rate Limiting por IP.

2. Contenerizacion con Docker y Orquestacion con Kubernetes / Minikube (Dockerfile, k8s/):
   - Dockerfile Multi-Stage optimizado sobre node:20-alpine.
   - Manifiestos en k8s/: Namespace, ConfigMap, Secret, Deployment con livenessProbe y readinessProbe, Service NodePort (30080) y HorizontalPodAutoscaler (HPA).

3. Infraestructura como Codigo con Terraform (terraform/):
   - Aprovisionamiento declarativo de VPC, Subred con rangos secundarios para Pods/Services y Cluster GKE (Google Kubernetes Engine) con Node Pool autoescalable.

4. Pipeline CI/CD en GitHub Actions (.github/workflows/ci-cd.yml):
   - Compila el microservicio TypeScript.
   - Ejecuta las 6 pruebas unitarias y de integracion con Jest.
   - Construye la imagen Docker y despliega automaticamente en el cluster Kubernetes.

## 2. Comandos de Verificacion Local

1. Instalar dependencias: npm install
2. Compilar el microservicio: npm run build
3. Ejecutar pruebas unitarias: npm test
4. Desplegar en Minikube: .\scripts\deploy-minikube.ps1
