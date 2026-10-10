---
name: "libxtm"
tagline: "Geospatial terrain compression library & CLI with random-access ROI decoding"
icon: "/icons/libxtm.svg"
repo: "https://github.com/yashwk/libxtm"
blogSlug: "terrain-compression-in-libxtm"
tags: ["Geospatial Compression", "C++20", "GDAL", "Quadtree", "Python / nanobind", "Terrain Elevation"]
---

**libxtm** is a specialized C++20 geospatial compression library and command-line utility for digital elevation models (DEMs) and terrain data. It provides a custom `.xtm` container format designed for high compression ratios and random-access Region-of-Interest (ROI) decoding.

High-resolution planetary elevation datasets (such as 30-meter SRTM or 1-meter LiDAR GeoTIFFs) easily consume tens of gigabytes of disk and memory. Generic file compressors like ZIP, gzip, or PNG treat elevation data like flat text or 2D photos: they don't understand topographical gradients, they require uncompressing the entire file to read a small patch, and they cause noticeable stutter in real-time simulators. libxtm was designed specifically to solve this.

## Why I Built It

In aerospace simulations and real-time GIS viewers, an aircraft flying through a mountain range only needs to render the terrain within its local visual frustum or radar horizon. If your terrain data is stored in standard compressed formats, you have to decode gigabytes of surrounding data just to extract a 10 km mountain ridge.

I built `libxtm` around two core ideas:

1. **Adaptive Predictive Coding:** Topographical terrain is spatially continuous. Ground height changes gradually, meaning adjacent elevation samples are strongly correlated. By predicting heights and storing only the small residual error, terrain compresses dramatically.
2. **True Random-Access Decoding:** The `.xtm` format indexes terrain blocks hierarchically, allowing applications to decompress an arbitrary bounding box `[x, y, w, h]` directly from disk without touching the rest of the dataset.

## Core Capabilities

### 1. 6 Adaptive Deterministic Predictors

Terrain varies dramatically: plains are smooth, valleys have directional gradients, and jagged cliffs have sharp discontinuities. Instead of using a one-size-fits-all formula, libxtm evaluates six distinct predictor models per block:

- **Left:** Simple 1D horizontal difference (fastest for flat basins).
- **Gradient:** 2D slope projection using left, top, and diagonal samples.
- **JPEG-LS:** Median edge detection filter designed for sharp terrain ridges.
- **GAP:** Generalized Adaptive Prediction with directional edge thresholds.
- **Polynomial:** 2nd-order surface fitting for rolling hills.
- **Least Squares:** Adaptive optimal weighting across local neighborhood windows.

An internal rate-distortion cost estimator automatically selects whichever predictor produces the lowest entropy for each block. An optional CDF 5/3 integer wavelet pipeline is also supported for multi-resolution encoding.

### 2. Hierarchical Quadtree Partitioning

libxtm slices large elevation grids into superblocks and hierarchically subdivides them from 512×512 down to 64×64 blocks based on local terrain variance. Flat ocean or desert tiles stay at 512×512, while jagged mountain ranges divide down to 64×64 for localized predictor tuning.

### 3. Split-Precision Quantization

libxtm is an error-bounded codec: elevations are quantized to fixed-point integers where every sample round-trips within `± scale / 2` units. To maximize compression, sub-meter scales (such as centimeter precision with `--scale 0.01`) split elevation data into independent integer-meter and fractional-precision planes, keeping base elevation blocks compact.

### 4. Geospatial GDAL Integration & ROI Decoding

The library integrates directly with GDAL, preserving full geotransforms, spatial extents, and WKT projection metadata. Applications can stream a bounding region directly:

```cpp
#include <xtm/Api.hpp>

// Compress a GeoTIFF with centimeter precision
xtm::api::encode_file("grand_canyon.tif", "canyon.xtm", {0.01});

// Decompress ONLY a 512x512 bounding box without uncompressing the full map
xtm::api::decode_file("canyon.xtm", "roi.tif", {128, 128, 512, 512, 0});
```

### 5. Native CLI Suite (`xtm`) & Python Bindings

The compiled `xtm` executable provides a complete toolkit for geospatial engineers:

- `xtm analyze`: Evaluates terrain statistics, roughness metrics, and predictor effectiveness across an input raster.
- `xtm encode`: Compresses GeoTIFFs into `.xtm` format with configurable precision and thread counts.
- `xtm decode`: Decompresses `.xtm` files, with optional `--region x y w h` bounding boxes.
- `xtm info`: Reads container headers and block indexes in microseconds without decoding payloads.
- `xtm verify`: Runs pixel-exact round-trip verification against original source data.

Full Python bindings (built with nanobind with the GIL released) allow seamless integration into geospatial analysis pipelines:

```python
import xtm

# Encode raster with centimeter precision
result = xtm.encode("grand_canyon.tif", "gc.xtm", precision=0.01)
print(f"Compressed {result.total_blocks} blocks to {result.output_bytes:,} bytes")

# Extract Region of Interest bounding box
xtm.decode("gc.xtm", "gc_roi.tif", region=(0, 0, 512, 512))
```
