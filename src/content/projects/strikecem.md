---
name: "StrikeCEM"
tagline: "High-frequency Radar Cross Section (RCS) database generator for StrikeEngine"
description: "A Physical Optics radar cross-section (RCS) database generator in C++20/CUDA, computing high-frequency stealth signatures from 3D meshes for StrikeEngine."
icon: "/icons/strikecem.svg"
repo: "https://github.com/yashwk/StrikeCEM"
blogSlug: "physical-optics-radar-cross-section"
tags: ["Computational Electromagnetics", "Physical Optics", "CUDA", "C++20", "HDF5", "Radar Cross Section"]
order: 2
---

**StrikeCEM** is a high-frequency computational electromagnetics (CEM) solver and Radar Cross Section (RCS) database generator. I built it specifically as the companion radar signature generator for **StrikeEngine**'s RF seekers.

In real-world air combat simulations, a missile's radar seeker needs to know exactly how much radar energy reflects off target aircraft at any aspect angle and polarization. Solving full-wave Maxwell equations (like FDTD or Method of Moments) in real time inside a 1 ms flight loop is computationally impossible. StrikeCEM solves this by pre-computing high-density radar signature databases offline from 3D surface meshes and saving them into robust HDF5 databases that StrikeEngine queries during flight.

## Why I Built It

Commercial radar simulation software (like ANSYS HFSS or FEKO) is proprietary, expensive, and difficult to automate in headless CI/CD pipelines. Furthermore, simple spherical or point-mass radar approximations used in amateur flight games fail to capture how stealth shaping works—such as how facet angling deflects radar away or how wing leading edges produce strong specular glints.

I designed StrikeCEM as a dedicated, scriptable C++20/CUDA utility that reads standard 3D CAD meshes, validates their geometry, runs high-frequency asymptotic Physical Optics sweeps, and exports validated HDF5 databases with cryptographic chunk checksums.

## Core Capabilities

### 1. Physical Optics (PO) High-Frequency Solver
- **Planar Triangular Facet Evaluation:** Evaluates monostatic plane-wave scattering from Perfect Electric Conductor (PEC) surface meshes on CPU (multi-threaded) or CUDA GPU.
- **Full Polarization Channels:** Computes copolar and cross-polar scattering across HH, VV, HV, VH, RHCP, and LHCP channels.
- **PTD Fringe Edge Correction:** Implements Physical Theory of Diffraction (PTD) fringe wave calculations to correct for edge diffraction where pure Physical Optics underestimates reflection.
- **Multi-Bounce Geometric Shadowing:** Traces up to 3 geometric-optics bounces to account for self-shadowing and corner-reflector cavity returns.

### 2. Mesh Ingestion & Quality Validation

StrikeCEM directly ingests ASCII and binary STL and OBJ meshes in meters, millimeters, or inches. The pre-flight pipeline checks normal orientation, reports mesh quality, strips degenerate or zero-area triangles, and caches normalized geometries to disk.

### 3. HDF5 Database Generation with Resume Support

Computing full 360° sweeps with fine angular resolution (0.5° steps in azimuth and elevation) across multiple radar frequencies requires evaluating millions of facet samples. StrikeCEM writes output directly into structured HDF5 databases (or CSV with JSON sidecars) featuring:

- **Provenance Metadata:** Stores exact solver commit hash, mesh checksums, frequency list, and polarizations.
- **Cryptographic Chunk Checksums:** Protects output integrity across disk writes.
- **Interrupted Run Resume:** Allows missing output chunks to be resumed without re-evaluating the entire sweep from scratch.

### 4. The `strikecem` CLI Utility

The engine is driven by a clean command-line interface with a strict JSON configuration contract:

```bash
# Preflight check: validate configuration and mesh topology
strikecem validate configs/fighter_sweep.json

# Estimate solve time and memory footprint before launching
strikecem estimate configs/fighter_sweep.json

# Execute Physical Optics sweep on CPU or CUDA GPU
strikecem run configs/fighter_sweep.json --output rcs_database.h5
```

## How StrikeEngine Consumes It

StrikeCEM includes a validated C++ HDF5 reader that StrikeEngine links against. When an Astra or SAM missile's active radar seeker illuminates an aircraft during simulation, StrikeEngine performs a fast, zero-copy bilinear lookup into the HDF5 database based on the instantaneous aspect angle (azimuth and elevation) and radar frequency, providing realistic radar cross section returns in decibels per square meter (dBsm) at zero runtime overhead.
