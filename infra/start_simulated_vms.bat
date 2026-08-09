@echo off
REM start_simulated_vms.bat
REM Chạy 3 container Node Exporter trên Docker để giả lập 3 máy chủ Ubuntu ngay trên máy local
REM Ports: 9101 (ubuntu-server-01), 9102 (ubuntu-server-02), 9103 (ubuntu-server-03)

echo ==================================================
echo  Khoi tao 3 cum Node Exporter Docker (Gia lap 3 Ubuntu VMs)
echo ==================================================

docker run -d --name ubuntu-server-01 -p 9101:9100 prom/node-exporter:latest
docker run -d --name ubuntu-server-02 -p 9102:9100 prom/node-exporter:latest
docker run -d --name ubuntu-server-03 -p 9103:9100 prom/node-exporter:latest

echo.
echo [OK] 3 Container gia lap dang chay:
echo  - ubuntu-server-01: http://localhost:9101/metrics
echo  - ubuntu-server-02: http://localhost:9102/metrics
echo  - ubuntu-server-03: http://localhost:9103/metrics
echo ==================================================
