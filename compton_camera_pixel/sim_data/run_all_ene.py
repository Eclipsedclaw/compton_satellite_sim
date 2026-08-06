import os
import subprocess
import math
import numpy as np
import time

EXE_PATH = "/home/dingjiacheng/compton_satellite_sim/compton_camera_pixel/build/exampleB2a"
MACRO_DIR = "./macro"
OUTPUT_DIR = "./output_root"

PARTICLE = "gamma"
ENERGIES = [0.3, 0.4, 0.5, 0.6, 0.662, 0.8, 1.0, 1.2, 1.5]
Z_LIST = [-2.0, -0.5, -1.0]
DETECTOR_RADIUS = 2.0          # 探测器半径 in cm
EVENTS = 8000000               # 模拟事例数

OFFSET_RATIOS = [
    (0.0, 0.0),
    (math.tan(math.radians(15)), 0.0),
    (-math.tan(math.radians(15)), 0.0),
    (0.0, math.tan(math.radians(15))),
    (0.0, -math.tan(math.radians(15)))
]
OFFSET_LABELS = ["center", "xp", "xm", "yp", "ym"]

os.makedirs(MACRO_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_local_axes(direction):
    u = np.array(direction) / np.linalg.norm(direction)
    ref = np.array([1.0, 0.0, 0.0]) if abs(np.dot(u, [1,0,0])) <= 0.9 else np.array([0.0,1.0,0.0])
    v1 = ref - np.dot(ref, u) * u
    v1 /= np.linalg.norm(v1)
    v2 = np.cross(u, v1)
    v2 /= np.linalg.norm(v2)
    return v1, v2

# ===== 主循环 =====
for z_m in Z_LIST:
    z_cm = z_m * 100.0
    for idx, (rx, ry) in enumerate(OFFSET_RATIOS):
        x_cm = rx * z_cm
        y_cm = ry * z_cm
        pos = np.array([x_cm, y_cm, z_cm])
        dist = np.linalg.norm(pos)
        theta_max = math.degrees(math.asin(DETECTOR_RADIUS / dist))
        direction = -pos / dist
        rot1, rot2 = get_local_axes(direction)
        z_label = f"z{abs(z_m):g}m"
        pos_label = OFFSET_LABELS[idx]

        for E in ENERGIES:
            macro_name = f"run_{PARTICLE}_{E:.3f}MeV_{z_label}_{pos_label}.mac"
            macro_path = os.path.join(MACRO_DIR, macro_name)
            # 生成随机种子
            seed1 = int(time.time_ns() % 2**31)  # Geant4 接受有符号32位整数
            seed2 = int(os.getpid() + time.time_ns() % 2**31)
            # 生成宏文件
            with open(macro_path, "w") as f:
                f.write("/tracking/verbose 0\n")
                f.write("/run/verbose 0\n")
                f.write("/run/numberOfThreads 14\n")   # 多线程（根据CPU核心调整）
                f.write(f"/random/setSeeds {seed1} {seed2}\n") # Random Seed bind to system clock
                f.write("/run/initialize\n")
                f.write(f"/gps/particle {PARTICLE}\n")
                # POINT shape
                f.write("/gps/pos/type Point\n")
                f.write(f"/gps/pos/centre {x_cm:.2f} {y_cm:.2f} {z_cm:.2f} cm\n")
                f.write("/gps/ang/type iso\n")
                f.write(f"/gps/ang/mintheta {180 - theta_max:.2f} deg\n")
                f.write(f"/gps/ang/maxtheta 180 deg\n")
                f.write(f"/gps/ang/rot1 {rot1[0]:.3f} {rot1[1]:.3f} {rot1[2]:.3f}\n")
                f.write(f"/gps/ang/rot2 {rot2[0]:.3f} {rot2[1]:.3f} {rot2[2]:.3f}\n")

                # Plane shape     
                # f.write("/gps/pos/type Plane\n")
                # f.write("/gps/pos/shape Square\n")
                # f.write(f"/gps/pos/centre {x_cm:.2f} {y_cm:.2f} {z_cm:.2f} cm\n")
                # f.write("/gps/pos/halfx 2 cm\n")
                # f.write("/gps/pos/halfy 2 cm\n")
                
                # f.write(f"/gps/position {pos[0]} {pos[1]} {pos[2]} cm\n")
                # f.write(f"/gps/direction {direction[0]} {direction[1]} {direction[2]}\n")

                f.write(f"/gps/energy {E:.3f} MeV\n")
                f.write(f"/run/beamOn {EVENTS}\n")

            # 运行模拟
            print(f"Running {macro_name} ...")
            subprocess.run([EXE_PATH, macro_path], check=True)

            # 重命名输出文件（从默认的 b1output.root 改为带参数的文件名）
            src_root = "b1output.root"
            if os.path.exists(src_root):
                dst_root = f"b1output_{PARTICLE}_{E:.3f}MeV_{z_label}_{pos_label}.root"
                dst_path = os.path.join(OUTPUT_DIR, dst_root)
                os.rename(src_root, dst_path)
                print(f" -> Saved to {dst_path}")
            else:
                print(f"Warning: {src_root} not found after run.")

print("All done!")