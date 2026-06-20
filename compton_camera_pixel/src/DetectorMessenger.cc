//
// ********************************************************************
// * License and Disclaimer                                           *
// * *
// * The  Geant4 software  is  copyright of the Copyright Holders  of *
// * the Geant4 Collaboration.  It is provided  under  the terms  and *
// * conditions of the Geant4 Software License,  included in the file *
// * LICENSE and available at  http://cern.ch/geant4/license .  These *
// * include a list of copyright holders.                             *
// * *
// * Neither the authors of this software system, nor their employing *
// * institutes,nor the agencies providing financial support for this *
// * work  make  any representation or  warranty, express or implied, *
// * regarding  this  software system or assume any liability for its *
// * use.  Please see the license in the file  LICENSE  and URL above *
// * for the full disclaimer and the limitation of liability.         *
// * *
// * This  code  implementation is the result of  the  scientific and *
// * technical work of the GEANT4 collaboration.                      *
// * By using,  copying,  modifying or  distributing the software (or *
// * any work based  on the software)  you  agree  to acknowledge its *
// * use  in  resulting  scientific  publications,  and indicate your *
// * acceptance of all terms of the Geant4 Software license.          *
// ********************************************************************
//
/// \file B2/B2a/src/DetectorMessenger.cc
/// \brief Implementation of the B2a::DetectorMessenger class

#include "DetectorMessenger.hh"
#include "DetectorConstruction.hh"

#include "G4UIdirectory.hh"
#include "G4UIcmdWithAString.hh"
#include "G4UIcmdWithADoubleAndUnit.hh"

namespace B2a
{

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

DetectorMessenger::DetectorMessenger(DetectorConstruction* Det)
 : fDetectorConstruction(Det)
{
  fB2Directory = new G4UIdirectory("/B2/");
  fB2Directory->SetGuidance("UI commands specific to this example.");

  fDetDirectory = new G4UIdirectory("/B2/detector/");
  fDetDirectory->SetGuidance("Detector construction control");

  fTargMatCmd = new G4UIcmdWithAString("/B2/detector/setTargetMaterial",this);
  fTargMatCmd->SetGuidance("Select Material of the Target.");
  fTargMatCmd->SetParameterName("choice",false);
  fTargMatCmd->AvailableForStates(G4State_PreInit,G4State_Idle);

  fChamMatCmd = new G4UIcmdWithAString("/B2/detector/setChamberMaterial",this);
  fChamMatCmd->SetGuidance("Select Material of the Chamber.");
  fChamMatCmd->SetParameterName("choice",false);
  fChamMatCmd->AvailableForStates(G4State_PreInit,G4State_Idle);

  fStepMaxCmd = new G4UIcmdWithADoubleAndUnit("/B2/detector/stepMax",this);
  fStepMaxCmd->SetGuidance("Define a step max");
  fStepMaxCmd->SetParameterName("stepMax",false);
  fStepMaxCmd->SetUnitCategory("Length");
  fStepMaxCmd->AvailableForStates(G4State_Idle);

  // 定义 fGap1Cmd
  fGap1Cmd = new G4UIcmdWithADoubleAndUnit("/B2/detector/setGap1", this);
  fGap1Cmd->SetGuidance("Set the gap distance between YSO1 and YSO2.");
  fGap1Cmd->SetParameterName("Gap1", false);
  fGap1Cmd->SetDefaultUnit("mm");
  fGap1Cmd->SetUnitCategory("Length");
  fGap1Cmd->AvailableForStates(G4State_PreInit, G4State_Idle);

  // 定义 fGap2Cmd
  fGap2Cmd = new G4UIcmdWithADoubleAndUnit("/B2/detector/setGap2", this);
  fGap2Cmd->SetGuidance("Set the gap distance between YSO2 and LYSO.");
  fGap2Cmd->SetParameterName("Gap2", false);
  fGap2Cmd->SetDefaultUnit("mm");
  fGap2Cmd->SetUnitCategory("Length");
  fGap2Cmd->AvailableForStates(G4State_PreInit, G4State_Idle);
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

DetectorMessenger::~DetectorMessenger()
{
  delete fTargMatCmd;
  delete fChamMatCmd;
  delete fStepMaxCmd;
  delete fGap1Cmd;
  delete fGap2Cmd;
  delete fB2Directory;
  delete fDetDirectory;
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

void DetectorMessenger::SetNewValue(G4UIcommand* command, G4String newValue)
{
  if( command == fTargMatCmd )
   { fDetectorConstruction->SetTargetMaterial(newValue);}

  if( command == fChamMatCmd )
   { fDetectorConstruction->SetChamberMaterial(newValue);}

  if( command == fStepMaxCmd ) {
    fDetectorConstruction
      ->SetMaxStep(fStepMaxCmd->GetNewDoubleValue(newValue));
  }

  // 路由间距命令
  if (command == fGap1Cmd) {
    fDetectorConstruction->SetGap1(fGap1Cmd->GetNewDoubleValue(newValue));
  }
  
  if (command == fGap2Cmd) {
    fDetectorConstruction->SetGap2(fGap2Cmd->GetNewDoubleValue(newValue));
  }
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

}