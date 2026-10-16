# Hajar Mrifag

Chengdu, China | Planning relocation to London | hajarmrifag2@gmail.com
[GitHub](https://github.com/hajarmrifag) | [Portfolio](https://hajarmrifag.github.io/) | [LinkedIn](https://www.linkedin.com/in/hajar-mrifag-a7903334b/)

Software Engineering undergraduate with experience in CUDA performance experiments, numerical simulation and transactional backend systems. Interested in graduate engineering work where correctness, algorithms and measured performance matter.

## Education

**Sichuan University — BEng Software Engineering** | 2023 – Expected June 2027
Relevant study: Java and object-oriented programming; data structures and algorithms; operating systems; computer architecture; networks; distributed systems and parallel computing.

## Engineering experience

**Data & AI Engineering Intern — Chengdu Suncaper Data Co., Ltd** | March – April 2026

- Contributed backend and data engineering in a two-person flight analytics project with a documented 15-million-record dataset, using PySpark, HDFS and Hive.
- Built a FastAPI query prototype with schema context and a bounded correction loop; its published execution service uses SQLite, separate from the distributed analysis workflow.

## Selected engineering projects

**[CUDA Transformer Kernels](https://github.com/hajarmrifag/cuda-transformer-kernels)** | C++17, CUDA, Nsight Compute

- Developed FP32 matrix-multiplication kernels with shared-memory and register tiling. Recorded 1.28 TFLOPS at 1024 × 1024 on a Tesla T4: 3.31× the naive kernel and 24% of cuBLAS throughput.
- Profiled memory and execution stalls; register-cached Softmax recorded 1.71× baseline throughput at width 2048. Documented CPU-reference checks, warm-up, median timings and a slower warp-shuffle experiment.

**[Java Order Book](https://github.com/hajarmrifag/java-order-book)** | Java 21, JUnit 5, JMH

- Price-time limit-order matching with integer ticks, FIFO queues, cancellation and deterministic fills; 20 tests include 60,000 seeded commands checked against an independent reference model. JMH records batch throughput, sampled durations and allocation with warm-up and JVM forks.

**[GridFlex](https://github.com/hajarmrifag/gridflex-ai)** | Python, NumPy, FastAPI, React

- Built an energy simulation engine and application for demand shifting and battery dispatch, with numerical constraints and automated validation.
- Removed repeated pandas indexing from the shift path. Recorded 71.731 → 2.246 ms for a 60-day shift-and-battery workload (31.9×); compared six seeded cases with identical outputs. The result measures the engine pipeline, not application latency.
- Added numerical/API tests and CI; 91 tests pass. Benchmark records include raw samples, paired timing order and source/environment metadata.

**[Neobank Transaction API](https://github.com/hajarmrifag/neobank-growth-analytics)** | Python, FastAPI, PostgreSQL

- Implemented simulated transfers in one database transaction, with consistently ordered account locks and idempotency-key serialization for retries.
- The 37-test suite includes real PostgreSQL checks for concurrent overspending, duplicate requests, opposite-direction transfers and rollback after an injected failure.

## Technical skills

**Languages:** Java (university study), C++/CUDA, Python, SQL, C#, TypeScript.
**Engineering:** profiling and benchmarking, automated testing, Git, Linux, Docker, GitHub Actions.
**Systems and data:** PostgreSQL, FastAPI, ASP.NET Core, PySpark, HDFS/Hive.
