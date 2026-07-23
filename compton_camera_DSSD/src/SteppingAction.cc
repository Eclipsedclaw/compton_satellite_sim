#include "SteppingAction.hh"
#include "EventAction.hh"       // 这是你需要包含的
#include "G4Step.hh"
#include "G4EventManager.hh"    // 虽然我们用了指针传递，但为了保险也可以包含
#include "G4SystemOfUnits.hh"

// 注意：如果你使用了 namespace B2，请保持一致。
// 看你的 EventAction 是 namespace B2，我也加上

SteppingAction::SteppingAction(B2::EventAction* eventAction)
 : G4UserSteppingAction(), fEventAction(eventAction)
{}

SteppingAction::~SteppingAction()
{}

void SteppingAction::UserSteppingAction(const G4Step* step)
{
    // 1. 获取当前这一步（Step）在灵敏探测器中的沉积能量
    G4double edep = step->GetTotalEnergyDeposit();

    // 2. 如果有能量沉积，就把能量累加到 EventAction 里
    if (edep > 0.0 && fEventAction) {
        fEventAction->AddEnergyDeposit(edep);
    }
}
