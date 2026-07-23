// ********************************************************************
// ... (license header unchanged)
// ********************************************************************

#include <limits>
#include <vector>
#include <memory>

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

DetectorConstruction::DetectorConstruction()
{
  fMessenger = new DetectorMessenger(this);
  fGap1 = 2.0 * cm;
  fGap2 = 3.0 * cm;
}

DetectorConstruction::~DetectorConstruction()
{
  delete fStepLimit;
  delete fMessenger;
}

G4VPhysicalVolume* DetectorConstruction::Construct()
{
  DefineMaterials();
  return DefineVolumes();
}

void DetectorConstruction::DefineMaterials()
{
  G4NistManager* nistManager = G4NistManager::Instance();
  nistManager->FindOrBuildMaterial("G4_AIR");
  nistManager->FindOrBuildMaterial("G4_Si");

  G4Element* elC  = nistManager->FindOrBuildElement("C");
  G4Element* elH  = nistManager->FindOrBuildElement("H");
  G4Element* elO  = nistManager->FindOrBuildElement("O");
  G4Element* elSi = nistManager->FindOrBuildElement("Si");

  // FR4 材料已删除，不再使用

  G4Element* elCd = nistManager->FindOrBuildElement("Cd");
  G4Element* elZn = nistManager->FindOrBuildElement("Zn");
  G4Element* elTe = nistManager->FindOrBuildElement("Te");

  G4Material* matCZT = new G4Material("CZT", 5.78*g/cm3, 3);
  matCZT->AddElement(elCd, 9);
  matCZT->AddElement(elZn, 1);
  matCZT->AddElement(elTe, 10);

  fChamberMaterial = G4Material::GetMaterial("G4_Si");
  fTargetMaterial  = matCZT;

  G4cout << *(G4Material::GetMaterialTable()) << G4endl;
}

// ── 辅助函数：创建带填充色 + 黑色边框的 VisAttributes ──────────────────
static G4VisAttributes* MakeVisAtt(G4Colour fillColour, G4double lineWidth = 2.0)
{
  auto* att = new G4VisAttributes(fillColour);
  att->SetForceSolid(true);           
  att->SetForceAuxEdgeVisible(true);  
  att->SetLineWidth(lineWidth);       
  return att;
}

G4VPhysicalVolume* DetectorConstruction::DefineVolumes()
{
  G4Material* air    = G4Material::GetMaterial("G4_AIR");
  G4Material* matSi  = G4Material::GetMaterial("G4_Si");
  G4Material* matCZT = G4Material::GetMaterial("CZT");

  // ── 世界体积 ────────────────────────────────────────────────────────────
  G4double worldSizeXY = 10.0 * m;
  G4double worldSizeZ  = 30.0 * m;
  G4GeometryManager::GetInstance()->SetWorldMaximumExtent(worldSizeZ);

  auto worldS  = new G4Box("world", worldSizeXY/2, worldSizeXY/2, worldSizeZ/2);
  auto worldLV = new G4LogicalVolume(worldS, air, "World");
  auto worldPV = new G4PVPlacement(nullptr, G4ThreeVector(),
                                   worldLV, "World", nullptr,
                                   false, 0, fCheckOverlaps);

  // ── 几何参数 ─────────────────────────────────────────────────────────────
  G4double stripWidth  = 3.0  * mm;
  G4double stripLength = 100.0* mm;
  G4double stripThick  = 300  * um;   // 改为 300 µm
  G4int    nStrips     = 33;

  G4double deadAreaXY  = 100.0 * mm;
  G4double siHalfZ     = 0.5   * um;   // 薄Si死区（1 µm）

  G4int    nCztPixels  = 4;
  G4double cztWidth    = 100.0 * mm / nCztPixels; // 25 mm
  G4double cztThick    = 1.0   * cm;   // 改为 1 cm

  // ── 条带 & 死区 & CZT 的实体/逻辑卷（共享，每层重复使用） ─────────────
  auto x_stripS  = new G4Box("x_strip_solid",  stripWidth/2, stripLength/2, stripThick/2);
  auto y_stripS  = new G4Box("y_strip_solid",  stripLength/2, stripWidth/2,  stripThick/2);
  auto deadSiS   = new G4Box("DeadSi_solid",   deadAreaXY/2, deadAreaXY/2,  siHalfZ);
  auto cztPixelS = new G4Box("CZT_Pixel_solid",cztWidth/2,   cztWidth/2,    cztThick/2);

  auto x_stripLV  = new G4LogicalVolume(x_stripS,  matSi,  "x_strip_LV");
  auto y_stripLV  = new G4LogicalVolume(y_stripS,  matSi,  "y_strip_LV");
  auto deadSiLV   = new G4LogicalVolume(deadSiS,   matSi,  "DeadSi_LV");
  auto cztPixelLV = new G4LogicalVolume(cztPixelS, matCZT, "CZT_LV");

  // ── 每层 Envelope（使每层成为一个整体逻辑单元） ─────────────────────────
  // 删除 FR4 后，每层只包含：X条(0.3mm) + Y条(0.3mm) + 薄Si(1µm)
  // 总厚度约 0.6 mm，取 Envelope 半高度 2 mm 留有余量
  G4double envHalfZ   = 2.0 * mm;
  G4double envHalfXY  = 55.0 * mm;

  auto layerEnvS = new G4Box("LayerEnv_solid", envHalfXY, envHalfXY, envHalfZ);

  // ── Z 起点 ───────────────────────────────────────────────────────────────
  G4double totalLength = 4 * fGap1 + fGap2;
  G4double zStart      = -totalLength / 2.0;

  // ── 逐层摆放（5 层硅微条探测器） ─────────────────────────────────────────
  for (G4int i = 0; i < 5; ++i)
  {
    G4double layerZ = zStart + i * fGap1;

    G4String envName = "Layer" + std::to_string(i) + "_LV";
    auto layerLV = new G4LogicalVolume(layerEnvS, air, envName);

    new G4PVPlacement(nullptr,
                      G4ThreeVector(0, 0, layerZ),
                      layerLV,
                      "Layer" + std::to_string(i) + "_PV",
                      worldLV, false, i, fCheckOverlaps);

    // 子卷的 Z 坐标均相对于 Envelope 中心
    G4double xLayerZ_local = -stripThick / 2.0;   // X条中心
    G4double yLayerZ_local = +stripThick / 2.0;   // Y条中心
    G4double thinSiZ_local = yLayerZ_local + stripThick/2.0 + siHalfZ;

    // 33 条 X 条
    for (G4int j = 0; j < nStrips; ++j) {
      G4double xPos = (j - (nStrips - 1) / 2.0) * stripWidth;
      new G4PVPlacement(nullptr,
                        G4ThreeVector(xPos, 0, xLayerZ_local),
                        x_stripLV, "x_strip_PV",
                        layerLV, false,
                        i * nStrips + j, fCheckOverlaps);
    }

    // 33 条 Y 条
    for (G4int j = 0; j < nStrips; ++j) {
      G4double yPos = (j - (nStrips - 1) / 2.0) * stripWidth;
      new G4PVPlacement(nullptr,
                        G4ThreeVector(0, yPos, yLayerZ_local),
                        y_stripLV, "y_strip_PV",
                        layerLV, false,
                        i * nStrips + j, fCheckOverlaps);
    }

    // 死区薄 Si（1 µm 厚），紧贴 Y 条后方（正 Z 方向）
    new G4PVPlacement(nullptr,
                      G4ThreeVector(0, 0, thinSiZ_local),
                      deadSiLV, "DeadSi_PV",
                      layerLV, false, i, fCheckOverlaps);

    // Envelope 本身设为不可见（透明容器）
    auto envVisAtt = new G4VisAttributes(false);
    layerLV->SetVisAttributes(envVisAtt);
  }

  // ── CZT 层（4×4 阵列，同样放入一个 Envelope） ────────────────────────────
  G4double cztLayerZ = zStart + 4 * fGap1 + fGap2;

  G4double cztEnvHalfXY = 55.0 * mm;
  G4double cztEnvHalfZ  = cztThick / 2.0 + 1.0 * mm; // 留 1mm 余量
  auto cztEnvS  = new G4Box("CZTEnv_solid", cztEnvHalfXY, cztEnvHalfXY, cztEnvHalfZ);
  auto cztEnvLV = new G4LogicalVolume(cztEnvS, air, "CZTLayer_LV");

  new G4PVPlacement(nullptr,
                    G4ThreeVector(0, 0, cztLayerZ),
                    cztEnvLV, "CZTLayer_PV",
                    worldLV, false, 0, fCheckOverlaps);

  for (G4int ix = 0; ix < nCztPixels; ++ix) {
    for (G4int iy = 0; iy < nCztPixels; ++iy) {
      G4double xPos = (ix - (nCztPixels - 1) / 2.0) * cztWidth;
      G4double yPos = (iy - (nCztPixels - 1) / 2.0) * cztWidth;
      new G4PVPlacement(nullptr,
                        G4ThreeVector(xPos, yPos, 0),
                        cztPixelLV, "CZT_Pixel_PV",
                        cztEnvLV, false,
                        ix * nCztPixels + iy, fCheckOverlaps);
    }
  }
  auto cztEnvVisAtt = new G4VisAttributes(false);
  cztEnvLV->SetVisAttributes(cztEnvVisAtt);

  // ── 大气层（放置在探测器前方，模拟束流在空气中的传输） ──────────────────
  // 使用已经定义的 air 材料（G4_AIR），不再重复声明
  G4double atmosL = 10  * m;   // 横向尺寸，与探测器 Envelope 一致
  G4double atmosZ = 10  * m;     // 厚度（沿束流方向），可改为外部参数

  if (atmosZ > 0.0)
  {
      G4Box* solidAtmos = new G4Box("AtmosSolid",
                                    atmosL * 0.5,
                                    atmosL * 0.5,
                                    atmosZ * 0.5);

      G4LogicalVolume* logicAtmos = new G4LogicalVolume(solidAtmos,
                                                        air,  // 直接使用已有的 air
                                                        "AtmosLogical",
                                                        0, 0, 0);

      // 大气层放置在探测器上游：下表面（-Z 端）与探测器起始面 zStart 平齐
      G4double atmosPosZ = zStart - 0.5 * atmosZ;

      new G4PVPlacement(nullptr,
                        G4ThreeVector(0.0, 0.0, atmosPosZ),
                        logicAtmos,
                        "Atmosphere",
                        worldLV,          // 母体是世界
                        false,
                        0,
                        fCheckOverlaps);

      // 可视化：半透明浅蓝色，便于观察
      G4VisAttributes* atmosVis = new G4VisAttributes(G4Colour(0.8, 0.8, 0.8, 0.1));
      atmosVis->SetForceSolid(true);
      logicAtmos->SetVisAttributes(atmosVis);
  }

  // ── 可视化属性（填充色 + 黑色框线） ─────────────────────────────────────
  worldLV->SetVisAttributes(new G4VisAttributes(false));

  x_stripLV->SetVisAttributes(MakeVisAtt(G4Colour(0.0, 1.0, 1.0, 0.3)));   // 青色
  y_stripLV->SetVisAttributes(MakeVisAtt(G4Colour(0.0, 0.8, 0.2, 0.3)));   // 绿色
  deadSiLV->SetVisAttributes(MakeVisAtt(G4Colour(0.5, 0.5, 0.5, 0.5)));    // 灰色
  cztPixelLV->SetVisAttributes(MakeVisAtt(G4Colour(1.0, 0.8, 0.1, 0.3)));  // 金黄色

  // ── 步长限制 ─────────────────────────────────────────────────────────────
  G4double maxStep = 1.0 * mm;
  fStepLimit = new G4UserLimits(maxStep);
  x_stripLV->SetUserLimits(fStepLimit);
  y_stripLV->SetUserLimits(fStepLimit);
  cztPixelLV->SetUserLimits(fStepLimit);

  return worldPV;
}

void DetectorConstruction::ConstructSDandField()
{
  G4String trackerChamberSDname = "/TrackerChamberSD";
  auto aTrackerSD = new TrackerSD(trackerChamberSDname, "TrackerHitsCollection");
  G4SDManager::GetSDMpointer()->AddNewDetector(aTrackerSD);

  SetSensitiveDetector("x_strip_LV", aTrackerSD, true);
  SetSensitiveDetector("y_strip_LV", aTrackerSD, true);
  SetSensitiveDetector("CZT_LV",     aTrackerSD, true);

  G4ThreeVector fieldValue = G4ThreeVector();
  fMagFieldMessenger = new G4GlobalMagFieldMessenger(fieldValue);
  fMagFieldMessenger->SetVerboseLevel(1);
  G4AutoDelete::Register(fMagFieldMessenger);
}

void DetectorConstruction::SetTargetMaterial(G4String) {
  G4cout << "Warning: Target geometry is replaced by CZT. Command ignored." << G4endl;
}
void DetectorConstruction::SetChamberMaterial(G4String) {
  G4cout << "Warning: Chamber geometry is replaced by Si_strips. Command ignored." << G4endl;
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