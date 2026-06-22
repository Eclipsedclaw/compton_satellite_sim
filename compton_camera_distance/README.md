# Compton Camera Toy Model

This directory contains a Geant4-based toy model for a Compton camera style detector. The main executable is `exampleB2a`, and the geometry currently uses a layered setup with YSO and LYSO scintillators plus silicon and FR4 dead layers. Comparing to `../compton_camera` this model makes two LYSO layers slightly far away from each other

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
<img width="1105" height="804" alt="Screenshot 2026-06-22 at 11 40 21 AM" src="https://github.com/user-attachments/assets/5226c7a3-566d-42bd-b498-fb8d26fb6544" />

      
Other macro files in this directory can be used the same way. The macros are the easiest place to change:

- particle type (Currently this model only accept e+ e- gamma geantino neutron proton ion, will need to figure out and debug)
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
