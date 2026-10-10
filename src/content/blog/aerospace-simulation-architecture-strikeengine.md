---
title: "Architecture of a Data-Oriented 6-DOF Aerospace Simulation Engine"
description: "Designing a high-throughput C++23 flight simulation and GNC engine using Structure-of-Arrays memory, 1 ms physical truth, and Vulkan GPU compute acceleration."
pubDate: 2026-09-10
tags: ["Simulation", "Aerospace", "C++23", "Vulkan", "GNC", "StrikeEngine"]
---

Aerospace vehicle simulation presents a demanding systems engineering challenge: the physical equations governing atmospheric flight and Guidance, Navigation, and Control (GNC) span radically different timescales and constraints. Aerodynamic shocks, control-surface actuation, and rocket motor transients require stiff, microsecond-level numerical stability, while tactical missions involve multi-entity engagements, radar seeker tracking, and large-scale Monte Carlo dispersion analysis.

Most commercial and game physics engines approach rigid bodies with an Array-of-Structures (AoS) object model evaluated at 60 FPS. While sufficient for bouncing boxes or driving cars, this approach quickly falls apart in aerospace dynamics due to cache thrashing, precision drift, and the inability to vectorize equations across GPU compute pipelines.

In **StrikeEngine**, I designed a data-oriented C++23 simulation engine and GNC framework built on contiguous **Structure-of-Arrays (SoA)** memory, a synchronous **1 ms physical truth gate**, and massively parallel **Vulkan 1.3 GPU compute** acceleration.

---

## 1. Truth Dynamics vs. Agent Perception

A central architectural principle of StrikeEngine is the strict separation between **Physical Truth** (the state of the universe) and **Agent Perception** (avionics, noisy sensor measurements, and autopilot commands):

1. **Physical Truth Layer (1 kHz / 1 ms)**: Integrates rigid-body translational and rotational equations of motion, atmospheric pressure and density, solid rocket motor internal ballistics, and aerodynamic forces on a rotating ellipsoidal Earth.
2. **Avionics & GNC Closed Loop**: Simulates realistic hardware limitations—IMU accelerometer/gyroscope bias and drift, radar seeker gimbal limits, semi-active illuminator tracking, multi-target tracking ($\chi^2$ innovation gating), guidance laws, and fin servo rate limits.
3. **Lethality & Event Layer**: Evaluates closest point of approach (CPA), fuze triggering, and fragment spray lethality.

By enforcing this boundary, flight control software running inside the simulation cannot "cheat" by reading ground truth state; it must navigate purely through simulated sensor measurements.

---

## 2. Structure-of-Arrays (SoA) Memory Layout

Rather than modeling entities as isolated C++ classes containing position vectors and matrices, StrikeEngine organizes state into contiguous columnar blocks:

```cpp
// Contiguous Structure-of-Arrays layout for cache-friendly kinematics
struct PhysicsBlock {
    std::vector<double> px, py, pz;       // WGS84 ECEF coordinates (meters)
    std::vector<double> vx, vy, vz;       // ECEF velocity vector (m/s)
    std::vector<double> qw, qx, qy, qz;   // Attitude unit quaternions
    std::vector<double> wx, wy, wz;       // Body angular rates (rad/s)
    std::vector<double> mass;             // Instantaneous vehicle mass (kg)
    std::vector<double> thrust;           // Motor thrust along body X (N)
    // ...
};
```

This layout provides three massive advantages:

1. **Hardware Cache Locality**: SIMD vector instructions process sequential memory without pointer chasing or struct padding overhead.
2. **Direct GPU Buffer Mapping**: The host memory layout maps 1:1 into Vulkan Shader Storage Buffer Objects (SSBOs) without data repacking.
3. **Zero-Copy Python Buffer Protocol**: Python bindings can directly expose memory pointers as `memoryview`, NumPy `ndarray`, PyTorch `Tensor`, and JAX `Array` views with zero copy overhead.

---

## 3. Physical Truth: Rotating Earth & Quaternion Kinematics

### WGS84 ECEF Coordinate Frame

Simulating long-range missile trajectories (such as 80 km air-to-air BVR or 300+ km surface-to-air intercepts) requires accounting for the rotation and curvature of the Earth. StrikeEngine computes translational motion directly in the Earth-Centered Earth-Fixed (ECEF) reference frame:

$$
\mathbf{a}_{\text{ecef}} = \frac{\mathbf{F}^b}{m} + \mathbf{g}(\mathbf{r}) - 2 \boldsymbol{\omega}_e \times \mathbf{v}_{\text{ecef}} - \boldsymbol{\omega}_e \times (\boldsymbol{\omega}_e \times \mathbf{r})
$$

Where:
- $\mathbf{g}(\mathbf{r})$ is the WGS84 gravitational vector, including ellipsoidal normal gravity and the $J_2$ oblateness harmonic.
- $-2 \boldsymbol{\omega}_e \times \mathbf{v}_{\text{ecef}}$ is the **Coriolis acceleration**, which deflects high-speed interceptors off linear tracks over long flight times.
- $-\boldsymbol{\omega}_e \times (\boldsymbol{\omega}_e \times \mathbf{r})$ is the **centrifugal acceleration** of the rotating planet.

### Singularity Avoidance via Quaternions

Traditional flight simulators represent vehicle orientation using Euler angles (pitch, roll, yaw). However, during vertical climbs (such as surface-to-air missile vertical launch system turnover maneuvers), pitch reaches $\theta = \pm 90^\circ$, causing mathematical division by zero—the classic **gimbal lock** singularity.

StrikeEngine propagates attitude via normalized 4D unit quaternions $\mathbf{q} = [q_w, q_x, q_y, q_z]^T$:

$$
\dot{\mathbf{q}} = \frac{1}{2} \boldsymbol{\Omega}(\boldsymbol{\omega}) \mathbf{q} = \frac{1}{2} \begin{bmatrix} 0 & -\omega_x & -\omega_y & -\omega_z \\ \omega_x & 0 & \omega_z & -\omega_y \\ \omega_y & -\omega_z & 0 & \omega_x \\ \omega_z & \omega_y & -\omega_x & 0 \end{bmatrix} \mathbf{q}
$$

After each integration step, the quaternion is renormalized using fast SIMD reciprocal square-root instructions to prevent numerical drift:

```cpp
inline void renormalizeQuaternion(double& w, double& x, double& y, double& z) noexcept {
    const double norm_sq = w*w + x*x + y*y + z*z;
    const double inv_norm = 1.0 / std::sqrt(norm_sq);
    w *= inv_norm;
    x *= inv_norm;
    y *= inv_norm;
    z *= inv_norm;
}
```

---

## 4. Guidance, Navigation & Control (GNC) Pipeline

The GNC loop executes closed-loop guidance updates at every simulation timestep:

1. **Navigation**: Integrates noisy IMU delta-velocities and delta-angles using coning and sculling corrections.
2. **Seekers**: Models radio-frequency (RF) monopulse error slopes, semi-active illuminator tracking, Beer-Lambert infrared extinction, and atmospheric attenuation using band-resolved ITU-R P.676-12 tables.
3. **Guidance Laws**: Computes commanded acceleration vectors using modern guidance laws:
   - **True Proportional Navigation (TPN)**: Standard closing-velocity intercept guidance.
   - **Augmented Proportional Navigation (APN)**: Accounts for target normal acceleration estimates to lead maneuverable fighters.
   - **Impact Angle Control Guidance (IACG)**: Constrains terminal terminal approach angle for top-attack profiles.
4. **Coupled 3-Loop Autopilot**: Maps acceleration commands to aerodynamic fin deflections using dynamic pressure gain scheduling, integral trim anti-windup, and 2nd-order actuator transfer functions with physical deflection and rate limits (e.g. max 300°/s fin slew).

---

## 5. Vulkan 1.3 GPU Acceleration (Slang Shaders)

While a single CPU core evaluates over 70,000 truth steps per second, large-scale Monte Carlo dispersion studies (evaluating thousands of randomized missile flyouts across wind, mass, and seeker noise variations) demand massive parallelization.

StrikeEngine provides a native GPU compute backend authored in the **Slang** shader language:

```hlsl
// Slang compute kernel executing 6-DOF RK4 dynamics in parallel
[shader("compute")]
[numthreads(64, 1, 1)]
void physicsStepKernel(uint3 dispatchThreadId : SV_DispatchThreadID) {
    uint entityId = dispatchThreadId.x;
    if (entityId >= params.entityCount) return;

    // Load contiguous SoA state from Vulkan SSBO
    StateVector state = loadState(entityId);
    ControlInput control = loadControl(entityId);

    // Evaluate 4th-order Runge-Kutta across microsecond substeps
    StateVector nextState = integrateRK4(state, control, params.dt);

    storeState(entityId, nextState);
}
```

### Multi-Substep Block Execution

A primary performance killer in GPU-accelerated simulation is host-device synchronization latency: copying state over PCIe at every 1 ms timestep stalls the GPU pipeline.

To eliminate this bottleneck, StrikeEngine's Vulkan backend implements **multi-substep block execution** (`stepBlock(dt, substeps)`). The GPU dispatches 10 to 50 truth steps entirely inside device VRAM, resolving guidance loops and aerodynamics on-chip before transferring state back to the host CPU. A double-buffered pipeline overlaps device computation with CPU telemetry extraction, achieving verified bit-accurate parity with the CPU reference solver and sub-10 cm kinetic intercept accuracy.

---

## 6. Real-World Tooling: The `strike` CLI & Python RL

Simulation engines should not be black boxes. StrikeEngine includes a full-featured terminal CLI suite (`strike`):

- `strike monitor`: Spawns a real-time, zero-flicker terminal cockpit displaying an ASCII 2D vertical trajectory plot, G-load gauge, Mach speed, and instantaneous telemetry.
- `strike montecarlo`: Executes multi-threaded stochastic dispersion batches across multi-core CPUs, calculating circular error probabilities (CEP-50 and R-95).

```bash
# Launch the live terminal telemetry cockpit
strike monitor data/scenarios/cooperative_bvr_80km_astra.scenario.json --realtime

# Run 100-run stochastic Monte Carlo sweep across missile mass
strike montecarlo data/scenarios/cooperative_bvr_80km_astra.scenario.json \
  --runs 100 --threads 8 --sweep mass:165:185
```

For reinforcement learning, the engine exports a native Gymnasium environment (`StrikeEnv`), allowing researchers to train autonomous guidance policies with PyTorch and Stable-Baselines3:

```python
import strikeengine as se

# Gymnasium-compatible RL environment with zero-copy state observation
env = se.StrikeEnv("data/scenarios/cooperative_bvr_80km_astra.scenario.json", dt=0.02)
obs, info = env.reset(seed=42)

for step in range(500):
    action = [0.05, -0.02, 0.0] # Pitch, yaw, roll fin deflections [-1, 1]
    obs, reward, terminated, truncated, info = env.step(action)
    if terminated:
        break
```

---

## Summary

By combining a Structure-of-Arrays data model, strict 1 ms physical truth gating on an ellipsoidal rotating Earth, and GPU compute shaders, StrikeEngine bridges the gap between low-level systems performance and rigorous aerospace dynamics. 

The complete codebase, documentation, and scenario files are available on GitHub: [yashwk/StrikeEngine](https://github.com/yashwk/StrikeEngine).
