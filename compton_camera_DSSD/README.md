# Compton Camera Toy Model

This directory contains a Geant4-based model for a multi-layer Compton camera detector. The main executable is `exampleB2a`, and the geometry currently uses 5 layers of Si detector and a layer of CZT detector at the bottom location.

## Overview

The simulation is built around the standard Geant4 B2a example structure and includes:

- a custom detector geometry in `src/DetectorConstruction.cc`
- a general particle source in `src/PrimaryGeneratorAction.cc`
- hit collection and ROOT output through `src/Analysis.cc`
- macro files for batch runs and visualization

The default output file is `b1output.root`.

## Requirements

- CMake 3.16 or newer
- Geant4 with UI and visualization support if you want to use interactive visualization
- a C++ compiler supported by your Geant4 installation

## Build

You need a build directory to compile the code. This is assuming you compile under the same directory of the source folder compton_satellite_sim/compton_camera

```bash
mkdir -p build
cd build
cmake ../
make
```

If you change files under `src/` or `include/`, rebuild the project before running it again.

## Run the simulation

All macro files are under the macro directory, run the executable from `build/` with proper macro file specified. Try with visulization first.

```bash
./exampleB2a ./macro/vis.mac
```

This produces `G4Data0.heprep` in the build directory. If needed, you can launch HepRApp with:
```bash
java -jar /opt/HepRApp/HepRApp.jar G4Data0.heprep
```
<img width="1202" height="822" alt="compton_sim_example" src="https://github.com/user-attachments/assets/4b82b63f-3046-4e0f-b00b-2a6ba9b420c2" />

Other macro files in this directory can be used the same way. The macros are the easiest place to change:

- particle type
- particle energy
- source position and direction
- number of events

The generator uses Geant4 GPS, so you can also tune the source directly in the macro files.


## Geometry notes

The current detector model places three active scintillator layers along the beam axis:

- two YSO layers
- one LYSO layer
- thin silicon and FR4 layers associated with each active layer

The layer spacing is configured in `src/DetectorConstruction.cc` and can be adjusted there.
