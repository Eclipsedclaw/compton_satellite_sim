import subprocess
import os
import numpy as np

energies = np.logspace(np.log10(0.1), np.log10(10), 20) 
particle = "gamma"
for E in energies:
    # 生成宏文件并运行 Geant4
    with open(f"./macro/run_{E:.3f}.mac", "w") as f:
        f.write(f"/tracking/verbose 0\n")
        f.write(f"/run/verbose 0\n")
        f.write(f"/run/initialize\n")
        f.write(f"/gps/particle {particle}\n")
        f.write(f"/gps/position 0 0 -10 cm\n")
        f.write(f"/gps/direction 0 0 1\n")
        f.write(f"/gps/energy {E:.3f} MeV\n")
        f.write("/run/beamOn 100000\n")
    
    subprocess.run(["/home/dingjiacheng/compton_satellite_sim/compton_camera_DSSD/build/exampleB2a",
     f"./macro/run_{E:.3f}.mac"])
    
    # ⚠️ 关键！跑完后立刻重命名，防止被下一次运行覆盖
    if os.path.exists("b1output.root"):
        os.rename("b1output.root", f"output_root/b1output_{particle}_{E:.3f}MeV.root")