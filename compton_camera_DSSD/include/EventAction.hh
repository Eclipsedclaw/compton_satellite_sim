#ifndef B2EventAction_h
#define B2EventAction_h 1

#include "G4UserEventAction.hh"
#include "globals.hh"

namespace B2
{

class EventAction : public G4UserEventAction
{
  public:
    EventAction();
    ~EventAction() override;

    void  BeginOfEventAction(const G4Event*) override;
    void    EndOfEventAction(const G4Event*) override;

    // 供 SteppingAction 调用的接口，累加每一步的沉积能量
    void AddEnergyDeposit(G4double edep) { fTotalEnergyDeposit += edep; }

  private:
    G4double fTotalEnergyDeposit;   // 当前事件在探测器中的总沉积能量
    G4double fPrimaryEnergy;        // 当前事件入射粒子的初始动能
};

}

#endif