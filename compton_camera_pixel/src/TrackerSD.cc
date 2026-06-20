//
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
//
/// \file B2/B2a/src/TrackerSD.cc
/// \brief Implementation of the B2::TrackerSD class

#include "TrackerSD.hh"
#include "G4HCofThisEvent.hh"
#include "G4Step.hh"
#include "G4Event.hh"
#include "G4ThreeVector.hh"
#include "G4SDManager.hh"
#include "G4ios.hh"
#include "Analysis.hh"
#include "G4AutoLock.hh"
#include "G4AnalysisManager.hh"
#include "G4EventManager.hh"  // 🔹 新增：G4EventManager 的头文件
#include "G4Event.hh"         // 🔹 新增：G4Event 的头文件（用于 GetEventID()）
#include "G4Track.hh"
#include "G4TrackingManager.hh"
namespace B2
{
  G4Mutex analysisMutex = G4MUTEX_INITIALIZER;
//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

TrackerSD::TrackerSD(const G4String& name,
                     const G4String& hitsCollectionName)
 : G4VSensitiveDetector(name)
{
  collectionName.insert(hitsCollectionName);
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void TrackerSD::Initialize(G4HCofThisEvent* hce)
{
  // Create hits collection

  fHitsCollection
    = new TrackerHitsCollection(SensitiveDetectorName, collectionName[0]);

  // Add this collection in hce

  G4int hcID
    = G4SDManager::GetSDMpointer()->GetCollectionID(collectionName[0]);
  hce->AddHitsCollection( hcID, fHitsCollection );
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

// G4bool TrackerSD::ProcessHits(G4Step* aStep, G4TouchableHistory*)
// {
//   G4double edep = aStep->GetTotalEnergyDeposit();
//   if (edep == 0.) return false;

//   TrackerHit* newHit = new TrackerHit();
//   G4Track* track = aStep->GetTrack();
//   const G4StepPoint* preStepPoint = aStep->GetPreStepPoint();
//   const G4StepPoint* postStepPoint = aStep->GetPostStepPoint();

//   newHit->SetEventID(G4EventManager::GetEventManager()->GetConstCurrentEvent()->GetEventID());
//   newHit->SetTrackID(track->GetTrackID());
//   newHit->SetStepID(track->GetCurrentStepNumber());
//   newHit->SetParentID(track->GetParentID());
//   newHit->SetChamberNb(preStepPoint->GetTouchableHandle()->GetCopyNumber());
//   newHit->SetPos(postStepPoint->GetPosition());
//   newHit->SetMomentum(preStepPoint->GetMomentum());
//   newHit->SetAngle(preStepPoint->GetMomentumDirection().theta());
//   newHit->SetEdep(edep);
//   newHit->SetKineticEnergy(preStepPoint->GetKineticEnergy());
//   newHit->SetParticleName(track->GetParticleDefinition()->GetParticleName());
//   newHit->SetCreatorProcess(track->GetCreatorProcess() ? track->GetCreatorProcess()->GetProcessName() : "primary");
//   newHit->SetTime(track->GetGlobalTime());
//   newHit->SetWeight(track->GetWeight());
//   newHit->SetStepLength(aStep->GetStepLength());
//   newHit->SetProcess(postStepPoint->GetProcessDefinedStep() ? postStepPoint->GetProcessDefinedStep()->GetProcessName() : "none");

//   fHitsCollection->insert(newHit);
//   return true;
// }

G4bool TrackerSD::ProcessHits(G4Step* aStep, G4TouchableHistory*)
{
  G4Track* track = aStep->GetTrack();
  const G4StepPoint* preStepPoint = aStep->GetPreStepPoint();
  const G4StepPoint* postStepPoint = aStep->GetPostStepPoint();
  G4String particleName = track->GetParticleDefinition()->GetParticleName();
  G4String processname  = postStepPoint->GetProcessDefinedStep() ? postStepPoint->GetProcessDefinedStep()->GetProcessName() : "none";
  G4String creatorprocess = track->GetCreatorProcess() ? track->GetCreatorProcess()->GetProcessName() : "primary";
  G4double edep = aStep->GetTotalEnergyDeposit();
   
  G4ThreeVector preDir = preStepPoint->GetMomentumDirection();
  G4ThreeVector postDir = postStepPoint->GetMomentumDirection();


    G4double cosTheta = preDir.dot(postDir);
    
    // 关键：夹紧到有效范围
    if (cosTheta > 1.0) cosTheta = 1.0;
    else if (cosTheta < -1.0) cosTheta = -1.0;
    
    G4double theta = std::acos(cosTheta);


  G4int parentID = track->GetParentID();
   
  if (processname == "Transportation") return false;
    // if (!(creatorprocess == "compt")) return false;
  // // // 只过滤掉那些既不是gamma又没有能量沉积的粒子
  // if (!(processname == "compt" && particleName == "gamma" )) return false;
  // if (!(processname == "msc" && particleName == "e-")) return false;


  TrackerHit* newHit = new TrackerHit();
  
  newHit->SetEventID(G4EventManager::GetEventManager()->GetConstCurrentEvent()->GetEventID());
  newHit->SetTrackID(track->GetTrackID());
  newHit->SetStepID(track->GetCurrentStepNumber());
  newHit->SetParentID(track->GetParentID());

  // ================= 核心修改区域：加入体积判断 =================
  G4TouchableHandle touchable = preStepPoint->GetTouchableHandle();
  
  // 推荐通过逻辑卷的名字来判断，这是最稳妥的
  G4String logicVolumeName = touchable->GetVolume()->GetLogicalVolume()->GetName();

  if (logicVolumeName == "YSO_LV") {
      // 打中 YSO 阵列：Depth 0 是像素编号(0~195)，Depth 1 是母卷编号(0或1)
      newHit->SetPixelID(touchable->GetCopyNumber(0));
      newHit->SetChamberNb(touchable->GetCopyNumber(1));
  } 
  else if (logicVolumeName == "LYSO_LV") {
      // 打中 LYSO 单晶：Depth 0 是LYSO自身的编号(2)，没有 Depth 1
      newHit->SetPixelID(0); // 单晶没有像素阵列，强行设为0
      newHit->SetChamberNb(touchable->GetCopyNumber(0));
  } 
  else {
      // 防御性编程：万一打到了其他鬼东西，给个异常值方便排错
      newHit->SetPixelID(-1);
      newHit->SetChamberNb(-1);
  }
  // ==========================================================
  // newHit->SetChamberNb(preStepPoint->GetTouchableHandle()->GetCopyNumber(1));
  // newHit->SetPixelID(preStepPoint->GetTouchableHandle()->GetCopyNumber(0)); // 🔹 新增：设置阵列编号（假设它存储在第0层复制号中）
  newHit->SetPos(preStepPoint->GetPosition());
  
  newHit->SetMomentum(preStepPoint->GetMomentum());
  newHit->SetAngle(theta);
  newHit->SetEdep(edep);
  newHit->SetKineticEnergy(postStepPoint->GetKineticEnergy());
  newHit->SetParticleName(particleName);
  newHit->SetCreatorProcess(track->GetCreatorProcess() ? track->GetCreatorProcess()->GetProcessName() : "primary");
  newHit->SetTime(track->GetGlobalTime());
  newHit->SetWeight(track->GetWeight());
  newHit->SetStepLength(aStep->GetStepLength());
  newHit->SetProcess(preStepPoint->GetProcessDefinedStep() ? preStepPoint->GetProcessDefinedStep()->GetProcessName() : "none");
  newHit->SetpostPos(postStepPoint->GetPosition());
  newHit->SetpostProcess(postStepPoint->GetProcessDefinedStep() ? postStepPoint->GetProcessDefinedStep()->GetProcessName() : "none");
  fHitsCollection->insert(newHit);
  return true;
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void TrackerSD::EndOfEvent(G4HCofThisEvent*)
{
  if ( verboseLevel>1 ) {
     G4int nofHits = fHitsCollection->entries();
     G4cout << G4endl
            << "-------->Hits Collection: in this event they are " << nofHits
            << " hits in the tracker chambers: " << G4endl;
     for ( G4int i=0; i<nofHits; i++ ) (*fHitsCollection)[i]->Print();
  }
  //  // 批量分析 hits
  G4int nofHits = fHitsCollection->entries();
  // G4cout << "Processing " << nofHits << " hits in EndOfEvent." << G4endl;
  
  Analysis::getInstance()->FillNtuple(fHitsCollection);
  
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

}

