#!/bin/bash
# scenario_02_ram_leak.sh — Giả lập RAM leak dần dần

echo "=== Kich ban 2: RAM Leak (5 phut) ==="
echo "Thoi gian bat dau: $(date)"
python3 -c "
import time
data = []
print('Bat dau nap RAM...')
for i in range(400):
    data.append(' ' * 10**6)  # +1MB moi 0.5s
    if i % 50 == 0:
        print(f'  {i*1}MB da nap...')
    time.sleep(0.5)
print('Giu RAM trong 60 giay...')
time.sleep(60)
print('Giai phong RAM')
"
echo "Thoi gian ket thuc: $(date)"
echo "=== Done ==="
