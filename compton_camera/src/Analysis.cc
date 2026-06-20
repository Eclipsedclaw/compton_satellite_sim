// ********************************************************************
// * License and Disclaimer                                           *
// *                                                                  *
// * The  Geant4 software  is  copyright of the Copyright Holders  of *
// * the Geant4 Collaboration.  It is provided  under  the terms  and *
// * conditions of the Geant4 Software License,  included in the file *
// * LICENSE and available at  http://cern.ch/geant4/license .  These *
// * include a list of copyright holders.                             *
// *                                                                  *
// * Neither the authors of this software system, nor their employing *
// * institutes,nor the agencies providing financial support for this *
// * work  make  any representation or  warranty, express or implied, *
// * regarding  this  software system or assume any liability for its *
// * use.  Please see the license in the file  LICENSE  and URL above *
// * for the full disclaimer and the limitation of liability.         *
// *                                                                  *
// * This  code  implementation is the result of  the  scientific and *
// * technical work of the GEANT4 collaboration.                      *
// * By using,  copying,  modifying or  distributing the software (or *
// * any work based  on the software)  you  agree  to acknowledge its *
// * use  in  resulting  scientific  publications,  and indicate your *
// * acceptance of all terms of the Geant4 Software license.          *
// ********************************************************************
//
// \file B1/src/Analysis.cc
// \brief Implementation of the Analysis class for managing simulation data output

#include "Analysis.hh"          // Analysis 类的头文件，定义数据分析接口
#include "G4AutoLock.hh"       // Geant4 提供的互斥锁，用于多线程同步
#include "G4SystemOfUnits.hh"  // Geant4 单位系统（如 MeV）
#include "G4ios.hh"            // Geant4 的输入输出流（如 G4cout）
#include "TrackerHit.hh"  // 🔹 新增：导入 TrackerHitsCollection typedef 和 B2 命名空间

// 定义匿名命名空间，存放静态互斥锁
namespace B2{

std::mutex B2::Analysis::instanceMutex;
std::mutex B2::Analysis::dataManipulationMutex;


// 定义静态单例指针，初始为空
Analysis* Analysis::instance = 0;

// 构造函数，初始化成员变量
Analysis::Analysis() : totEnergyDep(0) {
    histFileName = "b1output"; // 设置默认输出文件名（b1output.root）
}

// 析构函数，释放动态分配的内存
Analysis::~Analysis() {
    if (totEnergyDep) delete totEnergyDep; // 删除总能量沉积的 map
}

// 获取单例实例（线程安全）
Analysis* Analysis::getInstance() {
    G4AutoLock l(&instanceMutex); // 使用互斥锁保护单例创建
    if (instance == 0) instance = new Analysis; // 如果实例不存在，创建新实例
    return instance; // 返回单例实例
}

// 初始化数据分析（创建直方图和 Ntuple）
void Analysis::book(G4bool isMaster) {
    G4AutoLock l(&dataManipulationMutex); // 使用互斥锁保护数据操作
    if (isMaster) { // 仅主线程执行清理和初始化
        if (totEnergyDep) { // 如果 totEnergyDep 已存在，删除并置空
            delete totEnergyDep;
            totEnergyDep = 0;
        }
        totEnergyDep = new std::map<G4int, G4double>; // 创建线程 ID 到能量沉积的映射
        
    }

    G4AnalysisManager* man = G4AnalysisManager::Instance(); // 获取分析管理器实例

    man->SetDefaultFileType("root"); // 设置默认输出文件类型为 ROOT
    man->SetNtupleMerging(true);
    if (isMaster) G4cout << "Opening output file " << histFileName << " ... "; // 主线程打印打开文件信息

    man->OpenFile(histFileName); // 打开输出文件（b1output.root）放在master thread,只生成一个root文件
    
    man->SetFirstHistoId(1); // 设置直方图 ID 从 1 开始
     // 定义所有 Ntuple 列
    
    man->CreateNtuple("Tree1","Hits");
    man->CreateNtupleIColumn("eventID");
    man->CreateNtupleIColumn("trackID");
    man->CreateNtupleIColumn("stepID");
    man->CreateNtupleIColumn("parentID");
    man->CreateNtupleIColumn("chamberID");
    man->CreateNtupleDColumn("x_pre");
    man->CreateNtupleDColumn("y_pre");
    man->CreateNtupleDColumn("z_pre");
    man->CreateNtupleDColumn("px_MeV");
    man->CreateNtupleDColumn("py_MeV");
    man->CreateNtupleDColumn("pz_MeV");
    man->CreateNtupleDColumn("angle_deg");
    man->CreateNtupleDColumn("eDep_MeV");
    man->CreateNtupleDColumn("kineticEnergy_MeV");
    man->CreateNtupleSColumn("particleName");
    man->CreateNtupleSColumn("creatorProcess");
    man->CreateNtupleDColumn("time_ns");
    man->CreateNtupleDColumn("weight");
    man->CreateNtupleDColumn("Step_lenth_mm");
    man->CreateNtupleSColumn("Process_pre");
    man->CreateNtupleDColumn("x_post");
    man->CreateNtupleDColumn("y_post");
    man->CreateNtupleDColumn("z_post");
    man->CreateNtupleSColumn("Process_post");
    man->FinishNtuple();

   
    if (isMaster) G4cout << " done" << G4endl; // 主线程打印完成信息
}

// 分析和记录能量沉积数据
void Analysis::FillNtuple(TrackerHitsCollection* hitsCollection) {
    G4AutoLock l(&dataManipulationMutex); // 使用互斥锁保护数据操作
    
    G4AnalysisManager* man = G4AnalysisManager::Instance(); // 获取分析管理器实例
    
    G4int nofHits = hitsCollection->entries();

    for (G4int i = 0; i < nofHits; i++) {
        TrackerHit* hit = (*hitsCollection)[i];
        if (!hit) {
            G4cerr << "Error: Null hit at index " << i << "!" << G4endl;
            continue;
        }

        // 填充 Ntuple 列
        man->FillNtupleIColumn(0, hit->GetEventID());
        man->FillNtupleIColumn(1, hit->GetTrackID());
        man->FillNtupleIColumn(2, hit->GetStepID());
        man->FillNtupleIColumn(3, hit->GetParentID());
        man->FillNtupleIColumn(4, hit->GetChamberNb());
        man->FillNtupleDColumn(5, hit->GetPos().x() / mm);
        man->FillNtupleDColumn(6, hit->GetPos().y() / mm);
        man->FillNtupleDColumn(7, hit->GetPos().z() / mm);
        man->FillNtupleDColumn(8, hit->GetMomentum().x() / MeV);
        man->FillNtupleDColumn(9, hit->GetMomentum().y() / MeV);
        man->FillNtupleDColumn(10, hit->GetMomentum().z() / MeV);
        man->FillNtupleDColumn(11, hit->GetAngle() / deg);
        man->FillNtupleDColumn(12, hit->GetEdep() / MeV);
        man->FillNtupleDColumn(13, hit->GetKineticEnergy() / MeV);
        man->FillNtupleSColumn(14, hit->GetParticleName());
        man->FillNtupleSColumn(15, hit->GetCreatorProcess());
        man->FillNtupleDColumn(16, hit->GetTime() / ns);
        man->FillNtupleDColumn(17, hit->GetWeight());
        man->FillNtupleDColumn(18,hit->GetStepLength() /mm);
        man->FillNtupleSColumn(19, hit->GetProcess());
        man->FillNtupleDColumn(20, hit->PostPos().x() / mm);
        man->FillNtupleDColumn(21, hit->PostPos().y() / mm);
        man->FillNtupleDColumn(22, hit->PostPos().z() / mm);
        man->FillNtupleSColumn(23, hit->GetpostProcess());
        man->AddNtupleRow();

        // 更新总能量沉积
        G4int threadID = G4Threading::G4GetThreadId();
        if (totEnergyDep->count(threadID)) {
            (*totEnergyDep)[threadID] += hit->GetEdep() / MeV;
        } else {
            (*totEnergyDep)[threadID] = hit->GetEdep() / MeV;
        }
    }
}

// 完成数据分析并保存结果
void Analysis::finish(G4bool isMaster) {
    G4AutoLock l(&dataManipulationMutex); // 使用互斥锁保护数据操作
    G4AnalysisManager* man = G4AnalysisManager::Instance(); // 获取分析管理器实例
  
    man->Write(); // 写入数据到文件（b1output.root）
    man->CloseFile(); // 关闭输出文件
    man->Clear(); // 清除分析管理器中的数据
    
   
    // G4double totalEnergy = 0.; // 初始化全局总能量沉积
    // G4cout << "End of Run summary" << G4endl; // 打印运行总结
    // for (auto it = totEnergyDep->begin(); it != totEnergyDep->end(); ++it) { // 遍历每个线程的能量沉积
    //     G4cout << "Thread " << it->first << ": Total energy deposition = "
    //            << it->second << " MeV" << G4endl; // 打印线程 ID 和能量沉积
    //     totalEnergy += it->second; // 累加全局总能量沉积
    // }
    // G4cout << "Global total energy deposition: " << totalEnergy << " MeV" << G4endl; // 打印全局总能量沉积
}
}