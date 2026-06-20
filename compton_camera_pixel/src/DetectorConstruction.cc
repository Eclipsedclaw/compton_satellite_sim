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

using namespace B2; 

namespace B2a
{

G4ThreadLocal
G4GlobalMagFieldMessenger* DetectorConstruction::fMagFieldMessenger = nullptr;

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

DetectorConstruction::DetectorConstruction()
{
  fMessenger = new DetectorMessenger(this);

  // 初始化间隙值
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
  
  G4Element* elC  = nistManager->FindOrBuildElement("C");
  G4Element* elH  = nistManager->FindOrBuildElement("H");

  // BaSO4 所需元素
  G4Element* elBa = nistManager->FindOrBuildElement("Ba");
  G4Element* elS  = nistManager->FindOrBuildElement("S");

  // YSO (Y2SiO5)
  G4Material* matYSO = new G4Material("YSO", 4.44*g/cm3, 3);
  matYSO->AddElement(elY, 2);
  matYSO->AddElement(elSi, 1);
  matYSO->AddElement(elO, 5);

  // LYSO (Lu1.8 Y0.2 Si O5)
  G4Material* matLYSO = new G4Material("LYSO", 7.1*g/cm3, 4);
  matLYSO->AddElement(elLu, 18);
  matLYSO->AddElement(elY, 2);
  matLYSO->AddElement(elSi, 10);
  matLYSO->AddElement(elO, 50);

  // FR4 (死区)
  G4Material* matFR4 = new G4Material("FR4", 1.85*g/cm3, 4);
  matFR4->AddElement(elC,  0.43550);
  matFR4->AddElement(elH,  0.03816);
  matFR4->AddElement(elO,  0.29895);
  matFR4->AddElement(elSi, 0.22739);

  // BaSO4 (反射层)
  G4Material* matBaSO4 = new G4Material("BaSO4", 4.5*g/cm3, 3);
  matBaSO4->AddElement(elBa, 1);
  matBaSO4->AddElement(elS,  1);
  matBaSO4->AddElement(elO,  4);

  fChamberMaterial = matYSO;
  fTargetMaterial  = matLYSO;

  G4cout << *(G4Material::GetMaterialTable()) << G4endl;
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

G4VPhysicalVolume* DetectorConstruction::DefineVolumes()
{
  G4Material* air      = G4Material::GetMaterial("G4_AIR");
  G4Material* matSi    = G4Material::GetMaterial("G4_Si");
  G4Material* matFR4   = G4Material::GetMaterial("FR4");
  G4Material* matBaSO4 = G4Material::GetMaterial("BaSO4");

  G4double worldSizeXY = 10.0 * cm;
  G4double worldSizeZ  = 20.0 * cm;
  G4GeometryManager::GetInstance()->SetWorldMaximumExtent(worldSizeZ);

  auto worldS = new G4Box("world", worldSizeXY / 2, worldSizeXY / 2, worldSizeZ / 2);
  auto worldLV = new G4LogicalVolume(worldS, air, "World");
  auto worldPV = new G4PVPlacement(nullptr, G4ThreeVector(), worldLV, "World", nullptr, false, 0, fCheckOverlaps);

  // ================= 阵列参数定义 =================
  G4int nPixels = 14;                                     // 14x14 阵列
  G4double ysoPixelSize = 3.0 * mm;                       // YSO 晶体尺寸 3mm
  G4double reflectorThick = 0.18 * mm;                     // 反射层厚度 0.18mm
  G4double unitPitch = ysoPixelSize + 2 * reflectorThick; // 单个单元节距 = 3.36mm
  
  // 阵列母卷(BaSO4)的一半尺寸: (14 * 3.36mm) / 2 = 23.52mm
  G4double arrayHalfXY = (nPixels * unitPitch) / 2.0; 
  
  // 厚度定义 (HalfZ)
  G4double ysoHalfZ  = 1.5 * mm; 
  G4double lysoHalfZ = 3.0 * mm;
  
  G4double xyHalfSize = 2.352 * cm; // 死区和LYSO的XY尺寸
  G4double siHalfZ  = 0.5 * um;    
  G4double fr4HalfZ = 0.8 * mm;    
  
  // ================= 创建实体与逻辑卷 =================
  
  // 1. 阵列母卷 (包含反射层 BaSO4)
  auto arrayS  = new G4Box("YSO_Array_solid", arrayHalfXY, arrayHalfXY, ysoHalfZ);
  auto arrayLV = new G4LogicalVolume(arrayS, matBaSO4, "YSO_Array_LV");

  // 2. YSO 像素子卷
  auto ysoPixelS  = new G4Box("YSO_Pixel_solid", ysoPixelSize/2.0, ysoPixelSize/2.0, ysoHalfZ);
  // 注意：逻辑卷名称保持 "YSO_LV" 以确保 SD 代码能直接识别
  auto ysoPixelLV = new G4LogicalVolume(ysoPixelS, fChamberMaterial, "YSO_LV"); 

  // 在母卷中循环放置 14x14 个 YSO 像素
  for (G4int ix = 0; ix < nPixels; ++ix) {
      for (G4int iy = 0; iy < nPixels; ++iy) {
          // 计算每个像素在母卷内部的局部坐标
          G4double xPos = (ix - (nPixels - 1) / 2.0) * unitPitch;
          G4double yPos = (iy - (nPixels - 1) / 2.0) * unitPitch;
          
          new G4PVPlacement(nullptr, G4ThreeVector(xPos, yPos, 0), ysoPixelLV, 
                            "YSO_Pixel_PV", arrayLV, false, ix * nPixels + iy, fCheckOverlaps);
      }
  }

  // 3. 其他组件
  auto lysoS = new G4Box("LYSO_solid", xyHalfSize, xyHalfSize, lysoHalfZ);
  auto siS   = new G4Box("Si_solid", xyHalfSize, xyHalfSize, siHalfZ);
  auto fr4S  = new G4Box("FR4_solid", xyHalfSize, xyHalfSize, fr4HalfZ);

  auto lysoLV = new G4LogicalVolume(lysoS, fTargetMaterial, "LYSO_LV");
  auto siLV   = new G4LogicalVolume(siS, matSi, "Si_LV");
  auto fr4LV  = new G4LogicalVolume(fr4S, matFR4, "FR4_LV");

  // ================= 摆放物理卷 (放入 World) =================
  
  // 第一层结构: 阵列1 + Si + FR4
  G4double yso1_Z = -3.0 * cm; 
  G4double si1_Z  = yso1_Z + ysoHalfZ + siHalfZ;
  G4double fr41_Z = si1_Z + siHalfZ + fr4HalfZ;

  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, yso1_Z), arrayLV, "YSO_Array_PV1", worldLV, false, 0, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, si1_Z), siLV, "Si_PV1", worldLV, false, 0, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, fr41_Z), fr4LV, "FR4_PV1", worldLV, false, 0, fCheckOverlaps);

  // 第二层结构: 阵列2 + Si + FR4
  G4double layer1_End = fr41_Z + fr4HalfZ; 
  G4double yso2_Z = layer1_End + fGap1 + ysoHalfZ; 
  G4double si2_Z  = yso2_Z + ysoHalfZ + siHalfZ;
  G4double fr42_Z = si2_Z + siHalfZ + fr4HalfZ;

  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, yso2_Z), arrayLV, "YSO_Array_PV2", worldLV, false, 1, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, si2_Z), siLV, "Si_PV2", worldLV, false, 1, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, fr42_Z), fr4LV, "FR4_PV2", worldLV, false, 1, fCheckOverlaps);

  // 第三层结构: LYSO + Si + FR4
  G4double layer2_End = fr42_Z + fr4HalfZ;
  G4double lyso_Z = layer2_End + fGap2 + lysoHalfZ; 
  G4double si3_Z  = lyso_Z + lysoHalfZ + siHalfZ;
  G4double fr43_Z = si3_Z + siHalfZ + fr4HalfZ;

  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, lyso_Z), lysoLV, "LYSO_PV", worldLV, false, 2, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, si3_Z), siLV, "Si_PV3", worldLV, false, 2, fCheckOverlaps);
  new G4PVPlacement(nullptr, G4ThreeVector(0, 0, fr43_Z), fr4LV, "FR4_PV3", worldLV, false, 2, fCheckOverlaps);

  // ================= 可视化属性设置 =================
  auto boxVisAtt  = new G4VisAttributes(G4Colour(1.0, 1.0, 1.0)); // World - 白色线框
  
  // Array 母卷 (BaSO4) - 设为白色且开启实体显示
  auto arrayVisAtt = new G4VisAttributes(G4Colour(1.0, 1.0, 1.0,0.4)); 
  // arrayVisAtt->SetForceWireframe(true); // 不填充实体，只画出白色边框
  arrayVisAtt->SetForceSolid(true);
  
  // YSO 像素 - 设为亮绿色
  auto ysoVisAtt  = new G4VisAttributes(G4Colour(0.0, 1.0, 0.0));
  ysoVisAtt->SetForceSolid(true);
  
  // 其他材料颜色
  auto lysoVisAtt = new G4VisAttributes(G4Colour(0.0, 0.0, 1.0)); // 蓝色
  auto siVisAtt   = new G4VisAttributes(G4Colour(0.8, 0.8, 0.8)); // 灰色
  auto fr4VisAtt  = new G4VisAttributes(G4Colour(1.0, 0.0, 0.0)); // 红色 (原为深绿，现改红以便区分)
  
  lysoVisAtt->SetForceSolid(true);
  siVisAtt->SetForceSolid(true);
  fr4VisAtt->SetForceSolid(true);

  worldLV->SetVisAttributes(boxVisAtt);
  arrayLV->SetVisAttributes(arrayVisAtt);  // 绑定反射层
  ysoPixelLV->SetVisAttributes(ysoVisAtt); // 绑定YSO像素
  lysoLV->SetVisAttributes(lysoVisAtt);
  siLV->SetVisAttributes(siVisAtt);
  fr4LV->SetVisAttributes(fr4VisAtt);

  // ================= 步长限制 =================
  G4double maxStep = 1.0 * mm;
  fStepLimit = new G4UserLimits(maxStep);
  ysoPixelLV->SetUserLimits(fStepLimit); // 步长限制加在单个像素上
  lysoLV->SetUserLimits(fStepLimit);

  return worldPV;
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void DetectorConstruction::ConstructSDandField()
{
  G4String trackerChamberSDname = "/TrackerChamberSD";
  auto aTrackerSD = new TrackerSD(trackerChamberSDname, "TrackerHitsCollection");
  G4SDManager::GetSDMpointer()->AddNewDetector(aTrackerSD);
  
  // 敏感探测器注册（名称 "YSO_LV" 会自动匹配上文创建的 ysoPixelLV）
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

}