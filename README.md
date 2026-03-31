# 🚀 Portfolio — Jonathan Jesni

A clean, responsive developer portfolio showcasing real-world projects across **AI, Systems Engineering, and Cybersecurity**. Built with a focus on performance and "no-framework" purity.

![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)
![Tech](https://img.shields.io/badge/Tech-Vanilla_JS-yellow)
![Deployment](https://img.shields.io/badge/Deployment-Vercel-black)

## 🌐 Live Demo
> **Coming Soon** — Currently being optimized for Vercel.

---

## 💻 Featured Projects

### 🧠 Ludex — Hybrid Recommendation System
A sophisticated recommendation engine that bridges the gap between content relevance and user behavior.
* **Architecture:** Hybrid approach combining **TF-IDF** content modeling with **Alternating Least Squares (ALS)** collaborative filtering.
* **Features:** Anchor-based user profiling, score-normalized fusion, and **MMR-based re-ranking** to ensure both relevance and diversity.

### 📄 File Converter — Document Processing Engine
A deterministic two-pass engine designed for high-fidelity document conversion without OCR overhead.
* **Engine:** Separates structural analysis from rendering for clean output.
* **Capabilities:** Paragraph reconstruction, list/heading detection, and conservative table extraction.
* **Stack:** Python, `pdfplumber`, `python-docx`.

### 🔐 WebGuardian — Phishing Detection System
A multimodal security tool deployed as a Chrome extension for real-time threat mitigation.
* **Hybrid Model:** Combines **URL-based analysis (Char-CNN + LSTM)** with **Visual Verification (MobileNetV2)**.
* **Fusion:** Implements late fusion logic to reduce false positives in live environments.

### 🎯 Synthetic Data Object Detection
An end-to-end pipeline demonstrating the power of simulated training environments.
* **Generation:** 100% synthetic dataset created using **Blender** Python API.
* **Detection:** Trained on **YOLOv8 Nano** for real-time object detection on rendered scenes.

---

## 🛠️ Tech Stack

| Category | Tools |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **APIs/Patterns** | IntersectionObserver, requestAnimationFrame, DOM Caching |
| **Design** | Responsive UI, Smooth Scroll, Dark Theme |
| **DevOps** | Git, Vercel |

---

## 📁 Project Structure

```text
portfolio/
├── assets/        # Images, icons, and media
├── index.html     # Main entry point
├── style.css      # Custom styling & animations
└── script.js      # Interaction logic & observers
```

---

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Jonathan-Jesni/portfolio.git](https://github.com/Jonathan-Jesni/portfolio.git)
   ```

2. **Launch:**
   Simply open `index.html` in your preferred browser. No build step required!

---

## 📬 Contact & Links

* **GitHub:** [Jonathan-Jesni](https://github.com/Jonathan-Jesni)
* **LinkedIn:** [Jonathan Jesni](https://www.linkedin.com/in/jonathan-jesni-b0184a210/)

---
*Created with ⚡ by Jonathan Jesni*