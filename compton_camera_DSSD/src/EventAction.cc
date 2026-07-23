#include "EventAction.hh"

#include "G4Event.hh"
#include "G4PrimaryVertex.hh"
#include "G4PrimaryParticle.hh"
#include "G4AnalysisManager.hh"
#include "G4SystemOfUnits.hh"   // 用于 MeV 单位转换

namespace B2
{

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

EventAction::EventAction()
 : fTotalEnergyDeposit(0.0), fPrimaryEnergy(0.0)
{}

EventAction::~EventAction()
{}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void EventAction::BeginOfEventAction(const G4Event* event)
{
    // 1. 重置当前事件的沉积能量
    fTotalEnergyDeposit = 0.0;

    // 2. 获取入射粒子的初始能量（从主顶点提取）
    G4PrimaryVertex* primaryVertex = event->GetPrimaryVertex();
    if (primaryVertex) {
        G4PrimaryParticle* primaryParticle = primaryVertex->GetPrimary();
        if (primaryParticle) {
            fPrimaryEnergy = primaryParticle->GetKineticEnergy();
        }
    }
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void EventAction::EndOfEventAction(const G4Event* event)
{
    // 获取分析管理器（用于写入数据）
    G4AnalysisManager* man = G4AnalysisManager::Instance();

    G4double edep = fTotalEnergyDeposit;
    G4double ePrim = fPrimaryEnergy;

    // 判定逻辑（阈值设为 95% 为全吸收）
    G4int isHit = 0;
    G4int isFull = 0;

    if (edep > 0.0) {
        isHit = 1;  // 被探测到
        if (ePrim > 0.0 && (edep / ePrim > 0.95)) {
            isFull = 1;  // 全吸收（光电峰）
        } else {
            isFull = 0;  // 部分吸收（康普顿、逃逸等）
        }
    } else {
        isHit = 0;  // 未被探测到
        isFull = 0;
    }

    // 写入 Ntuple（列索引：0=能量，1=是否被探测，2=是否全吸收）
    // 注意：能量单位统一转换为 MeV 存储
    man->FillNtupleDColumn(1, 0, ePrim / MeV);
    man->FillNtupleIColumn(1, 1, isHit);
    man->FillNtupleIColumn(1, 2, isFull);
    man->AddNtupleRow(1);  // 提交到Ntuple 1w
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

}