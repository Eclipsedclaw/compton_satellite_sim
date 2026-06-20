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
/// \file B2/B2a/src/DetectorConstruction.cc
/// \brief Implementation of the B2a::DetectorConstruction class

#include "DetectorConstruction.hh"
#include "DetectorMessenger.hh"
#include "TrackerSD.hh"

#include "G4Material.hh"
#include "G4NistManager.hh"
#include "G4SDManager.hh"

#include "G4Box.hh"
#include "G4LogicalVolume.hh"
#include "G4PVPlacement.hh"
#include "G4GlobalMagFieldMessenger.hh"
#include "G4AutoDelete.hh"

#include "G4GeometryTolerance.hh"
#include "G4GeometryManager.hh"
#include "G4UserLimits.hh"

#include "G4VisAttributes.hh"
#include "G4Colour.hh"

#include "G4SystemOfUnits.hh"
#include "G4Element.hh"
#include "G4RunManager.hh"

// 加入 B2 命名空间，修复 TrackerSD 报错
using namespace B2; 

namespace B2a
{

G4ThreadLocal
G4GlobalMagFieldMessenger* DetectorConstruction::fMagFieldMessenger = nullptr;

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

DetectorConstruction::DetectorConstruction()
{
  fMessenger = new DetectorMessenger(this);

  // 初始化间隙值 (现定义为"层与层的中心距 Pitch")
  fGap1 = 25 * mm;
  fGap2 = 35 * mm;
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

DetectorConstruction::~DetectorConstruction()
{
  delete fStepLimit;
  delete fMessenger;
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

G4VPhysicalVolume* DetectorConstruction::Construct()
{
  DefineMaterials();
  return DefineVolumes();
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void DetectorConstruction::DefineMaterials()
{
  G4NistManager* nistManager = G4NistManager::Instance();

  nistManager->FindOrBuildMaterial("G4_AIR");
  nistManager->FindOrBuildMaterial("G4_Si");

  G4Element* elY  = nistManager->FindOrBuildElement("Y");
  G4Element* elSi = nistManager->FindOrBuildElement("Si");
  G4Element* elO  = nistManager->FindOrBuildElement("O");
  G4Element* elLu = nistManager->FindOrBuildElement("Lu");
  
  // 新增 FR4 所需的碳和氢元素
  G4Element* elC  = nistManager->FindOrBuildElement("C");
  G4Element* elH  = nistManager->FindOrBuildElement("H");

  // YSO (Y2SiO5), 密度 ~4.44 g/cm3
  G4Material* matYSO = new G4Material("YSO", 4.44*g/cm3, 3);
  matYSO->AddElement(elY, 2);
  matYSO->AddElement(elSi, 1);
  matYSO->AddElement(elO, 5);

  // LYSO (Lu1.8 Y0.2 Si O5), 密度 ~7.10 g/cm3
  G4Material* matLYSO = new G4Material("LYSO", 7.1*g/cm3, 4);
  matLYSO->AddElement(elLu, 18);
  matLYSO->AddElement(elY, 2);
  matLYSO->AddElement(elSi, 10);
  matLYSO->AddElement(elO, 50);

  // 定义 FR4 死区材料 (密度 ~1.85 g/cm3)
  G4Material* matFR4 = new G4Material("FR4", 1.85*g/cm3, 4);
  matFR4->AddElement(elC,  0.43550);
  matFR4->AddElement(elH,  0.03816);
  matFR4->AddElement(elO,  0.29895);
  matFR4->AddElement(elSi, 0.22739);

  fChamberMaterial = matYSO;
  fTargetMaterial  = matLYSO;

  G4cout << *(G4Material::GetMaterialTable()) << G4endl;
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

G4VPhysicalVolume* DetectorConstruction::DefineVolumes()
{
  G4Material* air   = G4Material::GetMaterial("G4_AIR");
  G4Material* matSi = G4Material::GetMaterial("G4_Si");
  G4Material* matFR4= G4Material::GetMaterial("FR4");

  G4double worldSizeXY = 10.0 * cm;
  G4double worldSizeZ  = 20.0 * cm;
  G4GeometryManager::GetInstance()->SetWorldMaximumExtent(worldSizeZ);

  auto worldS = new G4Box("world", worldSizeXY / 2, worldSizeXY / 2, worldSizeZ / 2);
  auto worldLV = new G4LogicalVolume(worldS, air, "World");
  auto worldPV = new G4PVPlacement(nullptr, G4ThreeVector(), worldLV, "World", nullptr, false, 0, fCheckOverlaps);

  // 几何尺寸定义
  G4double xyHalfSize = 2.25 * cm;
  G4double ysoHalfZ   = 1.5 * mm;
  G4double lysoHalfZ  = 3.0 * mm;
  
  // 死区厚度定义 (HalfZ)
  G4double siHalfZ  = 0.5 * um;    // 1 um 的一半
  G4double fr4HalfZ = 0.8 * mm;    // 1.6 mm 的一半

  auto ysoS  = new G4Box("YSO_solid", xyHalfSize, xyHalfSize, ysoHalfZ);
  auto lysoS = new G4Box("LYSO_solid", xyHalfSize, xyHalfSize, lysoHalfZ);
  auto siS   = new G4Box("Si_solid", xyHalfSize, xyHalfSize, siHalfZ);
  auto fr4S  = new G4Box("FR4_solid", xyHalfSize, xyHalfSize, fr4HalfZ);

  auto ysoLV  = new G4LogicalVolume(ysoS, fChamberMaterial, "YSO_LV");
  auto lysoLV = new G4LogicalVolume(lysoS, fTargetMaterial, "LYSO_LV");
  auto siLV   = new G4LogicalVolume(siS, matSi, "Si_LV");
  auto fr4LV  = new G4LogicalVolume(fr4S, matFR4, "FR4_LV");

  // ================= 第一层结构: YSO1 + Si + FR4 =================
  G4double yso1_Z = -3.0 * cm; 
  // 硅层和FR4层紧贴在前一层的背面
  G4double si1_Z  = yso1_Z + ysoHalfZ + siHalfZ;
  G4double fr41_Z = si1_Z + siHalfZ + fr4HalfZ;

  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, yso1_Z), ysoLV, "YSO_PV1", worldLV, false, 0, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, si1_Z), siLV, "Si_PV1", worldLV, false, 0, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, fr41_Z), fr4LV, "FR4_PV1", worldLV, false, 0, fCheckOverlaps);


  // ================= 第二层结构: YSO2 + Si + FR4 =================
  // 【核心修改】中心距算法：第二层晶体中心 = 第一层晶体中心 + Gap1
  G4double yso2_Z = yso1_Z + fGap1; 
  // 死区继续紧贴本层的 YSO 晶体背面
  G4double si2_Z  = yso2_Z + ysoHalfZ + siHalfZ;
  G4double fr42_Z = si2_Z + siHalfZ + fr4HalfZ;

  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, yso2_Z), ysoLV, "YSO_PV2", worldLV, false, 1, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, si2_Z), siLV, "Si_PV2", worldLV, false, 1, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, fr42_Z), fr4LV, "FR4_PV2", worldLV, false, 1, fCheckOverlaps);


  // ================= 第三层结构: LYSO + Si + FR4 =================
  // 【核心修改】中心距算法：第三层晶体中心 = 第二层晶体中心 + Gap2
  G4double lyso_Z = yso2_Z + fGap2; 
  // 死区紧贴本层的 LYSO 晶体背面（注意这里使用的是 lysoHalfZ）
  G4double si3_Z  = lyso_Z + lysoHalfZ + siHalfZ;
  G4double fr43_Z = si3_Z + siHalfZ + fr4HalfZ;

  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, lyso_Z), lysoLV, "LYSO_PV", worldLV, false, 2, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, si3_Z), siLV, "Si_PV3", worldLV, false, 2, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, fr43_Z), fr4LV, "FR4_PV3", worldLV, false, 2, fCheckOverlaps);

  // ================= 可视化属性设置 =================
  auto boxVisAtt  = new G4VisAttributes(G4Colour(1.0, 1.0, 1.0));
  auto ysoVisAtt  = new G4VisAttributes(G4Colour(0.0, 1.0, 0.0));
  auto lysoVisAtt = new G4VisAttributes(G4Colour(0.0, 0.0, 1.0));
  
  // 死区颜色设置 (灰色表示 Si，深红色表示 FR4)
  auto siVisAtt   = new G4VisAttributes(G4Colour(0.8, 0.8, 0.8)); 
  auto fr4VisAtt  = new G4VisAttributes(G4Colour(1.0, 0.0, 0.0)); 
  
  ysoVisAtt->SetForceSolid(true);
  lysoVisAtt->SetForceSolid(true);
  siVisAtt->SetForceSolid(true);
  fr4VisAtt->SetForceSolid(true);

  worldLV->SetVisAttributes(boxVisAtt);
  ysoLV->SetVisAttributes(ysoVisAtt);
  lysoLV->SetVisAttributes(lysoVisAtt);
  siLV->SetVisAttributes(siVisAtt);
  fr4LV->SetVisAttributes(fr4VisAtt);

  // 步长限制 (只加在敏感探测区域)
  G4double maxStep = 1.0 * mm;
  fStepLimit = new G4UserLimits(maxStep);
  ysoLV->SetUserLimits(fStepLimit);
  lysoLV->SetUserLimits(fStepLimit);

  return worldPV;
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void DetectorConstruction::ConstructSDandField()
{
  G4String trackerChamberSDname = "/TrackerChamberSD";
  auto aTrackerSD = new TrackerSD(trackerChamberSDname, "TrackerHitsCollection");
  G4SDManager::GetSDMpointer()->AddNewDetector(aTrackerSD);
  
  // 仅将 YSO 和 LYSO 注册为敏感探测器，死区 (Si, FR4) 不产生 Hits
  SetSensitiveDetector("YSO_LV", aTrackerSD, true);
  SetSensitiveDetector("LYSO_LV", aTrackerSD, true);

  G4ThreeVector fieldValue = G4ThreeVector();
  fMagFieldMessenger = new G4GlobalMagFieldMessenger(fieldValue);
  fMagFieldMessenger->SetVerboseLevel(1);
  G4AutoDelete::Register(fMagFieldMessenger);
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void DetectorConstruction::SetTargetMaterial(G4String) {
  G4cout << "Warning: Target geometry is replaced by LYSO. Command ignored." << G4endl;
}

void DetectorConstruction::SetChamberMaterial(G4String) {
  G4cout << "Warning: Chamber geometry is replaced by YSO. Command ignored." << G4endl;
}

void DetectorConstruction::SetMaxStep(G4double maxStep) {
  if ((fStepLimit)&&(maxStep>0.)) fStepLimit->SetMaxAllowedStep(maxStep);
}

void DetectorConstruction::SetCheckOverlaps(G4bool checkOverlaps) {
  fCheckOverlaps = checkOverlaps;
}

void DetectorConstruction::SetGap1(G4double val) {
  fGap1 = val;
  G4RunManager::GetRunManager()->GeometryHasBeenModified();
}

void DetectorConstruction::SetGap2(G4double val) {
  fGap2 = val;
  G4RunManager::GetRunManager()->GeometryHasBeenModified();
}

} // namespace B2a