//
// MyPhysicsList.hh
// 自定义物理列表，使用 Livermore Compton 模型
//

#ifndef MyPhysicsList_h
#define MyPhysicsList_h 1

#include "G4VModularPhysicsList.hh"
#include "globals.hh"

class MyPhysicsList : public G4VModularPhysicsList
{
public:
    MyPhysicsList();
    virtual ~MyPhysicsList();

    // 必须重写的方法
    virtual void ConstructParticle();
    virtual void ConstructProcess();
    virtual void SetCuts();

private:
    // 添加其他物理构造器的方法
    void AddEMPhysics();
    void AddDecayPhysics();
    void AddRadioactiveDecayPhysics();
    
    // 设置特定粒子的截止值
    void SetSpecificCuts();
};

#endif