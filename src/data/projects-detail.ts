export interface ProjectDetail {
  slug: string;
  name: string;
  icon: string;
  tagline: string;
  repo: string;
  blogSlug?: string;
  tags: string[];
  metrics: Record<string, string>;
  overview: string;
  architectureDiagram: string;
  keyFeatures: { title: string; desc: string }[];
  mathematicalFoundations?: string[];
  techStack: string[];
}

export const projectsDetail: Record<string, ProjectDetail> = {
  strikeengine: {
    slug: "strikeengine",
    name: "StrikeEngine",
    icon: "/icons/strikeengine.svg",
    tagline: "Modular 6-DOF Aerospace Dynamics & Flight Simulation Engine",
    repo: "https://github.com/yashwk/StrikeEngine",
    blogSlug: "aerospace-simulation-architecture-strikeengine",
    tags: ["C++20", "Aerospace", "Simulation", "6-DOF Dynamics", "RK4"],
    metrics: {
      "Evaluation Rate": ">50,000 steps/sec",
      "Attitude Kinematics": "Unit Quaternions",
      "Numerical Integrator": "Runge-Kutta 4th Order",
      "Atmosphere Model": "US Standard 1976"
    },
    overview: `StrikeEngine is a high-performance aerospace simulation engine engineered in modern C++20. Designed to handle the physical complexities of hypersonic atmospheric flight, orbital insertions, and planetary re-entry, the engine decouples high-frequency aerodynamic substepping from orbital ephemeris.

By strictly enforcing zero heap allocations within the inner physics loop and adopting contiguous cache-coherent state vectors, StrikeEngine provides lockstep numerical determinism suitable for flight control computer (FCC) development and hardware-in-the-loop (HIL) testing.`,
    architectureDiagram: `┌─────────────────────────────────────────────────────────────┐
│                      StrikeEngine Core                      │
└─────────────────────────────────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
     [ Kinematics & Attitude ]       [ Environmental Model ]
     • Unit Quaternions              • US Standard 1976
     • Renormalization via SIMD      • Gravitational J2 Perturbations
               │                               │
               └───────────────┬───────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Subsystem Message Bus                    │
│  ┌─────────────────┬──────────────────┬──────────────────┐  │
│  │   Aerodynamics  │    Propulsion    │ Control Surfaces │  │
│  │  Lift/Drag/Mach │ Thrust Vectoring │  Aero Elevons    │  │
│  └─────────────────┴──────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Decoupled Integrator Pipeline               │
│               • Stiff Aero: Runge-Kutta 4 (RK4)             │
│               • Orbitals: Symplectic Semi-Implicit          │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                 [ Deterministic State Vector ]
                 • Telemetry Stream & State History`,
    keyFeatures: [
      {
        title: "Singularity-Free 6-DOF Kinematics",
        desc: "Employs unit quaternion state propagation to completely eliminate gimbal lock singularities at extreme pitch angles (±90° vertical climbs and maneuvers)."
      },
      {
        title: "Decoupled Multi-Rate Integrators",
        desc: "Microsecond substepping with 4th-Order Runge-Kutta (RK4) for stiff aerodynamic regimes coupled with adaptive integrators for long-duration orbital paths."
      },
      {
        title: "Zero-Allocation Inner Loop",
        desc: "State vectors, derivatives, and subsystem bus payloads are contiguously preallocated, guaranteeing deterministic microsecond step latencies without GC or heap jitter."
      },
      {
        title: "US Standard Atmosphere 1976",
        desc: "Layered atmospheric pressure, temperature, and density calculations up to 86 km with dynamic Mach number and shock expansion lookups."
      }
    ],
    mathematicalFoundations: [
      "Rigid-Body Translational Dynamics: F^b = m (v̇^b + ω^(b/i) × v^b)",
      "Euler's Rotational Equations: M^b = I ω̇^(b/i) + ω^(b/i) × (I ω^(b/i))",
      "Quaternion Kinematics: q̇ = 0.5 * Ω(ω) * q",
      "Runge-Kutta 4th-Order State Advance: x_(n+1) = x_n + (dt/6) * (k1 + 2k2 + 2k3 + k4)"
    ],
    techStack: ["C++20", "CMake", "Eigen", "SIMD Intrinsics", "GoogleTest"]
  },

  strikecem: {
    slug: "strikecem",
    name: "StrikeCEM",
    icon: "/icons/strikecem.svg",
    tagline: "High-Frequency Radar Cross Section (RCS) Simulation via Physical Optics",
    repo: "https://github.com/yashwk/StrikeCEM",
    blogSlug: "physical-optics-radar-cross-section",
    tags: ["Computational Electromagnetics", "Physical Optics", "RCS", "C++", "Gordon Integration"],
    metrics: {
      "Asymptotic Method": "Physical Optics (PO)",
      "Surface Integration": "Gordon Analytical Form",
      "Observation Modes": "Monostatic & Bistatic",
      "Discretization": "Triangular Facets"
    },
    overview: `StrikeCEM is a computational electromagnetics simulation framework built for predicting high-frequency Radar Cross Section (RCS) signatures of complex aerodynamic and stealth structures.

When radar illumination wavelength λ is much smaller than target dimensions, solving full-wave Maxwell equations (e.g., FDTD, FEM, MoM) becomes computationally impossible. StrikeCEM utilizes asymptotic Physical Optics (PO) to compute induced surface currents on illuminated planar facets and integrates far-field scattered radiation in real time.`,
    architectureDiagram: `┌─────────────────────────────────────────────────────────────┐
│                    CAD Geometry Ingestion                   │
│               • STL / OBJ Triangular Mesh Import            │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Illumination & Shadow Engine                │
│            • Face Normal dot (-k_inc) Visibility            │
│            • Self-Shadowing Culling & Geometric Filtering   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Gordon Analytical Phase Integrator           │
│    • Closed-form contour integration along facet edges      │
│    • Exact phase correction for planar triangular patches   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Far-Field Radiation Summation                │
│         • Coherent Superposition of Facet Contributions     │
│         • Monostatic Angular Sweeps (Azimuth & Elevation)   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                 [ RCS Signature Output (dBsm) ]
                 • 2D Polar Plots & 3D Scattering Spheres`,
    keyFeatures: [
      {
        title: "Gordon Closed-Form Facet Integration",
        desc: "Evaluates the exact high-frequency phase surface integral over illuminated triangular patches using boundary contour integrals without numerical quadrature."
      },
      {
        title: "Monostatic & Bistatic Sweeps",
        desc: "Supports co-located transmitter/receiver sweeps (monostatic) and arbitrary angular receiver separations (bistatic) across full 360° azimuth and elevation."
      },
      {
        title: "High-Throughput Parallel Evaluation",
        desc: "OpenMP-accelerated facet integration capable of processing models with hundreds of thousands of triangular facets in real time."
      },
      {
        title: "Standard RCS Metrics (dBsm)",
        desc: "Outputs normalized radar cross-section values in decibels relative to a square meter (dBsm) alongside linear polar scattering charts."
      }
    ],
    mathematicalFoundations: [
      "Physical Optics Induced Current: J_s = 2 (n × H_inc) on illuminated surfaces, 0 on shadow",
      "Far-Field Scattered Field: E_s(r) = (j k / 4π r) e^(-j k r) ∫∫ [n × E - η n × (n × H)] e^(j k r' · w) dS",
      "Gordon Boundary Integral Reduction: ∫∫_S e^(j w · r') dS = (1 / |w_t|^2) ∑_m (w_t × a_m) · n * sinc(0.5 w · a_m) * e^(j w · r_m)",
      "Radar Cross Section Definition: σ = lim(r → ∞) 4π r^2 |E_s|^2 / |E_inc|^2"
    ],
    techStack: ["C++20", "OpenMP", "Linear Algebra", "CMake", "Catch2"]
  },

  libxtm: {
    slug: "libxtm",
    name: "libxtm",
    icon: "/icons/libxtm.svg",
    tagline: "Extreme Terrain Compression for Low-Latency Geospatial Streaming",
    repo: "https://github.com/yashwk/libxtm",
    blogSlug: "terrain-compression-in-libxtm",
    tags: ["Data Compression", "Terrain", "Geospatial", "SIMD", "C/C++"],
    metrics: {
      "Compression Ratio": "8:1 to 12:1",
      "Tile Decode Latency": "<0.2 ms / tile",
      "Memory Allocation": "Zero-Alloc Inner Loop",
      "Tile Partitioning": "Hierarchical Quadtree"
    },
    overview: `libxtm is a high-performance digital elevation model (DEM) compression library designed for real-time aerospace visualization and flight simulators.

Planetary terrain datasets easily reach multi-gigabyte or terabyte footprints. Streaming raw elevation grids causes severe cache thrashing and memory bus saturation. libxtm provides chunked hierarchical encoding with localized 2D delta prediction and variable-byte entropy coding, delivering up to 12:1 compression ratios while supporting zero-allocation SIMD decompression directly into GPU-ready vertex buffers.`,
    architectureDiagram: `┌─────────────────────────────────────────────────────────────┐
│                  Raw Elevation Grid (DEM)                   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Spatial Quadtree Partitioning               │
│            • 64×64 / 128×128 Disjoint Terrain Chunks        │
│            • Multi-Resolution Level-of-Detail (LOD) Pyramids│
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Localized 2D Delta Prediction Filter            │
│         • Median Edge Predictor (MED) Residual Encoding     │
│         • Gradient Directional Prediction (Left/Top/Corner) │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Variable-Byte & Bitstream Entropy Coder         │
│          • ZigZag Quantization of Residual Deltas           │
│          • Compact Run-Length and Bit-Packing Engine        │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Zero-Copy SIMD Decompression Engine             │
│            • Direct decode into caller-allocated VBO        │
│            • Frustum-based out-of-core streaming            │
└─────────────────────────────────────────────────────────────┘`,
    keyFeatures: [
      {
        title: "Hierarchical Quadtree LOD",
        desc: "Chunk-level random access enables flight simulators to stream high-resolution elevation tiles near the vehicle while retaining low-density tiles at the horizon."
      },
      {
        title: "Localized 2D Predictive Filter",
        desc: "Analyzes spatial correlation between adjacent elevation samples using Median Edge Prediction (MED) to reduce sample entropy before bit packing."
      },
      {
        title: "Zero-Allocation Decompression",
        desc: "Decompresses directly into GPU vertex buffer objects (VBO) or caller-provided memory buffers with zero temporary heap allocations."
      },
      {
        title: "SIMD Vectorized Decoding",
        desc: "AVX2/NEON vectorized byte unpacking decodes a 64×64 elevation tile in less than 200 microseconds, easily sustaining 120 FPS flight dynamics loops."
      }
    ],
    mathematicalFoundations: [
      "Median Edge Predictor (MED): e_pred = min(L, T) if C ≥ max(L, T); max(L, T) if C ≤ min(L, T); L + T - C otherwise",
      "Residual Difference: Δ(x, y) = Elevation(x, y) - e_pred(x, y)",
      "ZigZag Variable-Byte Mapping: z = (2Δ) if Δ ≥ 0, (-2Δ - 1) if Δ < 0",
      "Lossless & Controlled Lossy Modes: Δ_quant = round(Δ / tolerance)"
    ],
    techStack: ["C99 / C++20", "SIMD (AVX2/NEON)", "CMake", "Google Benchmark"]
  }
};
