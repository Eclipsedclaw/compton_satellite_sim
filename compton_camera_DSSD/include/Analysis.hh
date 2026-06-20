#ifndef Analysis_h
#define Analysis_h 1

#include "G4AnalysisManager.hh"
#include "G4AutoLock.hh"
#include "G4Threading.hh"
#include "G4THitsCollection.hh"  // 🔹 新增：Geant4 模板 hits collection 头文件
#include "globals.hh"
#include <map>
#include <string>  // 🔹 新增：用于 G4String

// 🔹 新增：forward declaration for TrackerHit (如果 TrackerHit.hh 未包含)
namespace B2{
class TrackerHit;

typedef G4THitsCollection<TrackerHit> TrackerHitsCollection;


class Analysis {
public:
    static Analysis* getInstance();
    void book(G4bool isMaster = true);
    void finish(G4bool isMaster = true);
    void FillNtuple(TrackerHitsCollection* hitsCollection);  // 🔹 修复：添加 B2:: 命名空间限定
    ~Analysis();

private:
    Analysis();
    static Analysis* instance;
    std::map<G4int, G4double>* totEnergyDep;
    G4String histFileName;
    G4int verboseLevel = 1; // 用于调试输出
    static G4Mutex instanceMutex; // 单例互斥锁
    static G4Mutex dataManipulationMutex; // 数据操作互斥锁
};
}
#endif