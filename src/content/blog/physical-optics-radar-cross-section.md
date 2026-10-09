---
title: "Radar Cross Section (RCS) Simulation Using Physical Optics"
description: "An overview of computing high-frequency electromagnetic radar cross-section signatures with Physical Optics approximation in StrikeCEM."
pubDate: 2026-08-15
tags: ["Simulation", "Electromagnetics", "C++", "StrikeCEM"]
---

Radar Cross Section (RCS) is a measure of how detectable an object is by radar. At high frequencies where the wavelength $\lambda$ is significantly smaller than the target geometry, numerical solutions of full Maxwell equations (such as Method of Moments or FDTD) become computationally prohibitive.

In **StrikeCEM**, we employ the **Physical Optics (PO)** approximation.

## The Physical Optics Approximation

Physical Optics calculates the surface currents induced on illuminated conducting bodies under the assumption that each point on the surface behaves locally as an infinite planar tangent:

```
J_s = 2 * (n × H_inc)   on illuminated surfaces
J_s = 0                 on shadowed regions
```

Where:
- $\mathbf{n}$ is the outward surface unit normal
- $\mathbf{H}_{\text{inc}}$ is the incident magnetic field vector
- $\mathbf{J}_s$ is the induced surface current density

## Far-Field Integration

The scattered electric field in the far-field zone is obtained by integrating the induced surface currents across all triangulated facets of the geometry:

```cpp
// Facet integration contribution
Vector3 computeFacetScattering(const Triangle& tri, const Vector3& k_inc, const Vector3& k_obs) {
    Vector3 normal = tri.normal();
    float illumination = normal.dot(-k_inc);
    if (illumination <= 0.0f) {
        return Vector3::zero(); // Facet in shadow
    }
    // High-frequency surface current integration across triangular facet
    return evaluateGordonIntegral(tri, k_inc, k_obs);
}
```

By decomposing the CAD mesh into planar facets and applying analytical phase integrals (such as Gordon's method), we can evaluate RCS patterns across observation angles in real-time.

## Next Steps

Future iterations of StrikeCEM will integrate the Physical Theory of Diffraction (PTD) to account for edge diffractions, further refining accuracy along sharp aerodynamic edges.
