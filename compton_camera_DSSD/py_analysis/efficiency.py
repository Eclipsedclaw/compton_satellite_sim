import uproot
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import glob

# ==========================================
# 第一步：读取并合并所有能量点的 ROOT 数据
# ==========================================
# 假设你的 ROOT 文件都命名为 efficiency_*.root
particle = "gamma"
file_pattern = f"./output_root/b1output_{particle}*.root"
root_files = glob.glob(file_pattern)

if not root_files:
    print("未找到 ROOT 文件！请检查文件名或路径。")
    exit()

print(f"找到 {len(root_files)} 个数据文件，正在读取...")

df_list = []
for file in root_files:
    try:
        with uproot.open(file) as f:
            # 你的 ROOT 文件里有 Ntuple 0 (Tree1) 和 Ntuple 1 (Efficiency)
            # 我们要读取专门存放效率数据的 "Efficiency" Tree
            tree = f["Efficiency"]
            # 将 ROOT 的 Tree 直接转为 Pandas DataFrame
            temp_df = tree.arrays(library="pd")
            df_list.append(temp_df)
    except Exception as e:
        print(f"读取文件 {file} 失败: {e}")

# 将所有的 DataFrame 拼接成一个大的总表
if df_list:
    df_all = pd.concat(df_list, ignore_index=True)
    print(f"成功合并数据，共计 {len(df_all)} 个模拟事件。")
else:
    print("没有读取到有效数据。")
    exit()

# ==========================================
# 第二步：按能量分组，计算效率与误差棒
# ==========================================
# 你的 DataFrame 里包含: Energy_MeV, IsHit, IsFullAbs 三列
def calculate_efficiency(group):
    N = len(group)  # 这个能量点总发射事例数
    
    # 计数统计
    N_hit = group['IsHit'].sum()
    N_full = group['IsFullAbs'].sum()
    N_partial = N_hit - N_full
    
    # 计算效率 (绝对效率)
    eff_total = N_hit / N
    eff_full = N_full / N
    eff_partial = N_partial / N
    
    # 计算泊松统计误差 (二项分布误差公式) - 科研绘图必须加误差棒！
    err_total = np.sqrt(eff_total * (1 - eff_total) / N)
    err_full = np.sqrt(eff_full * (1 - eff_full) / N)
    err_partial = np.sqrt(eff_partial * (1 - eff_partial) / N)
    
    # 返回该能量点下的平均能量和计算结果
    return pd.Series({
        'Energy': group['Energy_MeV'].mean(),
        'Eff_Total': eff_total,
        'Eff_Full': eff_full,
        'Eff_Partial': eff_partial,
        'Err_Total': err_total,
        'Err_Full': err_full,
        'Err_Partial': err_partial
    })

# 按 Energy_MeV 列进行分组并应用计算
df_eff = df_all.groupby('Energy_MeV').apply(calculate_efficiency).reset_index(drop=True)
# 按能量大小对结果排序
df_eff = df_eff.sort_values(by='Energy')
print("数据分组计算完成！")

# ==========================================
# 第三步：绘制带误差棒的效率-能量关系图
# ==========================================
plt.figure(figsize=(10, 7))

# 画出三条曲线，使用 errorbar 添加物理误差棒
plt.errorbar(df_eff['Energy'], df_eff['Eff_Total'], 
             yerr=df_eff['Err_Total'], fmt='o-', 
             capsize=4, label='Total Efficiency', color='black')

plt.errorbar(df_eff['Energy'], df_eff['Eff_Full'], 
             yerr=df_eff['Err_Full'], fmt='s--', 
             capsize=4, label='Full Absorption', color='red')

plt.errorbar(df_eff['Energy'], df_eff['Eff_Partial'], 
             yerr=df_eff['Err_Partial'], fmt='^--', 
             capsize=4, label='Partial Absorption', color='blue')

# 设置坐标轴为对数坐标（伽马探测器效率曲线标准画法）
plt.xscale('log')
plt.yscale('log')

# 设置图像标签和标题
plt.xlabel(r'Gamma Energy (MeV)', fontsize=14)
plt.ylabel('Absolute Efficiency', fontsize=14)
plt.title(f'Detector Efficiency vs Energy ({particle}, 5*Si+CZT) ', fontsize=16)
plt.grid(True, which="both", ls="-", alpha=0.4)

# 添加图例和保存图片
plt.legend(fontsize=12, loc='best')
plt.savefig(f'efficiency_curves_{particle}.png', dpi=600, bbox_inches='tight')
plt.show()

print(f"绘图完成！图像已保存为 'efficiency_curves_{particle}.png'")