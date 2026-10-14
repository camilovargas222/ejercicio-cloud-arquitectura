Write-Host "=== 1. Verificando estado de Minikube ===" -ForegroundColor Cyan
minikube status
if ($LASTEXITCODE -ne 0) {
    Write-Host "Iniciando cluster local con Minikube..." -ForegroundColor Yellow
    minikube start --driver=docker
}

Write-Host "=== 2. Construyendo imagen Docker para el entorno de Minikube ===" -ForegroundColor Cyan
docker build -t catalog-microservice:1.0.0 .
minikube image load catalog-microservice:1.0.0

Write-Host "=== 3. Aplicando manifiestos de Kubernetes en orden ===" -ForegroundColor Cyan
kubectl apply -f k8s/01-namespace.yaml
kubectl apply -f k8s/02-configmap.yaml
kubectl apply -f k8s/03-secret.yaml
kubectl apply -f k8s/04-deployment.yaml
kubectl apply -f k8s/05-service.yaml
kubectl apply -f k8s/06-hpa.yaml

Write-Host "=== 4. Esperando despliegue de los Pods ===" -ForegroundColor Cyan
kubectl rollout status deployment/catalog-microservice-deployment -n cloud-native-lab

Write-Host "=== 5. Estado actual de recursos en el namespace cloud-native-lab ===" -ForegroundColor Green
kubectl get all -n cloud-native-lab
