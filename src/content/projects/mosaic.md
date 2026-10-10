---
name: "Mosaic"
tagline: "Local-first LLM inference engine running 35B MoE on 8 GB VRAM"
description: "A lean inference engine and CLI running the Qwen3.6-35B MoE model on consumer 8 GB GPUs via tiered mmap streaming, C++ AVX2 expert execution, and GPU LRU caching."
icon: "/icons/mosaic.svg"
repo: "https://github.com/yashwk/mosaic"
tags: ["Machine Learning", "LLM Inference", "C++", "Python", "AVX2", "CUDA"]
order: 4
---

**Mosaic** is a local-first inference engine and interactive chat CLI designed to run large Mixture-of-Experts (MoE) language models on consumer GPUs with scarce VRAM. Specifically, it runs the **Qwen3.6-35B-A3B** model on an 8 GB laptop GPU (like an RTX 4060).

Under standard inference engines, a 35-billion parameter model requires at least 35 GB of VRAM in FP8 (and 70 GB in FP16), making it impossible to run locally without expensive multi-GPU setups. Mosaic approaches inference as a systems memory hierarchy problem: the model is never loaded entirely into GPU memory. Instead, weights live on NVMe disk, stream through the OS kernel page cache, and hot experts are dynamically cached in GPU VRAM as conversation progresses.

---

## Why I Built It

Most local AI tools (like Ollama or vLLM) assume one of two things: either your model fits entirely inside GPU VRAM, or you offload entire layers to system RAM where PCIe bandwidth grinds inference down to unplayable speeds.

Mixture-of-Experts models present a unique architectural opportunity: while the model has 35 billion total parameters, only a small subset of experts (top-8 per layer) are active for any given token. Furthermore, in coherent conversation, human text repeatedly routes into the same small working set of experts across adjacent tokens.

I wanted an engine that treated inference like operating system virtual memory:
1. Don't store 35 GB in VRAM.
2. Use the fast NVMe disk as backing store via zero-copy `mmap`.
3. Let the CPU evaluate cold experts with handwritten C++ SIMD kernels while the GPU computes attention.
4. Promote frequently routed experts to a lightweight GPU LRU cache.

---

## System Architecture & Memory Hierarchy

Mosaic splits execution into three distinct hardware tiers:

```
[ NVMe Disk (35 GB Checkpoint) ]
              │
              ▼ mmap + madvise(WILLNEED)
[ Kernel Page Cache (RAM: ~8 GB / 14 GB) ]
         │                           │
         │ (Cold Experts: <3 hits)   │ (Hot Experts: ≥3 hits)
         ▼                           ▼
[ C++ AVX2 CPU Executor ]    [ GPU VRAM LRU Cache (~3.2 GiB) ]
         │                           │
         └─────────────┬─────────────┘
                       ▼
         [ Layer Activation Accumulation ]
```

### 1. Zero-Copy Shard Catalog
The model is stored as 40 per-layer shard files (`layers-N.safetensors`, ~0.84 GB each) formatted in uniform blockwise **FP8 (E4M3)** with `bf16` inverse scale factors over 128×128 blocks. The `Catalog` mmaps these files once. No model weights are duplicated into Python heap memory; all accesses are zero-copy views into the Linux kernel page cache.

### 2. Tiered Expert Execution
During the forward decode step:
* **Cold Experts (fewer than 3 sightings):** Evaluated directly from the kernel page cache on the CPU using a custom C++ AVX2 SIMD kernel. This avoids saturating the PCIe bus with one-off weight transfers.
* **Hot Experts (3+ sightings):** Automatically promoted to a ~3.2 GiB GPU LRU cache in VRAM. Subsequent tokens route directly into GPU tensor cores with zero disk or PCIe latency.

### 3. Handwritten C++ SIMD Executor
The CPU execution engine (`src/mosaic/kernels/cpu_executor.cpp`) is written in C++17 with AVX2 intrinsics and OpenMP multi-threading. It performs arithmetic dequantization of E4M3 bytes inline without table lookups and accumulates activations using 8-wide FMA vectors in ~0.08 ms per expert.

### 4. Hybrid Attention Scaling
Long conversational context usually causes quadratic memory growth and slowdowns in standard Transformers. Mosaic uses a hybrid architecture:
* The majority of layers use **linear attention** (a gated delta recurrent rule with O(1) constant per-token decode cost as context grows).
* Selected layers use **full attention** (SDPA over a paged KV cache).

As a result, generation speed remains flat from 100 tokens all the way out to 32k context tokens.

---

## Real-World Performance

Running locally on an RTX 4060 laptop (8 GB VRAM, 8-core AMD CPU, 16 GB RAM, NVMe SSD):

| Scenario | Measured Throughput | Notes |
| :--- | :--- | :--- |
| **First Answer (Cold)** | ~1.5 – 2.0 tok/s | Initial faulting from NVMe SSD into page cache |
| **Warmed Working Set** | **2.5 – 3.0 tok/s** | GPU LRU hits absorb most recurring expert passes |
| **Memory Footprint** | **~4.2 GiB VRAM total** | Leaves ~3.8 GiB free for OS and display compositor |

---

## Key Takeaways

Mosaic demonstrates that large language models don't always need massive enterprise hardware. By treating neural network execution as a systems problem—balancing memory hierarchies, kernel paging, and SIMD execution—consumer laptops can run state-of-the-art 35B models entirely locally and privately.
