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
/// \file B2/B2a/include/TrackerHit.hh
/// \brief Definition of the B2::TrackerHit class

#ifndef B2TrackerHit_h
#define B2TrackerHit_h 1

#include "G4VHit.hh"
#include "G4THitsCollection.hh"
#include "G4Allocator.hh"
#include "G4ThreeVector.hh"
#include "tls.hh"



/// Tracker hit class
///
/// It defines data members to store the trackID, chamberNb, energy deposit,
/// and position of charged particles in a selected volume:
/// - fTrackID, fChamberNB, fEdep, fPos
namespace B2{
class TrackerHit : public G4VHit
{
  public:
    TrackerHit() = default;
    TrackerHit(const TrackerHit&) = default;
    ~TrackerHit() override = default;

    // operators
    TrackerHit& operator=(const TrackerHit&) = default;
    G4bool operator==(const TrackerHit&) const;

    inline void* operator new(size_t);
    inline void  operator delete(void*);

    // methods from base class
    void Draw() override;
    void Print() override;

    // Set methods
    void SetTrackID  (G4int track)      { fTrackID = track; };
    void SetChamberNb(G4int chamb)      { fChamberNb = chamb; };
    void SetEdep     (G4double de)      { fEdep = de; };
    void SetPos      (G4ThreeVector xyz){ fPos = xyz; };
    void SetAngle    (G4double a)       { fAngle = a; };
    void SetKineticEnergy(G4double ke)  { fKineticEnergy = ke; };
    void SetEventID  (G4int id)         { fEventID = id; };
    void SetStepID   (G4int id)         { fStepID = id; };
    void SetParentID (G4int id)         { fParentID = id; };
    void SetMomentum (G4ThreeVector p)  { fMomentum = p; };
    void SetParticleName(G4String name) { fParticleName = name; };
    void SetCreatorProcess(G4String proc){ fCreatorProcess = proc; };
    void SetTime     (G4double t)       { fTime = t; };
    void SetWeight   (G4double w)       { fWeight = w; };
    void SetStepLength(G4double len)    { fStepLength = len; };
    void SetProcess  (G4String proc)    { fProcess = proc; };
    void SetpostPos      (G4ThreeVector xyz){ fpostPos = xyz; };
    void SetpostProcess  (G4String proc)    { fpostProcess = proc; };
    
    // 🔹 新增阵列编号的 Set 方法
    void SetPixelID  (G4int id)         { fPixelID = id; };

    // Get methods
    G4int GetTrackID() const     { return fTrackID; };
    G4int GetChamberNb() const   { return fChamberNb; };
    G4double GetEdep() const     { return fEdep; };
    G4ThreeVector GetPos() const { return fPos; };
    G4double GetAngle() const    { return fAngle; };
    G4double GetKineticEnergy() const { return fKineticEnergy; };
    G4int GetEventID() const     { return fEventID; };
    G4int GetStepID() const      { return fStepID; };
    G4int GetParentID() const    { return fParentID; };
    G4ThreeVector GetMomentum() const { return fMomentum; };
    G4String GetParticleName() const  { return fParticleName; };
    G4String GetCreatorProcess() const{ return fCreatorProcess; };
    G4double GetTime() const     { return fTime; };
    G4double GetWeight() const   { return fWeight; };
    G4double GetStepLength() const { return fStepLength; };
    G4String GetProcess() const    { return fProcess; };
    G4ThreeVector PostPos() const { return fpostPos; };
    G4String GetpostProcess() const    { return fpostProcess; };
    
    // 🔹 新增阵列编号的 Get 方法
    G4int GetPixelID() const     { return fPixelID; };

  private:
    // 原有成员
    G4int         fTrackID = -1;
    G4int         fChamberNb = -1;
    G4double      fEdep = 0.;
    G4ThreeVector fPos;
    G4double      fAngle = 0.;
    G4double      fKineticEnergy = 0.;
    G4int         fEventID = -1;
    G4int         fStepID = -1;
    G4int         fParentID = -1;
    G4ThreeVector fMomentum;
    G4String      fParticleName;
    G4String      fCreatorProcess;
    G4double      fTime = 0.;
    G4double      fWeight = 1.0;
    G4double      fStepLength = 0.; 
    G4String      fProcess;         
    G4ThreeVector fpostPos;
    G4String      fpostProcess;         
    
    // 🔹 新增阵列编号变量
    G4int         fPixelID = -1;
};

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

using TrackerHitsCollection = G4THitsCollection<TrackerHit>;

extern G4ThreadLocal G4Allocator<TrackerHit>* TrackerHitAllocator;

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

inline void* TrackerHit::operator new(size_t)
{
  if(!TrackerHitAllocator)
      TrackerHitAllocator = new G4Allocator<TrackerHit>;
  return (void *) TrackerHitAllocator->MallocSingle();
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

inline void TrackerHit::operator delete(void *hit)
{
  TrackerHitAllocator->FreeSingle((TrackerHit*) hit);
}

//....oooOO0OOooo........oooOO0OOooo........oooOO0OOooo........oooOO0OOooo......

}
#endif