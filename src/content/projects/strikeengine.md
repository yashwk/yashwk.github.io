---
name: "StrikeEngine"
tagline: "Data-oriented C++23 aerospace simulation engine & GNC framework"
icon: "/icons/strikeengine.svg"
repo: "https://github.com/yashwk/StrikeEngine"
blogSlug: "aerospace-simulation-architecture-strikeengine"
tags: ["C++23", "Aerospace Simulation", "Vulkan 1.3", "GNC", "Slang Shaders", "Python / PyTorch"]
---

**StrikeEngine** is a data-oriented C++23 aerospace simulation engine and Guidance, Navigation, and Control (GNC) framework. I built it for simulating high-speed 6-DOF (six degrees of freedom) missile flyouts, air-to-air Beyond-Visual-Range (BVR) engagements, surface-to-air interceptors (SAMs), and large-scale Monte Carlo dispersion studies.

Most game physics engines treat rigid bodies like bouncing boxes at 60 FPS, which quickly breaks down in aerospace dynamics. StrikeEngine takes a systems-first, data-oriented approach: it enforces a strict 1 ms physical truth gate (1 kHz Runge-Kutta 4th order integration), runs across a rotating WGS84 ellipsoidal Earth, and scales seamlessly from single-threaded CPU execution (>70,000 steps/sec) to massively parallel Vulkan 1.3 GPU compute with verified sub-10 cm direct kinetic intercept accuracy.

## Why I Built It

High-fidelity aerospace simulations usually fall into two extremes: slow, monolithic legacy Fortran/MATLAB codebases that are impossible to embed into modern software, or oversimplified game physics engines that lack realistic atmospheric models, seeker tracking, or actuator dynamics.

I wanted an engine that combined mathematical rigor with modern systems programming: contiguous Structure-of-Arrays (SoA) memory layouts, zero heap allocations in the inner physics loop, full environmental modeling, and modern hardware acceleration through GPU compute shaders and Python reinforcement learning environments.

## Core Capabilities

### 1. 6-DOF Physical Dynamics & Truth Integration
- **1 ms Integration Gate:** Synchronous Runge-Kutta 4th order (RK4) integration maintaining strict 1 kHz physical truth (*dt* = 0.001 s).
- **WGS84 ECEF Rotating Earth:** Full ellipsoidal coordinates, Coriolis accelerations, centrifugal forces, and spherical/J2 gravitational harmonics.
- **Atmosphere & Aerodynamics:** 1976 US Standard Atmosphere, supersonic conical shock wave drag (Taylor-Maccoll), transonic compressibility, and high-AoA Polhamus vortex lift breakdown.
- **Solid Rocket Motors & Staging:** Multi-stage staging sequences, multi-pulse re-ignition, ramjets, and 6 internal ballistics grain geometries (end-burning, cylindrical, star, slotted, tubular, conoïdal).

### 2. Guidance, Navigation & Control (GNC)
- **Coupled 3-Loop Autopilot:** Dynamic pressure gain-scheduling, integral trim anti-windup, and 2nd-order fin actuator dynamics with physical rate limits.
- **RF Monopulse & SARH Seekers:** Monopulse error slope angle extraction, semi-active radar homing illuminator tracking, Beer-Lambert IR extinction, and band-resolved atmospheric attenuation (ITU-R P.676-12).
- **Multi-Target Tracking & Gating:** Normalized innovation gating ($\chi^2$), track management, threat scoring, and datalink coordination.
- **Modern Guidance Laws:** True Proportional Navigation (TPN), Augmented Proportional Navigation (APN), Impact Angle Control Guidance (IACG), and Impact Time Control Guidance (ITCG).

### 3. Vulkan 1.3 GPU Compute Pipeline

For large-scale Monte Carlo dispersion runs, StrikeEngine includes a companion GPU compute backend written in the Slang shader language. The entire 6-DOF pipeline—equations of motion, aerodynamics, motor thrust curves, and autopilot—is vectorized and dispatched directly to Vulkan compute queues.

A double-buffered asynchronous pipeline overlaps GPU compute dispatch with host telemetry staging and event extraction, doubling throughput while maintaining bit-accurate parity with CPU truth states.

### 4. Native CLI Suite & Live Cockpit (`strike`)

StrikeEngine includes a standalone CLI utility called `strike` with several built-in subcommands:

- `strike monitor`: Launches a real-time, zero-flicker terminal dashboard featuring a live vertical ASCII trajectory plot, G-load gauge, and instantaneous 6-DOF kinematics.
- `strike run`: Executes flyouts with tabular summaries or high-frequency CSV telemetry exports.
- `strike montecarlo`: Runs multi-threaded stochastic dispersion studies across swept parameters (mass, wind, burn rate) and computes CEP-50 and R-95 circular error metrics.
- `strike bench`: Runs comparative CPU vs. Vulkan GPU compute throughput benchmarks.

```bash
# Launch the live terminal telemetry cockpit
strike monitor data/scenarios/cooperative_bvr_80km_astra.scenario.json --realtime

# Run 100-run stochastic Monte Carlo dispersion analysis
strike montecarlo data/scenarios/cooperative_bvr_80km_astra.scenario.json \
  --runs 100 --threads 8 --sweep mass:165:185
```

### 5. Python SDK & Reinforcement Learning

StrikeEngine provides native Python bindings with zero-copy buffer views (`memoryview`, NumPy, PyTorch, JAX) into engine truth memory, plus an out-of-the-box Gymnasium environment (`StrikeEnv`) for training missile guidance and evasive autopilots using reinforcement learning with Stable-Baselines3.

```python
import strikeengine as se

# Run high-fidelity 6-DOF flyout with 1 line of Python
result = se.run("data/scenarios/cooperative_bvr_80km_astra.scenario.json")
print(f"Passed: {result.passed}, Miss: {result.miss_distance_m:.2f} m, Kill: {result.killed_target}")
print(f"Throughput: {result.steps_per_second:,.0f} steps/sec ({result.real_time_multiplier:.0f}x real-time)")
```

## Real-World Scenarios

The repository bundles realistic engagement scenarios in `data/scenarios/`:

- **Cooperative BVR 80 km:** Head-on air combat engagement where an LCA Tejas launches an Astra MK2 missile with datalink handoff against a maneuverable Su-30 Flanker target.
- **S-400 vs AWACS at 314 km:** Long-range surface-to-air lofted trajectory profile against a high-value airborne early warning aircraft.
- **VLS Vertical Launch:** Turnover maneuver from vertical canister launch into horizontal aerodynamic flight and terminal intercept.
