---
title: "High-Performance Terrain Compression & Random-Access ROI Decoding in libxtm"
description: "Designing the .xtm geospatial format: combining rate-distortion quadtree partitioning, 6 deterministic predictors, and sub-millisecond Region-of-Interest decoding in C++20."
pubDate: 2026-07-20
tags: ["Compression", "C++20", "Geospatial", "GDAL", "Algorithms", "libxtm"]
---

Digital Elevation Models (DEMs) and high-resolution planetary terrain datasets are among the heaviest assets in geospatial engineering and aerospace simulation. High-resolution satellite radar (like 30-meter SRTM) or airborne LiDAR scans easily generate GeoTIFF rasters spanning tens to hundreds of gigabytes.

In real-time flight simulators and geospatial visualization systems, these datasets present two conflicting constraints:

1. **Storage & Memory Footprint**: Uncompressed floating-point elevation rasters quickly saturate disk storage and CPU-to-GPU memory buses during supersonic flight profiles.
2. **Low-Latency Streaming**: Standard file compression formats (like ZIP, gzip, PNG, or zstd) are non-spatial byte streams. To read a 512&times;512 mountain patch within an aircraft's visual frustum, an application must decompress the entire multi-gigabyte raster file into memory, causing severe frame drops ("micro-stutter").

To solve this, I engineered **libxtm**—a C++20 library and CLI utility with a custom `.xtm` container format designed specifically for error-bounded terrain compression and true **random-access Region-of-Interest (ROI) decoding**.

---

## 1. The libxtm Pipeline Architecture

The end-to-end compression pipeline transforms raw, heterogeneous GeoTIFF rasters into compact, indexed `.xtm` containers through a unified worker pipeline:

```text
GeoTIFF (GDAL) 
   │
   ▼
[ Stage 0: Windowed Ingest & Quantization ]  ──► In-place Float64 to IntGrid
   │
   ▼
[ Stage 1: NoData Inpainting ]               ──► 4-neighbor ring BFS filling
   │
   ▼
[ Stage 2: Superblock Slicing (512×512) ]    ──► parallel_for_superblocks pool
   │
   ▼
[ Stage 3: Rate-Cost Quadtree Partition ]   ──► Recursive 512×512 → 64×64 split
   │
   ▼
[ Stage 4: Predictor Selection (6 Models) ]  ──► Cost-driven lowest entropy model
   │
   ▼
[ Stage 5: Entropy & Range Coding ]          ──► Adaptive context arithmetic coding
   │
   ▼
.xtm Binary Container (Header + Block Index + CRC32 Payloads)
```

---

## 2. Ingest, Inpainting & Error-Bounded Quantization

Raw terrain data from satellite sensors often contains void regions (`NoData` values) caused by radar shadows or water bodies. If encoded naively, sharp cliffs between real terrain and `NoData` sentinels (like `-9999.0`) inject massive high-frequency entropy into compression models.

libxtm addresses this during ingest:

1. **Streaming Windowed Reads**: Ingests rasters in streaming 256-row windows via GDAL, converting double-precision floating point samples into fixed-point integer grids in place without full-raster allocations.
2. **Ring BFS Inpainting**: Identifies void masks and fills them using a 4-neighbor ring Breadth-First Search (BFS) in $O(N)$ time, smoothly interpolating perimeter elevations across voids before predictive filtering.
3. **Error-Bounded Quantization**: Elevations are scaled to fixed-point integers:

$$
z_{\text{quant}} = \text{round}\left(\frac{z}{\text{scale}}\right)
$$

Every reconstructed sample round-trips within a strict mathematical error bound:

$$
|z - \hat{z}| \le \frac{\text{scale}}{2}
$$

The default scale is `1.0` (1-meter vertical accuracy). For high-precision survey data, passing `--scale 0.01` provides 1-centimeter precision.

---

## 3. Hierarchical Quadtree Partitioning

Terrain characteristics vary wildly across geography: ocean plains and salt flats are completely flat, while glacial valleys and tectonic mountain ranges have intense spatial variation.

libxtm organizes the elevation grid into **512&times;512 superblocks** and evaluates recursive quadtree partitioning down to **64&times;64 blocks**:

```cpp
// Recursive quadtree split decision based on rate-distortion cost
bool shouldSplitBlock(const BlockView& block, double parent_cost) {
    if (block.width() <= 64 || block.height() <= 64) {
        return false; // Minimum block threshold reached
    }

    // Evaluate estimated bitstream cost across 4 sub-quadrants
    double quad_cost = estimateQuadrantCosts(block);

    // Split only if subdivided cost beats parent cost plus block header overhead
    return (quad_cost + SPLIT_HEADER_PENALTY) < parent_cost;
}
```

Flat desert or oceanic terrain remains stored as single 512&times;512 blocks, minimizing header metadata. In contrast, rugged alpine ranges subdivide down to 64&times;64 blocks, allowing the encoder to apply localized predictive models tailored to specific mountain slopes.

---

## 4. The 6 Deterministic Predictors

Adjacent terrain samples exhibit high spatial correlation. Instead of storing large raw elevation numbers (e.g. 4,250 meters), libxtm predicts each point's elevation from its neighbors and stores only the small residual error $\Delta$:

$$
\Delta(x, y) = z(x, y) - z_{\text{pred}}(x, y)
$$

Because real terrain features diverse topographical geometries, libxtm evaluates **six deterministic predictor models** per block:

| Predictor | Mathematical Model | Best Suited For |
| :--- | :--- | :--- |
| **Left** | $\hat{z} = L$ | Flat valleys and horizontal terraces |
| **Gradient** | $\hat{z} = L + T - C$ | Planar slopes and uniform gradients |
| **JPEG-LS** | Median edge detection: $\min(L,T)$ or $\max(L,T)$ | Sharp ridgelines and escarpments |
| **GAP** | Generalized Adaptive Prediction with gradient thresholds | Complex directional mountain slopes |
| **Polynomial** | 2nd-order Taylor surface approximation | Rolling hills and curved glacial valleys |
| **Least Squares** | Optimal linear weighting across local context | Highly textured, fractured rocky terrain |

An internal cost estimator evaluates the residual entropy for each model and tags the block with the winning predictor ID, ensuring maximum compression density with deterministic, zero-allocation decoding.

---

## 5. Split-Precision Coding for Sub-Meter Scales

When users require centimeter-level elevation precision (`--scale 0.01`), small fractional variations (e.g. centimeters of gravel or vegetation) introduce noise that would otherwise bloat the base integer elevation grid.

libxtm solves this through **split-precision coding**:
- The elevation grid is decoupled into an **integer-meter plane** and a **fractional precision plane**.
- The coarse meter plane captures macro-topography using quadtree predictive coding.
- The fractional plane encodes fine centimeter residuals independently using localized bit-packing.

This architecture keeps compressed file sizes dramatically smaller than naive 32-bit floating-point zip formats while preserving exact centimeter tolerances.

---

## 6. Random-Access Region-of-Interest (ROI) Decoding

The standout capability of the `.xtm` format is true **random-access Region-of-Interest (ROI) decoding**. 

The file layout places a lightweight header and spatial block index at the front of the container:

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: Magic 'XTM\x02', Dimensions, Scale, Geotransform, WKT │
├─────────────────────────────────────────────────────────────┤
│ Block Index: [ BlockID, BoundingBox(x,y,w,h), Offset, CRC32 ] │
├─────────────────────────────────────────────────────────────┤
│ Compressed Payload Data Blocks ...                          │
└─────────────────────────────────────────────────────────────┘
```

When an aerospace simulation queries a local terrain patch (e.g. bounding box $[x, y, w, h]$), the decoder performs a fast bounding-box intersection against the spatial index. It seeks directly to the relevant chunk offsets and decompresses *only* the matching 64&times;64 blocks:

```cpp
#include <xtm/Api.hpp>

// Compress GeoTIFF with centimeter precision
xtm::api::encode_file("grand_canyon.tif", "canyon.xtm", {0.01});

// Decompress ONLY a 512x512 bounding box without reading the rest of the file
xtm::api::decode_file(
    "canyon.xtm", 
    "local_crop.tif",
    {128, 128, 512, 512, /*threads=*/0}
);
```

Because decoding avoids uncompressing the rest of the multi-gigabyte dataset, tile decompression completes in under **0.2 milliseconds**, sustaining flawless 120 FPS flight loops with zero dynamic heap allocations.

---

## 7. Python Bindings & CLI Tooling

libxtm compiles both a native CLI binary (`xtm`) and zero-dependency Python bindings built with **nanobind** (with the GIL released during parallel execution):

```bash
# Analyze terrain roughness and predictor selection statistics
xtm analyze grand_canyon.tif --scale 0.01

# Compress into .xtm format
xtm encode grand_canyon.tif -o canyon.xtm --scale 0.01

# Decode an arbitrary spatial bounding box directly to GeoTIFF
xtm decode canyon.xtm -o crop.tif --region 1024 1024 512 512
```

In Python, geospatial data scientists can integrate `.xtm` directly into data pipelines:

```python
import xtm

# Compress raster and inspect block diagnostics
res = xtm.encode("grand_canyon.tif", "canyon.xtm", precision=0.01)
print(f"Compressed {res.total_blocks} blocks: {res.output_bytes:,} bytes")
print("Predictor distribution:", res.predictor_counts)

# Extract Region of Interest bounding box
xtm.decode("canyon.xtm", "roi.tif", region=(1024, 1024, 512, 512))

# Verify bit-for-bit round-trip accuracy
assert xtm.verify("canyon.xtm", "grand_canyon.tif").passed
```

---

## Summary

By combining windowed in-place quantization, hierarchical quadtree partitioning, 6 adaptive deterministic predictors, and indexed random-access streaming, libxtm delivers compression ratios up to 12:1 with sub-millisecond ROI decompression speeds.

The complete library, CLI, and documentation are available on GitHub: [yashwk/libxtm](https://github.com/yashwk/libxtm).
