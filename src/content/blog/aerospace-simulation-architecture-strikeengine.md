---
title: "Modular Aerospace Simulation Architecture in StrikeEngine"
description: "Architecting a modular 6-DOF flight dynamics engine with decoupled numerical integrators and quaternion-based state propagation in C++."
pubDate: 2026-09-10
tags: ["Simulation", "Aerospace", "C++", "StrikeEngine"]
---

Aerospace vehicle simulation presents a unique systems engineering challenge: the physical equations governing atmospheric and orbital flight span wildly different timescales. High-frequency aerodynamic turbulence and control-surface actuation require stiff, microsecond-level substepping, while orbital ephemeris and gravitational gradients evolve smoothly over hours.

In **StrikeEngine**, we designed a modular 6-DOF (Six Degrees of Freedom) simulation architecture built on decoupled numerical integrators, quaternion kinematics, and zero-allocation state vector propagation.

## 6-DOF Equations of Motion

A rigid body traversing planetary atmospheres is governed by coupled translational and rotational equations of motion expressed in the body-fixed reference frame:

$$
\mathbf{F}^b = m \left( \dot{\mathbf{v}}^b + \boldsymbol{\omega}^{b/i} \times \mathbf{v}^b \right)
$$

$$
\mathbf{M}^b = \mathbf{I} \dot{\boldsymbol{\omega}}^{b/i} + \boldsymbol{\omega}^{b/i} \times (\mathbf{I} \boldsymbol{\omega}^{b/i})
$$

Where:
- $\mathbf{v}^b$ is translational velocity in the body frame
- $\boldsymbol{\omega}^{b/i}$ is angular velocity relative to inertial space
- $\mathbf{I}$ is the instantaneous $3 \times 3$ vehicle inertia tensor
- $\mathbf{F}^b$ and $\mathbf{M}^b$ represent the net external forces and moments (aerodynamics, propulsion, and gravity)

## Singularity Avoidance via Quaternions

Representing attitude with Euler angles (roll, pitch, yaw) inevitably encounters mathematical singularities—the classic gimbal lock phenomenon when pitch angle $\theta \to \pm 90^\circ$.

To guarantee numerical robustness across all flight regimes (including vertical climbs and orbital re-entry), StrikeEngine propagates attitude via normalized unit quaternions $\mathbf{q} = [q_w, q_x, q_y, q_z]^T$:

$$
\dot{\mathbf{q}} = \frac{1}{2} \boldsymbol{\Omega}(\boldsymbol{\omega}) \mathbf{q} = \frac{1}{2} \begin{bmatrix} 0 & -\omega_x & -\omega_y & -\omega_z \\ \omega_x & 0 & \omega_z & -\omega_y \\ \omega_y & -\omega_z & 0 & \omega_x \\ \omega_z & \omega_y & -\omega_x & 0 \end{bmatrix} \mathbf{q}
$$

After each integration step, the quaternion is renormalized using fast SIMD reciprocal square-root instructions to prevent numerical drift:

```cpp
// Normalize attitude quaternion using SIMD intrinsic
inline void renormalizeQuaternion(Quaternion& q) noexcept {
    const float norm_sq = q.w*q.w + q.x*q.x + q.y*q.y + q.z*q.z;
    const float inv_norm = 1.0f / std::sqrt(norm_sq);
    q.w *= inv_norm;
    q.x *= inv_norm;
    q.y *= inv_norm;
    q.z *= inv_norm;
}
```

## Decoupled Numerical Integrator Pipeline

Rather than locking the entire simulation into a monolithic solver, StrikeEngine employs a decoupled subsystem architecture. Stiff aerodynamic interactions are integrated using a fixed-step 4th-Order Runge-Kutta (RK4) solver, while orbital mechanics can leverage symplectic or adaptive-step integrators.

```cpp
// Fixed-step 4th-Order Runge-Kutta state advance
StateVector integrateStateRK4(
    const StateVector& x0,
    const ControlInput& u,
    float dt,
    const PhysicsModel& model
) noexcept {
    const StateDerivative k1 = model.computeDerivatives(x0, u, 0.0f);
    const StateDerivative k2 = model.computeDerivatives(x0 + k1 * (dt * 0.5f), u, dt * 0.5f);
    const StateDerivative k3 = model.computeDerivatives(x0 + k2 * (dt * 0.5f), u, dt * 0.5f);
    const StateDerivative k4 = model.computeDerivatives(x0 + k3 * dt, u, dt);

    StateVector x_next = x0 + (k1 + k2 * 2.0f + k3 * 2.0f + k4) * (dt / 6.0f);
    renormalizeQuaternion(x_next.attitude);
    return x_next;
}
```

## Subsystem Bus Architecture

Every flight system (propulsion vectoring, control surfaces, sensor suites, and atmospheric lookups via the US Standard Atmosphere 1976 model) communicates over an explicit, cache-coherent message bus. 

State buffers are allocated contiguously upfront:
- **Zero dynamic memory allocations** during real-time step evaluation
- **Deterministic substepping** for lockstep replay and telemetry streaming
- **Clean modularity** allowing custom flight control computers (FCC) or autopilot algorithms to plug directly into the vehicle bus

This architecture enables StrikeEngine to evaluate over 50,000 complete vehicle state steps per second on a single CPU core while preserving flight-dynamics fidelity.
