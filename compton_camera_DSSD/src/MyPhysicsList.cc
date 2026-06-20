//
// MyPhysicsList.cc
// 自定义物理列表实现，使用 Livermore Compton 模型
//

#include "MyPhysicsList.hh"

// 基本粒子
#include "G4Gamma.hh"
#include "G4Electron.hh"
#include "G4Positron.hh"
#include "G4Proton.hh"
#include "G4Neutron.hh"

// 物理过程
#include "G4ComptonScattering.hh"
#include "G4LivermoreComptonModel.hh"
#include "G4GammaConversion.hh"
#include "G4PhotoElectricEffect.hh"
#include "G4LivermorePhotoElectricModel.hh"
#include "G4eIonisation.hh"
#include "G4eBremsstrahlung.hh"
#include "G4eplusAnnihilation.hh"
#include "G4MuIonisation.hh"
#include "G4MuBremsstrahlung.hh"
#include "G4MuPairProduction.hh"
#include "G4hIonisation.hh"
#include "G4KleinNishinaCompton.hh"
#include "G4KleinNishinaModel.hh"
#include "G4eMultipleScattering.hh"
// 输运过程
#include "G4Transportation.hh"

// 衰变过程
#include "G4Decay.hh"
#include "G4RadioactiveDecay.hh"
#include "G4UAtomicDeexcitation.hh"

// 过程管理
#include "G4ProcessManager.hh"
#include "G4EmParameters.hh"
#include "G4SystemOfUnits.hh"

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

MyPhysicsList::MyPhysicsList()
{
    // 设置默认截止值
    defaultCutValue = 0.1 * mm;  // 1mm对于医学成像通常是足够的
    
    // 配置电磁参数
    G4EmParameters* emParams = G4EmParameters::Instance();
    emParams->SetVerbose(1);
    emParams->SetMinEnergy(100 * eV);      // 最小能量
    emParams->SetMaxEnergy(10 * GeV);      // 最大能量
    emParams->SetNumberOfBinsPerDecade(20); // 每十年的bin数
    emParams->SetMscStepLimitType(fUseDistanceToBoundary); // 步长限制类型
    
    // 启用原子退激发（对于特征X射线和俄歇电子很重要）
    emParams->SetFluo(true);
    emParams->SetAuger(true);
    emParams->SetPixe(true);
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

MyPhysicsList::~MyPhysicsList()
{}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void MyPhysicsList::ConstructParticle()
{
    // 构造基本粒子
    G4Gamma::GammaDefinition();
    G4Electron::ElectronDefinition();
    G4Positron::PositronDefinition();
    G4Proton::ProtonDefinition();
    G4Neutron::NeutronDefinition();
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void MyPhysicsList::ConstructProcess()
{
    // 添加输运过程
    AddTransportation();
    
    // 添加电磁物理过程
    AddEMPhysics();
    
    // 添加衰变过程
    AddDecayPhysics();
    
    // 添加放射性衰变（可选，如果需要放射性源）
    // AddRadioactiveDecayPhysics();
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void MyPhysicsList::AddEMPhysics()
{
    // // 获取原子退激发管理器
    // G4VAtomDeexcitation* deexcitation = new G4UAtomicDeexcitation();
    // deexcitation->SetFluo(true);
    // deexcitation->SetAuger(true);
    // deexcitation->SetPixe(true);
    // G4LossTableManager::Instance()->SetAtomDeexcitation(deexcitation);

    auto particleIterator = GetParticleIterator();
    particleIterator->reset();
    
    while ((*particleIterator)()) {
        G4ParticleDefinition* particle = particleIterator->value();
        G4ProcessManager* pmanager = particle->GetProcessManager();
        G4String particleName = particle->GetParticleName();
        
        // ===== 伽马射线过程 =====
        if (particleName == "gamma") {
            // Compton 散射 - 使用 Livermore 模型
            G4ComptonScattering* comptonProcess = new G4ComptonScattering();
            comptonProcess->SetEmModel(new G4LivermoreComptonModel());
            // FEA
            // comptonProcess->SetEmModel(new G4KleinNishinaCompton());
            //IA
            // comptonProcess->SetEmModel(new G4KleinNishinaModel());
            pmanager->AddDiscreteProcess(comptonProcess);
            
            // 光电效应 - 使用 Livermore 模型
            G4PhotoElectricEffect* photoElectricProcess = new G4PhotoElectricEffect();
            photoElectricProcess->SetEmModel(new G4LivermorePhotoElectricModel());
            pmanager->AddDiscreteProcess(photoElectricProcess);
            
            // Gamma 转换
            pmanager->AddDiscreteProcess(new G4GammaConversion());
        }
        
        // ===== 电子过程 =====
        // else if (particleName == "e-") {
        //     // 电子电离
        //     pmanager->AddProcess(new G4eIonisation(), -1, 1, 1);
        //     // 电子轫致辐射
        //     pmanager->AddProcess(new G4eBremsstrahlung(), -1, -1, 2);
        // }
        else if (particleName == "e-") {
    // 1) 多重散射 (Multiple Scattering) —— 必须放在电离/轫致辐射之前
    pmanager->AddProcess(new G4eMultipleScattering(), -1, -1, 1);

    // 2) 电子电离 (Ionisation)
    pmanager->AddProcess(new G4eIonisation(),        -1,  1, 2);

    // 3) 电子轫致辐射 (Bremsstrahlung)
    pmanager->AddProcess(new G4eBremsstrahlung(),    -1, -1, 3);
}
        
        // ===== 正电子过程 =====
        else if (particleName == "e+") {
            // 正电子电离
            pmanager->AddProcess(new G4eIonisation(), -1, 1, 1);
            // 正电子轫致辐射
            pmanager->AddProcess(new G4eBremsstrahlung(), -1, -1, 2);
            // 正电子湮灭
            pmanager->AddProcess(new G4eplusAnnihilation(), 0, -1, 3);
        }
        
        // ===== 质子过程 =====
        else if (particleName == "proton") {
            // 质子电离
            pmanager->AddProcess(new G4hIonisation(), -1, 1, 1);
        }
        
        // ===== 中子过程 =====（可选，根据需求添加）
        else if (particleName == "neutron") {
            // 可以添加中子相关过程
        }
    }
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void MyPhysicsList::AddDecayPhysics()
{
    // 添加普通衰变过程
    G4Decay* decayProcess = new G4Decay();
    
    auto particleIterator = GetParticleIterator();
    particleIterator->reset();
    
    while ((*particleIterator)()) {
        G4ParticleDefinition* particle = particleIterator->value();
        G4ProcessManager* pmanager = particle->GetProcessManager();
        
        if (decayProcess->IsApplicable(*particle)) {
            pmanager->AddProcess(decayProcess);
            pmanager->SetProcessOrdering(decayProcess, idxPostStep);
            pmanager->SetProcessOrdering(decayProcess, idxAtRest);
        }
    }
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

// void MyPhysicsList::AddRadioactiveDecayPhysics()
// {
//     // 添加放射性衰变过程（如果需要放射性源）
//     G4RadioactiveDecay* radioactiveDecay = new G4RadioactiveDecay();
//     radioactiveDecay->SetHLThreshold(-1.0 * s);  // 所有核素都衰变
//     radioactiveDecay->SetICM(true);              // 内转换
//     radioactiveDecay->SetARM(false);             // 原子弛豫
    
//     auto particleIterator = GetParticleIterator();
//     particleIterator->reset();
    
//     while ((*particleIterator)()) {
//         G4ParticleDefinition* particle = particleIterator->value();
//         G4ProcessManager* pmanager = particle->GetProcessManager();
        
//         if (radioactiveDecay->IsApplicable(*particle)) {
//             pmanager->AddProcess(radioactiveDecay);
//             pmanager->SetProcessOrdering(radioactiveDecay, idxPostStep);
//             pmanager->SetProcessOrdering(radioactiveDecay, idxAtRest);
//         }
//     }
// }

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void MyPhysicsList::SetCuts()
{
    // 设置默认截止值
    SetCutsWithDefault();
    
    // 为特定粒子设置更精细的截止值
    SetSpecificCuts();
    
    if (verboseLevel > 0) {
        DumpCutValuesTable();
    }
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void MyPhysicsList::SetSpecificCuts()
{
    // 针对医学成像应用设置更低的截止值
    // 这对于低能光子和电子很重要
    
    // 伽马射线：0.01 mm
    SetCutValue(0.01 * mm, "gamma");
    
    // 电子和正电子：0.01 mm  
    SetCutValue(0.01 * mm, "e-");
    SetCutValue(0.01 * mm, "e+");
    
    // 其他带电粒子使用默认值
    // 质子、α粒子等可以使用较大的截止值以节省计算时间
    SetCutValue(0.1 * mm, "proton");
    SetCutValue(0.1 * mm, "alpha");
    SetCutValue(0.1 * mm, "He3");
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......