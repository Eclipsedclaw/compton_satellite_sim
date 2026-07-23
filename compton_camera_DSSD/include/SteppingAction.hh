#ifndef SteppingAction_h
#define SteppingAction_h 1

#include "G4UserSteppingAction.hh"
#include "globals.hh"

// 提前声明 EventAction 类，因为头文件需要互引用
namespace B2 { class EventAction; }

class SteppingAction : public G4UserSteppingAction
{
  public:
    // 构造函数传入 EventAction 指针，方便直接调用累加函数
    SteppingAction(B2::EventAction* eventAction);
    ~SteppingAction() override;

    // 每执行一个物理步（Step）时，系统会自动调用此函数
    void UserSteppingAction(const G4Step*) override;

  private:
    B2::EventAction* fEventAction;  // 保存 EventAction 的指针
};

#endif

