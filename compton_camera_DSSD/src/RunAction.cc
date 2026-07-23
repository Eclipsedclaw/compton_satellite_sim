#include "RunAction.hh"
#include "Analysis.hh"
#include "G4Run.hh"
#include "G4RunManager.hh"
#include "G4AnalysisManager.hh"

namespace B2
{

RunAction::RunAction()
{
  G4RunManager::GetRunManager()->SetPrintProgress(1000);
}

void RunAction::BeginOfRunAction(const G4Run*)
{
  G4RunManager::GetRunManager()->SetRandomNumberStore(false);
  
  // 1. 先调用 Analysis 类，让它建立 Ntuple 0 (25列) 并打开文件
  Analysis* analysis = Analysis::getInstance();
  analysis->book(IsMaster()); // 取消注释

  // 2. 再创建新的 Ntuple 1 (3列) —— 只让 Master 线程创建一次
  if (IsMaster()) {
      G4AnalysisManager* man = G4AnalysisManager::Instance();
      // 注意：千万不要用 man->Reset() 和 man->OpenFile()，因为这些在 analysis->book 里已经做了！
      man->CreateNtuple("Efficiency", "Efficiency Data");
      man->CreateNtupleDColumn("Energy_MeV");    // Ntuple 1, Col 0
      man->CreateNtupleIColumn("IsHit");         // Ntuple 1, Col 1
      man->CreateNtupleIColumn("IsFullAbs");     // Ntuple 1, Col 2
      man->FinishNtuple();
  }
}

void RunAction::EndOfRunAction(const G4Run*)
{
  // 直接调用 finish，它会自动写入数据并关闭文件
  Analysis* analysis = Analysis::getInstance();
  analysis->finish(IsMaster()); // 取消注释

  // 这里不要再加 man->Write() 或 man->CloseFile() 了，因为上面已经做过了！
}

}