export interface ProjectDetail {
  slug: string;
  name: string;
  icon: string;
  tagline: string;
  repo: string;
  blogSlug?: string;
  tags: string[];
  content: string;
}

export const projectsDetail: Record<string, ProjectDetail> = {
  strikeengine: {
    slug: "strikeengine",
    name: "StrikeEngine",
    icon: "/icons/strikeengine.svg",
    tagline: "Data-oriented C++23 aerospace simulation engine & GNC framework",
    repo: "https://github.com/yashwk/StrikeEngine",
    blogSlug: "aerospace-simulation-architecture-strikeengine",
    tags: ["C++23", "Aerospace Simulation", "Vulkan 1.3", "GNC", "Slang Shaders", "Python / PyTorch"],
    content: `
<p>
  <strong>StrikeEngine</strong> is a data-oriented C++23 aerospace simulation engine and Guidance, Navigation, and Control (GNC) framework. I built it for simulating high-speed 6-DOF (six degrees of freedom) missile flyouts, air-to-air Beyond-Visual-Range (BVR) engagements, surface-to-air interceptors (SAMs), and large-scale Monte Carlo dispersion studies.
</p>
<p>
  Most game physics engines treat rigid bodies like bouncing boxes at 60 FPS, which quickly breaks down in aerospace dynamics. StrikeEngine takes a systems-first, data-oriented approach: it enforces a strict 1&nbsp;ms physical truth gate (1&nbsp;kHz Runge-Kutta 4th order integration), runs across a rotating WGS84 ellipsoidal Earth, and scales seamlessly from single-threaded CPU execution (>70,000 steps/sec) to massively parallel Vulkan 1.3 GPU compute with verified sub-10&nbsp;cm direct kinetic intercept accuracy.
</p>

<h2>Why I Built It</h2>
<p>
  High-fidelity aerospace simulations usually fall into two extremes: slow, monolithic legacy Fortran/MATLAB codebases that are impossible to embed into modern software, or oversimplified game physics engines that lack realistic atmospheric models, seeker tracking, or actuator dynamics.
</p>
<p>
  I wanted an engine that combined mathematical rigor with modern systems programming: contiguous Structure-of-Arrays (SoA) memory layouts, zero heap allocations in the inner physics loop, full environmental modeling, and modern hardware acceleration through GPU compute shaders and Python reinforcement learning environments.
</p>

<h2>Core Capabilities</h2>

<h3>1. 6-DOF Physical Dynamics & Truth Integration</h3>
<ul>
  <li><strong>1 ms Integration Gate:</strong> Synchronous Runge-Kutta 4th order (RK4) integration maintaining strict 1 kHz physical truth (<em>dt</em> = 0.001 s).</li>
  <li><strong>WGS84 ECEF Rotating Earth:</strong> Full ellipsoidal coordinates, Coriolis accelerations, centrifugal forces, and spherical/J2 gravitational harmonics.</li>
  <li><strong>Atmosphere & Aerodynamics:</strong> 1976 US Standard Atmosphere, supersonic conical shock wave drag (Taylor-Maccoll), transonic compressibility, and high-AoA Polhamus vortex lift breakdown.</li>
  <li><strong>Solid Rocket Motors & Staging:</strong> Multi-stage staging sequences, multi-pulse re-ignition, ramjets, and 6 internal ballistics grain geometries (end-burning, cylindrical, star, slotted, tubular, conoïdal).</li>
</ul>

<h3>2. Guidance, Navigation & Control (GNC)</h3>
<ul>
  <li><strong>Coupled 3-Loop Autopilot:</strong> Dynamic pressure gain-scheduling, integral trim anti-windup, and 2nd-order fin actuator dynamics with physical rate limits.</li>
  <li><strong>RF Monopulse & SARH Seekers:</strong> Monopulse error slope angle extraction, semi-active radar homing illuminator tracking, Beer-Lambert IR extinction, and band-resolved atmospheric attenuation (ITU-R P.676-12).</li>
  <li><strong>Multi-Target Tracking & Gating:</strong> Normalized innovation gating (&chi;<sup>2</sup>), track management, threat scoring, and datalink coordination.</li>
  <li><strong>Modern Guidance Laws:</strong> True Proportional Navigation (TPN), Augmented Proportional Navigation (APN), Impact Angle Control Guidance (IACG), and Impact Time Control Guidance (ITCG).</li>
</ul>

<h3>3. Vulkan 1.3 GPU Compute Pipeline</h3>
<p>
  For large-scale Monte Carlo dispersion runs, StrikeEngine includes a companion GPU compute backend written in the Slang shader language. The entire 6-DOF pipeline—equations of motion, aerodynamics, motor thrust curves, and autopilot—is vectorized and dispatched directly to Vulkan compute queues.
</p>
<p>
  A double-buffered asynchronous pipeline overlaps GPU compute dispatch with host telemetry staging and event extraction, doubling throughput while maintaining bit-accurate parity with CPU truth states.
</p>

<h3>4. Native CLI Suite & Live Cockpit (<code>strike</code>)</h3>
<p>
  StrikeEngine includes a standalone CLI utility called <code>strike</code> with several built-in subcommands:
</p>
<ul>
  <li><code>strike monitor</code>: Launches a real-time, zero-flicker terminal dashboard featuring a live vertical ASCII trajectory plot, G-load gauge, and instantaneous 6-DOF kinematics.</li>
  <li><code>strike run</code>: Executes flyouts with tabular summaries or high-frequency CSV telemetry exports.</li>
  <li><code>strike montecarlo</code>: Runs multi-threaded stochastic dispersion studies across swept parameters (mass, wind, burn rate) and computes CEP-50 and R-95 circular error metrics.</li>
  <li><code>strike bench</code>: Runs comparative CPU vs. Vulkan GPU compute throughput benchmarks.</li>
</ul>

<pre><code class="language-bash"># Launch the live terminal telemetry cockpit
strike monitor data/scenarios/cooperative_bvr_80km_astra.scenario.json --realtime

# Run 100-run stochastic Monte Carlo dispersion analysis
strike montecarlo data/scenarios/cooperative_bvr_80km_astra.scenario.json \\
  --runs 100 --threads 8 --sweep mass:165:185</code></pre>

<h3>5. Python SDK & Reinforcement Learning</h3>
<p>
  StrikeEngine provides native Python bindings with zero-copy buffer views (<code>memoryview</code>, NumPy, PyTorch, JAX) into engine truth memory, plus an out-of-the-box Gymnasium environment (<code>StrikeEnv</code>) for training missile guidance and evasive autopilots using reinforcement learning with Stable-Baselines3.
</p>

<pre><code class="language-python">import strikeengine as se

# Run high-fidelity 6-DOF flyout with 1 line of Python
result = se.run("data/scenarios/cooperative_bvr_80km_astra.scenario.json")
print(f"Passed: {result.passed}, Miss: {result.miss_distance_m:.2f} m, Kill: {result.killed_target}")
print(f"Throughput: {result.steps_per_second:,.0f} steps/sec ({result.real_time_multiplier:.0f}x real-time)")</code></pre>

<h2>Real-World Scenarios</h2>
<p>
  The repository bundles realistic engagement scenarios in <code>data/scenarios/</code>:
</p>
<ul>
  <li><strong>Cooperative BVR 80 km:</strong> Head-on air combat engagement where an LCA Tejas launches an Astra MK2 missile with datalink handoff against a maneuverable Su-30 Flanker target.</li>
  <li><strong>S-400 vs AWACS at 314 km:</strong> Long-range surface-to-air lofted trajectory profile against a high-value airborne early warning aircraft.</li>
  <li><strong>VLS Vertical Launch:</strong> Turnover maneuver from vertical canister launch into horizontal aerodynamic flight and terminal intercept.</li>
</ul>
`
  },

  strikecem: {
    slug: "strikecem",
    name: "StrikeCEM",
    icon: "/icons/strikecem.svg",
    tagline: "High-frequency Radar Cross Section (RCS) database generator for StrikeEngine",
    repo: "https://github.com/yashwk/StrikeCEM",
    blogSlug: "physical-optics-radar-cross-section",
    tags: ["Computational Electromagnetics", "Physical Optics", "CUDA", "C++20", "HDF5", "Radar Cross Section"],
    content: `
<p>
  <strong>StrikeCEM</strong> is a high-frequency computational electromagnetics (CEM) solver and Radar Cross Section (RCS) database generator. I built it specifically as the companion radar signature generator for <strong>StrikeEngine</strong>'s RF seekers.
</p>
<p>
  In real-world air combat simulations, a missile's radar seeker needs to know exactly how much radar energy reflects off target aircraft at any aspect angle and polarization. Solving full-wave Maxwell equations (like FDTD or Method of Moments) in real time inside a 1&nbsp;kHz flight loop is computationally impossible. StrikeCEM solves this by pre-computing high-density radar signature databases offline from 3D surface meshes and saving them into robust HDF5 databases that StrikeEngine queries during flight.
</p>

<h2>Why I Built It</h2>
<p>
  Commercial radar simulation software (like ANSYS HFSS or FEKO) is proprietary, expensive, and difficult to automate in headless CI/CD pipelines. Furthermore, simple spherical or point-mass radar approximations used in amateur flight games fail to capture how stealth shaping works—such as how facet angling deflects radar away or how wing leading edges produce strong specular glints.
</p>
<p>
  I designed StrikeCEM as a dedicated, scriptable C++20/CUDA utility that reads standard 3D CAD meshes, validates their geometry, runs high-frequency asymptotic Physical Optics sweeps, and exports validated HDF5 databases with cryptographic chunk checksums.
</p>

<h2>Core Capabilities</h2>

<h3>1. Physical Optics (PO) High-Frequency Solver</h3>
<ul>
  <li><strong>Planar Triangular Facet Evaluation:</strong> Evaluates monostatic plane-wave scattering from Perfect Electric Conductor (PEC) surface meshes on CPU (multi-threaded) or CUDA GPU.</li>
  <li><strong>Full Polarization Channels:</strong> Computes copolar and cross-polar scattering across HH, VV, HV, VH, RHCP, and LHCP channels.</li>
  <li><strong>PTD Fringe Edge Correction:</strong> Implements Physical Theory of Diffraction (PTD) fringe wave calculations to correct for edge diffraction where pure Physical Optics underestimates reflection.</li>
  <li><strong>Multi-Bounce Geometric Shadowing:</strong> Traces up to 3 geometric-optics bounces to account for self-shadowing and corner-reflector cavity returns.</li>
</ul>

<h3>2. Mesh Ingestion & Quality Validation</h3>
<p>
  StrikeCEM directly ingests ASCII and binary STL and OBJ meshes in meters, millimeters, or inches. The pre-flight pipeline checks normal orientation, reports mesh quality, strips degenerate or zero-area triangles, and caches normalized geometries to disk.
</p>

<h3>3. HDF5 Database Generation with Resume Support</h3>
<p>
  Computing full 360&deg; sweeps with fine angular resolution (0.5&deg; steps in azimuth and elevation) across multiple radar frequencies requires evaluating millions of facet samples. StrikeCEM writes output directly into structured HDF5 databases (or CSV with JSON sidecars) featuring:
</p>
<ul>
  <li><strong>Provenance Metadata:</strong> Stores exact solver commit hash, mesh checksums, frequency list, and polarizations.</li>
  <li><strong>Cryptographic Chunk Checksums:</strong> Protects output integrity across disk writes.</li>
  <li><strong>Interrupted Run Resume:</strong> Allows missing output chunks to be resumed without re-evaluating the entire sweep from scratch.</li>
</ul>

<h3>4. The <code>strikecem</code> CLI Utility</h3>
<p>
  The engine is driven by a clean command-line interface with a strict JSON configuration contract:
</p>

<pre><code class="language-bash"># Preflight check: validate configuration and mesh topology
strikecem validate configs/fighter_sweep.json

# Estimate solve time and memory footprint before launching
strikecem estimate configs/fighter_sweep.json

# Execute Physical Optics sweep on CPU or CUDA GPU
strikecem run configs/fighter_sweep.json --output rcs_database.h5</code></pre>

<h2>How StrikeEngine Consumes It</h2>
<p>
  StrikeCEM includes a validated C++ HDF5 reader that StrikeEngine links against. When an Astra or SAM missile's active radar seeker illuminates an aircraft during simulation, StrikeEngine performs a fast, zero-copy bilinear lookup into the HDF5 database based on the instantaneous aspect angle (azimuth and elevation) and radar frequency, providing realistic radar cross section returns in decibels per square meter (dBsm) at zero runtime overhead.
</p>
`
  },

  libxtm: {
    slug: "libxtm",
    name: "libxtm",
    icon: "/icons/libxtm.svg",
    tagline: "Geospatial terrain compression library & CLI with random-access ROI decoding",
    repo: "https://github.com/yashwk/libxtm",
    blogSlug: "terrain-compression-in-libxtm",
    tags: ["Geospatial Compression", "C++20", "GDAL", "Quadtree", "Python / nanobind", "Terrain Elevation"],
    content: `
<p>
  <strong>libxtm</strong> is a specialized C++20 geospatial compression library and command-line utility for digital elevation models (DEMs) and terrain data. It provides a custom <code>.xtm</code> container format designed for high compression ratios and random-access Region-of-Interest (ROI) decoding.
</p>
<p>
  High-resolution planetary elevation datasets (such as 30-meter SRTM or 1-meter LiDAR GeoTIFFs) easily consume tens of gigabytes of disk and memory. Generic file compressors like ZIP, gzip, or PNG treat elevation data like flat text or 2D photos: they don't understand topographical gradients, they require uncompressing the entire file to read a small patch, and they cause noticeable stutter in real-time simulators. libxtm was designed specifically to solve this.
</p>

<h2>Why I Built It</h2>
<p>
  In aerospace simulations and real-time GIS viewers, an aircraft flying through a mountain range only needs to render the terrain within its local visual frustum or radar horizon. If your terrain data is stored in standard compressed formats, you have to decode gigabytes of surrounding data just to extract a 10&nbsp;km mountain ridge.
</p>
<p>
  I built <code>libxtm</code> around two core ideas:
</p>
<ol>
  <li><strong>Adaptive Predictive Coding:</strong> Topographical terrain is spatially continuous. Ground height changes gradually, meaning adjacent elevation samples are strongly correlated. By predicting heights and storing only the small residual error, terrain compresses dramatically.</li>
  <li><strong>True Random-Access Decoding:</strong> The <code>.xtm</code> format indexes terrain blocks hierarchically, allowing applications to decompress an arbitrary bounding box <code>[x, y, w, h]</code> directly from disk without touching the rest of the dataset.</li>
</ol>

<h2>Core Capabilities</h2>

<h3>1. 6 Adaptive Deterministic Predictors</h3>
<p>
  Terrain varies dramatically: plains are smooth, valleys have directional gradients, and jagged cliffs have sharp discontinuities. Instead of using a one-size-fits-all formula, libxtm evaluates six distinct predictor models per block:
</p>
<ul>
  <li><strong>Left:</strong> Simple 1D horizontal difference (fastest for flat basins).</li>
  <li><strong>Gradient:</strong> 2D slope projection using left, top, and diagonal samples.</li>
  <li><strong>JPEG-LS:</strong> Median edge detection filter designed for sharp terrain ridges.</li>
  <li><strong>GAP:</strong> Generalized Adaptive Prediction with directional edge thresholds.</li>
  <li><strong>Polynomial:</strong> 2nd-order surface fitting for rolling hills.</li>
  <li><strong>Least Squares:</strong> Adaptive optimal weighting across local neighborhood windows.</li>
</ul>
<p>
  An internal rate-distortion cost estimator automatically selects whichever predictor produces the lowest entropy for each block. An optional CDF 5/3 integer wavelet pipeline is also supported for multi-resolution encoding.
</p>

<h3>2. Hierarchical Quadtree Partitioning</h3>
<p>
  libxtm slices large elevation grids into superblocks and hierarchically subdivides them from 512&times;512 down to 64&times;64 blocks based on local terrain variance. Flat ocean or desert tiles stay at 512&times;512, while jagged mountain ranges divide down to 64&times;64 for localized predictor tuning.
</p>

<h3>3. Split-Precision Quantization</h3>
<p>
  libxtm is an error-bounded codec: elevations are quantized to fixed-point integers where every sample round-trips within <code>&plusmn; scale / 2</code> units. To maximize compression, sub-meter scales (such as centimeter precision with <code>--scale 0.01</code>) split elevation data into independent integer-meter and fractional-precision planes, keeping base elevation blocks compact.
</p>

<h3>4. Geospatial GDAL Integration & ROI Decoding</h3>
<p>
  The library integrates directly with GDAL, preserving full geotransforms, spatial extents, and WKT projection metadata. Applications can stream a bounding region directly:
</p>

<pre><code class="language-cpp">#include &lt;xtm/Api.hpp&gt;

// Compress a GeoTIFF with centimeter precision
xtm::api::encode_file("grand_canyon.tif", "canyon.xtm", {0.01});

// Decompress ONLY a 512x512 bounding box without uncompressing the full map
xtm::api::decode_file("canyon.xtm", "roi.tif", {128, 128, 512, 512, 0});</code></pre>

<h3>5. Native CLI Suite (<code>xtm</code>) & Python Bindings</h3>
<p>
  The compiled <code>xtm</code> executable provides a complete toolkit for geospatial engineers:
</p>
<ul>
  <li><code>xtm analyze</code>: Evaluates terrain statistics, roughness metrics, and predictor effectiveness across an input raster.</li>
  <li><code>xtm encode</code>: Compresses GeoTIFFs into <code>.xtm</code> format with configurable precision and thread counts.</li>
  <li><code>xtm decode</code>: Decompresses <code>.xtm</code> files, with optional <code>--region x y w h</code> bounding boxes.</li>
  <li><code>xtm info</code>: Reads container headers and block indexes in microseconds without decoding payloads.</li>
  <li><code>xtm verify</code>: Runs pixel-exact round-trip verification against original source data.</li>
</ul>

<p>
  Full Python bindings (built with nanobind with the GIL released) allow seamless integration into geospatial analysis pipelines:
</p>

<pre><code class="language-python">import xtm

# Encode raster with centimeter precision
result = xtm.encode("grand_canyon.tif", "gc.xtm", precision=0.01)
print(f"Compressed {result.total_blocks} blocks to {result.output_bytes:,} bytes")

# Extract Region of Interest bounding box
xtm.decode("gc.xtm", "gc_roi.tif", region=(0, 0, 512, 512))</code></pre>
`
  }
};
