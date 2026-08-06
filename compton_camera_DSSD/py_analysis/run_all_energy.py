import subprocess
import os
import numpy as np

energies = np.logspace(np.log10(0.1), np.log10(20), 20) 
particle = "gamma"
XeV = "MeV"
for E in energies:
    # 生成宏文件并运行 Geant4
    with open(f"./macro/run_{E:.3f}.mac", "w") as f:
        f.write("/tracking/verbose 0\n")
        f.write("/run/verbose 0\n")
        f.write("/run/numberOfThreads 12\n")   # 多线程（根据CPU核心调整）
        f.write("/run/initialize\n")
        f.write(f"/gps/particle {particle}\n")
        f.write(f"/gps/position 0.5 0.0 -10 cm\n")

        # f.write("/gps/pos/type Plane\n")
        # f.write("/gps/pos/shape Square\n")
        # f.write("/gps/pos/centre 0 0 -10 cm\n")
        # f.write("/gps/pos/halfx 5 cm\n")
        # f.write("/gps/pos/halfy 5 cm\n")
        f.write("/gps/direction 0 0 1\n")

        # f.write("/gps/pos/type Point\n")
        # f.write(f"/gps/pos/centre 0 0 -10 cm\n")
        # f.write("/gps/ang/type iso\n")
        # f.write("/gps/ang/mintheta 175 deg\n")
        # f.write("/gps/ang/maxtheta 180 deg\n")


        f.write(f"/gps/energy {E:.3f} {XeV}\n")
        f.write("/run/beamOn 200000\n")
    
    subprocess.run(["/home/dingjiacheng/compton_satellite_sim/compton_camera_DSSD/build/exampleB2a",
     f"./macro/run_{E:.3f}.mac"])
    
    # ⚠️ 关键！跑完后立刻重命名，防止被下一次运行覆盖
    if os.path.exists("b1output.root"):
        os.rename("b1output.root", f"output_root/b1output_{particle}_{E:.3f}{XeV}.root")