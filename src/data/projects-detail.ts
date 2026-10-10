export interface MathFoundation {
  title: string;
  formula: string;
  explanation: string;
}

export interface PipelineStep {
  step: string;
  title: string;
  description: string;
}

export interface ProblemSection {
  lead: string;
  points: { title: string; desc: string }[];
}

export interface ProjectDetail {
  slug: string;
  name: string;
  icon: string;
  tagline: string;
  repo: string;
  blogSlug?: string;
  tags: string[];
  metrics: Record<string, string>;
  plainEnglishSummary: string[];
  theProblem: ProblemSection;
  howItWorks: PipelineStep[];
  architectureDiagram: string;
  keyFeatures: { title: string; desc: string }[];
  mathematicalFoundations?: MathFoundation[];
  techStack: string[];
  overview?: string;
}

export const projectsDetail: Record<string, ProjectDetail> = {
  strikeengine: {
    slug: "strikeengine",
    name: "StrikeEngine",
    icon: "/icons/strikeengine.svg",
    tagline: "High-Performance 6-DOF Flight Physics & Aerospace Dynamics Engine",
    repo: "https://github.com/yashwk/StrikeEngine",
    blogSlug: "aerospace-simulation-architecture-strikeengine",
    tags: ["C++20", "Flight Dynamics", "6-DOF Simulation", "RK4 Integration", "SIMD"],
    metrics: {
      "Evaluation Speed": ">50,000 steps/sec",
      "Attitude Math": "Unit Quaternions (Gimbal-Free)",
      "Numerical Solver": "Runge-Kutta 4th Order (RK4)",
      "Atmosphere Model": "US Standard Atmosphere 1976"
    },
    plainEnglishSummary: [
      "StrikeEngine is a high-performance flight physics engine built from scratch in modern C++20. Think of it as the mathematical core behind an aerospace flight simulator or an autonomous flight control computer.",
      "When an aircraft, rocket, or drone flies through the air, forces like gravity, engine thrust, and turbulent wind push and twist the vehicle across three dimensions. StrikeEngine calculates exactly where the vehicle travels (translation) and how it tilts, rolls, and pitches (rotation) up to 50,000 times per second with microsecond precision."
    ],
    theProblem: {
      lead: "Why not use a standard off-the-shelf game physics engine like Unity's PhysX or Unreal Engine? General-purpose game engines are built for bouncing boxes and driving cars at 60 FPS. In aerospace, flight dynamics present two fundamental engineering hurdles:",
      points: [
        {
          title: "1. Hypersonic Aerodynamic Stiffness",
          desc: "Air density and aerodynamic forces change violently between sea level and high altitudes (up to 86 km). At supersonic speeds, tiny changes in vehicle angle produce massive aerodynamic forces within fractions of a millisecond. If a solver takes standard fixed steps, the math diverges and the simulation breaks."
        },
        {
          title: "2. The Gimbal Lock Singularity",
          desc: "Traditional flight simulators track orientation using Euler angles (pitch, yaw, and roll). But during a steep 90° vertical climb or dive, pitch and yaw align onto the same axis, causing division-by-zero errors and losing a degree of rotational freedom."
        }
      ]
    },
    howItWorks: [
      {
        step: "01",
        title: "State & Mass Initialization",
        description: "Initializes the vehicle's position, linear velocity, mass properties, and 4D unit quaternion orientation."
      },
      {
        step: "02",
        title: "Atmospheric & Environmental Sampling",
        description: "Looks up local air density, pressure, temperature, and speed of sound at the vehicle's exact altitude using the US Standard Atmosphere 1976 model."
      },
      {
        step: "03",
        title: "Aerodynamics & Propulsion Forces",
        description: "Computes total lift, drag, pitching moments, control surface deflections (elevons, rudders), and engine thrust vectoring based on airspeed and angle of attack."
      },
      {
        step: "04",
        title: "Runge-Kutta 4 (RK4) High-Precision Step",
        description: "Computes four intermediate derivative samples across each microsecond timestep to accurately follow steep aerodynamic gradients without numeric drift."
      },
      {
        step: "05",
        title: "Deterministic State & Telemetry Output",
        description: "Streams lockstep 6-DOF coordinates, velocity vectors, and g-forces to flight computers or visualization frontends with zero garbage collection or memory allocation jitter."
      }
    ],
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
        title: "Singularity-Free 4D Quaternion Kinematics",
        desc: "Represents 3D vehicle attitude using unit quaternions instead of Euler angles, completely eliminating gimbal lock during vertical climbs, loops, and barrel rolls."
      },
      {
        title: "Decoupled Multi-Rate Integrators",
        desc: "Solves fast aerodynamic changes with 4th-Order Runge-Kutta (RK4) at microsecond intervals, while propagating long-duration orbital paths with symplectic integrators."
      },
      {
        title: "Zero-Heap Inner Physics Loop",
        desc: "All state vectors, derivative matrices, and subsystem message buses are preallocated in contiguous cache lines, guaranteeing deterministic microsecond latencies without memory allocations."
      },
      {
        title: "US Standard Atmosphere 1976",
        desc: "Full layered atmospheric model up to 86 km altitude, providing real-time air density, temperature, and Mach number lookups for realistic supersonic flight."
      }
    ],
    mathematicalFoundations: [
      {
        title: "Rigid-Body Translational Equations of Motion",
        formula: "F^b = m (v̇^b + ω^(b/i) × v^b)",
        explanation: "Newton's second law in a rotating aircraft body frame. It calculates how aerodynamic forces and engine thrust accelerate the vehicle through 3D space."
      },
      {
        title: "Euler's Rotational Equations of Motion",
        formula: "M^b = I ω̇^(b/i) + ω^(b/i) × (I ω^(b/i))",
        explanation: "Calculates how the vehicle pitches, rolls, and yaws around its center of gravity when control surfaces or aerodynamic torques exert twisting moments on the airframe."
      },
      {
        title: "Unit Quaternion Kinematics",
        formula: "q̇ = 0.5 * Ω(ω) * q",
        explanation: "Propagates 3D vehicle orientation using 4D quaternion algebra, completely avoiding division-by-zero gimbal lock singularities."
      },
      {
        title: "Runge-Kutta 4th-Order Numerical Integrator",
        formula: "x_(n+1) = x_n + (dt / 6) * (k1 + 2*k2 + 2*k3 + k4)",
        explanation: "A high-precision numerical solver that computes four intermediate slope estimates per timestep to follow steep aerodynamic forces without numerical divergence."
      }
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
    tags: ["Computational Electromagnetics", "Physical Optics", "Radar Cross Section", "C++20", "OpenMP"],
    metrics: {
      "High-Frequency Method": "Physical Optics (PO) Approximation",
      "Facet Integration": "Gordon Analytical Closed-Form",
      "Observation Modes": "Monostatic & Bistatic Sweeps",
      "Geometry Format": "STL & OBJ Triangular Mesh"
    },
    plainEnglishSummary: [
      "StrikeCEM is a high-speed radar simulation tool that predicts how visible an aircraft, drone, or missile is to enemy radar systems.",
      "Stealth aircraft like the B-2 Spirit or F-22 Raptor aren't invisible to the naked eye. Instead, they are engineered with carefully angled, flat composite surfaces designed to bounce radar waves away from enemy radar receivers. The measure of how strongly an object reflects radar signals back is called its Radar Cross Section (RCS). StrikeCEM loads a 3D model of an aircraft and calculates its 360-degree radar visibility in seconds on standard hardware."
    ],
    theProblem: {
      lead: "Why is calculating radar visibility notoriously difficult and slow with standard methods?",
      points: [
        {
          title: "1. The Supercomputer Bottleneck (Maxwell's Equations)",
          desc: "The exact behavior of electromagnetic waves is governed by Maxwell's equations. But when a radar wavelength (a few centimeters) hits a large aircraft (15 to 30 meters wide), exact full-wave solvers (like FDTD or FEM) require dividing the airspace into tens of billions of 3D calculation cells. Simulating a single aircraft on a supercomputer can take days or weeks."
        },
        {
          title: "2. The Need for Real-Time Design Iteration",
          desc: "Aerospace engineers need to test hundreds of geometry revisions and evaluate full 360° radar sweeps across both horizontal (azimuth) and vertical (elevation) angles. Waiting days for a single angle makes rapid stealth design impossible."
        }
      ]
    },
    howItWorks: [
      {
        step: "01",
        title: "3D CAD Mesh Ingestion",
        description: "Imports the surface geometry of the aircraft or stealth structure from standard STL or OBJ 3D triangular mesh files."
      },
      {
        step: "02",
        title: "Illumination & Self-Shadowing Test",
        description: "Performs vector dot products between incoming radar rays and facet normal vectors, discarding shadowed back-faces and self-occluded patches."
      },
      {
        step: "03",
        title: "Physical Optics Surface Currents",
        description: "Applies high-frequency electromagnetic boundary conditions to calculate the induced electrical surface currents on every illuminated facet."
      },
      {
        step: "04",
        title: "Gordon Analytical Phase Integration",
        description: "Evaluates the scattered wave integral along the perimeter edges of each triangular facet using Gordon's closed-form mathematical formula (zero numerical quadrature)."
      },
      {
        step: "05",
        title: "Coherent Summation & Radar Signature (dBsm)",
        description: "Sums the scattered wave phases from all facets to calculate the total Radar Cross Section in decibels relative to a square meter (dBsm) across a full 360° sweep."
      }
    ],
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
        desc: "Converts complex 2D surface integrals into exact 1D line integrals along the three triangle edges, computing exact scattering without slow numerical approximation grids."
      },
      {
        title: "Full 360° Monostatic & Bistatic Sweeps",
        desc: "Simulates co-located radar transmitters and receivers (monostatic) as well as separated transmitter and receiver stations (bistatic) across full azimuth and elevation spans."
      },
      {
        title: "OpenMP Parallelized CPU Architecture",
        desc: "Distributes facet calculations across all available CPU cores, evaluating meshes with hundreds of thousands of triangles in seconds."
      },
      {
        title: "Industry Standard Output Metrics (dBsm)",
        desc: "Generates standardized decibel-relative-to-square-meter (dBsm) signatures and polar radar reflection diagrams used by aerospace defense analysts."
      }
    ],
    mathematicalFoundations: [
      {
        title: "Physical Optics Surface Current Approximation",
        formula: "J_s = 2 (n × H_inc) [illuminated], 0 [shadow]",
        explanation: "Assumes high-frequency radar waves behave like light rays hitting a mirror. Illuminated facets produce electric surface currents proportional to the incident magnetic field, while shadowed facets produce zero current."
      },
      {
        title: "Far-Field Scattered Radiation Integral",
        formula: "E_s(r) = (j k / 4π r) e^(-j k r) ∫∫ [n × E - η n × (n × H)] e^(j k r' · w) dS",
        explanation: "Integrates the electromagnetic radiation radiating outward from all induced surface currents to find the total electric field that arrives back at the radar receiver."
      },
      {
        title: "Gordon Analytical Boundary Reduction",
        formula: "∫∫_S e^(j w · r') dS = (1 / |w_t|^2) ∑_m (w_t × a_m) · n * sinc(0.5 w · a_m) * e^(j w · r_m)",
        explanation: "A mathematical transformation that replaces a costly 2D surface integral with a fast, exact sum along the three edges of each triangular facet, eliminating numerical integration errors."
      },
      {
        title: "Radar Cross Section (RCS) Definition",
        formula: "σ = lim(r → ∞) 4π r^2 |E_s|^2 / |E_inc|^2",
        explanation: "Calculates the effective radar reflection area in square meters (converted to dBsm), comparing how much power reflects back to the receiver versus how much was originally transmitted."
      }
    ],
    techStack: ["C++20", "OpenMP", "Linear Algebra", "CMake", "Catch2"]
  },

  libxtm: {
    slug: "libxtm",
    name: "libxtm",
    icon: "/icons/libxtm.svg",
    tagline: "Extreme Terrain Elevation Compression for Real-Time Geospatial Streaming",
    repo: "https://github.com/yashwk/libxtm",
    blogSlug: "terrain-compression-in-libxtm",
    tags: ["Data Compression", "Terrain Elevation", "SIMD", "Geospatial", "C/C++"],
    metrics: {
      "Compression Ratio": "8:1 to 12:1",
      "Tile Decode Latency": "<0.2 ms / 64×64 tile",
      "Memory Allocation": "Zero-Alloc Inner Loop",
      "Spatial Partitioning": "Hierarchical Quadtree LOD"
    },
    plainEnglishSummary: [
      "libxtm is a high-speed compression library built specifically for 3D digital elevation models (DEM) and planetary terrain maps.",
      "Flight simulators, satellite mapping tools, and geospatial applications need to render vast, real-world mountain ranges and landscapes spanning hundreds of kilometers. But raw elevation grids are gigantic—easily consuming tens of gigabytes of storage and saturating memory bandwidth. libxtm shrinks 3D terrain elevation by up to 12× and decompresses chunks on-the-fly in less than 0.2 milliseconds, streaming high-resolution landscapes smoothly without lagging the simulator."
    ],
    theProblem: {
      lead: "Why can't you just use standard compression formats like ZIP, PNG, or WebP?",
      points: [
        {
          title: "1. The Real-Time Decompression Latency Bottleneck",
          desc: "General-purpose compression tools (like zlib, gzip, or 7-Zip) are designed for documents and archives. Decompressing a terrain chunk with gzip takes 5 to 20 milliseconds and triggers dynamic memory allocations on the heap. In a 60 or 120 FPS flight simulator, a 15-millisecond pause causes noticeable stutter ('micro-stutter')."
        },
        {
          title: "2. Memory Bandwidth & Cache Thrashing",
          desc: "Streaming uncompressed 32-bit floating-point elevation grids at supersonic flight speeds saturates the CPU-to-GPU memory bus. Flight engines need a specialized format that is both compact in memory and can be unpacked directly into GPU vertex buffers without temporary memory allocations."
        }
      ]
    },
    howItWorks: [
      {
        step: "01",
        title: "Spatial Quadtree Partitioning",
        description: "Divides massive global elevation rasters into self-contained 64×64 or 128×128 spatial tiles across multi-resolution Level-of-Detail (LOD) pyramids."
      },
      {
        step: "02",
        title: "2D Median Edge Prediction (MED)",
        description: "Scans each terrain tile and predicts each height sample based on its top, left, and diagonal neighbors, exploiting the natural spatial continuity of real-world landscapes."
      },
      {
        step: "03",
        title: "Residual Delta Calculation",
        description: "Subtracts predicted heights from actual heights. Instead of storing large elevation numbers (e.g. 4,250 meters), it only needs to store tiny difference numbers (e.g. +1.5 meters)."
      },
      {
        step: "04",
        title: "ZigZag & Variable-Byte Bit Packing",
        description: "Maps signed deltas to compact unsigned integers and packs them into dense bitstreams, achieving 8:1 to 12:1 compression ratios."
      },
      {
        step: "05",
        title: "Zero-Allocation SIMD Decompression",
        description: "When the camera approaches a tile, vectorized AVX2/NEON instructions unpack the tile in under 0.2 milliseconds directly into caller-provided GPU vertex memory."
      }
    ],
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
        title: "Hierarchical Quadtree Level-of-Detail",
        desc: "Chunk-level random access enables flight simulators to stream high-density elevation tiles near the vehicle while retaining low-density tiles at the horizon."
      },
      {
        title: "2D Predictive Residual Filter",
        desc: "Analyzes spatial correlation between adjacent elevation samples using Median Edge Prediction (MED) to reduce sample entropy before bit packing."
      },
      {
        title: "Zero-Allocation Inner Loop",
        desc: "Decompresses directly into GPU vertex buffer objects (VBO) or caller-provided memory buffers with zero temporary heap allocations, preventing memory fragmentation."
      },
      {
        title: "SIMD Vectorized Decoding (AVX2 & NEON)",
        desc: "AVX2/NEON vectorized byte unpacking decodes a 64×64 elevation tile in less than 200 microseconds, easily sustaining 120 FPS flight dynamics loops."
      }
    ],
    mathematicalFoundations: [
      {
        title: "Median Edge Predictor (MED) Filter",
        formula: "e_pred = min(L, T) if C ≥ max(L, T); max(L, T) if C ≤ min(L, T); L + T - C otherwise",
        explanation: "Predicts the height of the current terrain point based on its Left (L), Top (T), and Corner (C) neighbors, detecting whether the landscape is sloping or flat."
      },
      {
        title: "Residual Delta Difference",
        formula: "Δ(x, y) = Elevation(x, y) - e_pred(x, y)",
        explanation: "Calculates the small difference between actual elevation and predicted elevation. Most deltas are close to zero, which makes them dramatically easier to compress."
      },
      {
        title: "ZigZag Variable-Byte Mapping",
        formula: "z = (2Δ) if Δ ≥ 0; (-2Δ - 1) if Δ < 0",
        explanation: "Maps positive and negative signed differences into small positive integers so that negative elevation changes don't waste 32 bits of sign data."
      },
      {
        title: "Configurable Lossless & Lossy Modes",
        formula: "Δ_quant = round(Δ / tolerance)",
        explanation: "Allows the user to choose exact bit-for-bit lossless reproduction or lossy quantization within a fixed vertical tolerance (e.g. ±0.5 meters) for even higher compression ratios."
      }
    ],
    techStack: ["C99 / C++20", "SIMD (AVX2/NEON)", "CMake", "Google Benchmark"]
  }
};
