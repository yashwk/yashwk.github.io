---
title: "Computing Radar Cross Section (RCS) via High-Frequency Physical Optics in StrikeCEM"
description: "How StrikeCEM generates monostatic radar cross-section databases from 3D surface meshes using Physical Optics, PTD fringe correction, and CUDA acceleration."
pubDate: 2026-08-15
tags: ["Simulation", "Electromagnetics", "C++20", "CUDA", "StrikeCEM"]
---

Radar Cross Section (RCS) is the primary metric defining the stealth characteristics of aerospace vehicles. It quantifies how much electromagnetic energy an aircraft, drone, or missile scatters back toward a radar receiver, measured in square meters ($m^2$) or decibels relative to a square meter ($\text{dBsm}$).

In air combat simulations like **StrikeEngine**, a missile's active radar seeker needs to determine target signal returns at every millisecond timestep. However, computing electromagnetic wave scattering in real time is computationally impossible.

To solve this, I designed **StrikeCEM**—a high-frequency computational electromagnetics (CEM) engine written in C++20 and CUDA that pre-computes high-density radar signature databases from 3D CAD meshes for offline use during flight simulation.

---

## 1. The High-Frequency Computational Bottleneck

The exact physics of electromagnetic wave propagation is governed by Maxwell's equations. Traditional full-wave numerical solvers—such as Finite-Difference Time-Domain (FDTD), Finite Element Method (FEM), or the Method of Moments (MoM)—discretize space or target boundaries into microscopic elements proportional to the illumination wavelength:

$$
\Delta x \le \frac{\lambda}{10}
$$

At typical radar frequencies (such as X-band, $f = 10\text{ GHz}$, $\lambda = 3\text{ cm}$), illuminating a 15-meter fighter jet requires dividing space into tens of billions of 3D grid cells. Solving the resulting dense linear systems requires terabytes of RAM and days of supercomputer time for a single angular direction.

Because tactical radar simulations require full 360° sweeps across both azimuth and elevation at fine angular increments (e.g. 0.5° steps), full-wave methods are unusable. We must turn to **high-frequency asymptotic methods**, where target dimensions are much larger than the radar wavelength ($L \gg \lambda$).

---

## 2. Physical Optics (PO) on Triangular Facets

Physical Optics simplifies wave scattering by treating the target's surface as locally planar. When a radar plane wave strikes a Perfect Electric Conductor (PEC), it induces an electrical surface current density $\mathbf{J}_s$:

$$
\mathbf{J}_s = 
\begin{cases} 
2 (\mathbf{n} \times \mathbf{H}_{\text{inc}}) & \text{on illuminated surfaces } (\mathbf{n} \cdot \mathbf{k}_{\text{inc}} < 0) \\
\mathbf{0} & \text{on shadowed surfaces}
\end{cases}
$$

Where:
- $\mathbf{n}$ is the outward facet unit normal vector.
- $\mathbf{H}_{\text{inc}}$ is the incident magnetic field vector.
- $\mathbf{k}_{\text{inc}}$ is the wave propagation vector.

```cpp
// Surface illumination testing in StrikeCEM
inline bool isFacetIlluminated(const Vector3& normal, const Vector3& k_inc) noexcept {
    return normal.dot(-k_inc) > 0.0f;
}

// Compute induced surface current under Physical Optics approximation
inline Vector3 computeSurfaceCurrent(const Vector3& normal, const Vector3& H_inc) noexcept {
    return 2.0f * normal.cross(H_inc);
}
```

---

## 3. The Transverse Projector & Far-Field Scattering

A subtle but critical mathematical trap in Physical Optics implementation concerns far-field projection. Many simplified textbooks state the far-field scattered electric field as proportional to a single cross product $\hat{\mathbf{r}} \times \mathbf{J}_s$.

However, as documented in StrikeCEM's architectural decision record (**ADR-0001**), a single cross product yields the far *magnetic* field direction rather than the electric field amplitude. The scattered far electric field requires the **transverse projector**:

$$
\mathbf{E}_s(\mathbf{r}) = \frac{j k \eta}{4\pi r} e^{-j k r} \iint_S \left[ \hat{\mathbf{r}} \times (\hat{\mathbf{r}} \times \mathbf{J}_s) \right] e^{j k \hat{\mathbf{r}} \cdot \mathbf{r}'} dS
$$

### Why This Matters

Consider a flat conducting plate lying in the $z=0$ plane illuminated at normal incidence from above:
- Using the naive single-cross form $\hat{\mathbf{r}} \times \mathbf{J}$ yields zero co-polarized return ($S_{HH} = 0$) and dumps all energy into the cross-polarization channel ($S_{VH}$).
- Using the double-cross transverse projector $\hat{\mathbf{r}} \times (\hat{\mathbf{r}} \times \mathbf{J})$ correctly yields zero cross-polarization by physical symmetry, producing the exact analytical broadside peak:

$$
\sigma_{\text{peak}} = \frac{4\pi A^2}{\lambda^2}
$$

Where $A$ is the facet area and $\lambda$ is the radar wavelength. This distinction is vital for accurately modeling stealth shaping, where co-polarization and cross-polarization channel separation dictate radar detectability.

---

## 4. Edge Diffraction (PTD) & Multi-Bounce Cavities

While Physical Optics accurately captures specular reflections from flat and gently curved surfaces, it suffers from two major limitations:

1. **Edge Currents**: PO assumes currents terminate abruptly at facet boundaries, underestimating edge scattering along wing leading edges and control surface gaps.
2. **Cavity Reflections**: Radar waves entering engine intake ducts or corner reflectors bounce multiple times, creating intense retro-reflections.

StrikeCEM enhances pure Physical Optics with two advanced mechanisms:

### Physical Theory of Diffraction (PTD)
StrikeCEM integrates PTD fringe wave currents along wedge boundaries. By subtracting the non-uniform Physical Optics edge contribution from exact canonical wedge diffraction solutions (such as Ufimtsev fringe currents), StrikeCEM computes edge diffraction contributions that prevent radar signatures from vanishing at edge-on viewing angles.

### Multi-Bounce Geometric Optics (GO / SBR)
To capture cavity reflections, StrikeCEM implements geometric optics ray shooting with up to 3 bounces. Reflected rays propagate along specular directions and illuminate secondary facets, correctly accounting for self-shadowing and corner-reflector returns.

---

## 5. GPU Acceleration & Sweep Execution

Evaluating an aircraft model composed of 200,000 triangular facets across full 360° azimuth and elevation sweeps (e.g. 720 azimuth steps $\times$ 360 elevation steps $\times$ 6 polarization channels) requires over 1.5 billion facet integrations.

StrikeCEM parallelizes this on modern multi-core CPUs via OpenMP and on NVIDIA GPUs using a dedicated CUDA compute backend:

```cpp
// CUDA kernel for parallel facet scattering evaluation
__global__ void evaluateFacetScatteringKernel(
    const FacetData* facets,
    const SweepAngle* angles,
    Complex64* out_scattered_field,
    int facet_count,
    int angle_count
) {
    int angle_idx = blockIdx.x;
    int facet_idx = threadIdx.x + blockIdx.y * blockDim.x;

    if (facet_idx >= facet_count || angle_idx >= angle_count) return;

    // Evaluate facet visibility, phase term, and transverse projection
    Complex64 contrib = evaluateFacetPO(facets[facet_idx], angles[angle_idx]);

    // Atomic accumulation into observation bin
    atomicAddComplex(&out_scattered_field[angle_idx], contrib);
}
```

The CLI executable (`strikecem`) provides preflight validation and time estimation before launching compute-heavy jobs:

```bash
# Validate CAD mesh topology and JSON configuration schema
strikecem validate configs/su30_flanker_xband.json

# Estimate solve time and memory usage before starting
strikecem estimate configs/su30_flanker_xband.json

# Run Physical Optics sweep on CUDA device and export HDF5 database
strikecem run configs/su30_flanker_xband.json --output su30_rcs.h5
```

---

## 6. HDF5 Storage & StrikeEngine Ingestion

The resulting radar signature is written to a flat-row **HDF5** database featuring:

- **Full Polarimetric Channels**: Stores returns across linear (HH, VV, HV, VH) and circular (RHCP, LHCP) bases.
- **Cryptographic Chunk Checksums**: Protects multi-gigabyte databases against disk corruption during long batch sweeps.
- **Output-Stage Resume**: Interrupted sweeps can resume from the last completed angular chunk without re-evaluating the entire mesh from scratch.

During flight simulation in StrikeEngine, the missile's active radar seeker queries this HDF5 table via zero-copy bilinear interpolation:

$$
\sigma(\theta, \phi, f) \to \text{Seeker Receiver Power } P_r = \frac{P_t G_t G_r \lambda^2 \sigma}{(4\pi)^3 R^4}
$$

This allows StrikeEngine to simulate realistic radar detection ranges, stealth aspect sensitivity, and evasive target maneuvers with microsecond lookup speeds.

---

## Summary

By combining the Physical Optics surface approximation with transverse projector corrections, PTD fringe currents, and CUDA GPU acceleration, StrikeCEM bridges the gap between electromagnetic theory and real-time flight simulation.

The project is available on GitHub: [yashwk/StrikeCEM](https://github.com/yashwk/StrikeCEM).
