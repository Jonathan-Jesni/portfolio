# 🚀 Portfolio — Jonathan Jesni

A high-performance, modular developer portfolio focused on **AI-powered systems, cybersecurity, and scalable software**.

Built with **clean architecture, custom animation systems, and zero-framework performance**.

![Tech](https://img.shields.io/badge/Tech-Vanilla_JS-yellow)
![Architecture](https://img.shields.io/badge/Architecture-Modular-blue)
![Performance](https://img.shields.io/badge/Performance-Optimized-brightgreen)
![Status](https://img.shields.io/badge/Status-Live-success)

---

## 🌐 Live Demo

👉 **[https://jonathanjesni.com](https://jonathanjesni.com)**

---

## ⚙️ Highlights

- ⚡ **Zero-framework architecture** — pure HTML, CSS, JavaScript  
- 🧩 **Modular codebase** — clean separation of concerns  
- 🎯 **Custom scroll-synced animation engine** (single rAF loop)  
- 📱 **Mobile-optimized animation tuning** (reduced lag, tighter timing)  
- 🎨 **High-performance UI/UX** with layered motion design  
- 🧠 **System-focused engineering** — not template-based  

---

## 🧠 Architecture Overview

- Single `requestAnimationFrame` loop orchestrating all animations  
- Scroll-driven transform engine with viewport-based interpolation  
- Unified transform pipeline (scroll + depth + interaction)  
- Mobile-specific tuning (faster response, reduced floatiness)  
- GPU-accelerated rendering using `translate3d`  

### Core Modules

- `scrollEngine.js` — animation core  
- `cursorEffects.js` — interaction layer  
- `skillsGlobe.js` — 3D visualization  
- `utils.js` — shared utilities  

---

## 📁 Project Structure

```text
portfolio/
├── assets/
├── css/
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── animations.css
│   └── effects.css
├── js/
│   ├── main.js
│   ├── scrollEngine.js
│   ├── cursorEffects.js
│   ├── skillsGlobe.js
│   └── utils.js
├── index.html
└── README.md
```

---

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Jonathan-Jesni/portfolio.git](https://github.com/Jonathan-Jesni/portfolio.git)
   cd portfolio
   ```

2. **Run locally:**
   Use Live Server or any HTTP server.
   > **Note:** ES modules require a local HTTP server to run properly (they won’t work simply by opening the `file://` path in your browser).

---

## 📬 Contact & Links

* 🌐 **Portfolio:** [jonathanjesni.com](https://jonathanjesni.com)
* 💻 **GitHub:** [Jonathan-Jesni](https://github.com/Jonathan-Jesni)
* 🔗 **LinkedIn:** [Jonathan Jesni](https://www.linkedin.com/in/jonathan-jesni-b0184a210/)

---

## 🧾 Notes

* Fully modularized (migrated from monolithic setup)
* Optimized for performance and responsiveness across devices
* Production-ready

*Built with precision, performance, and real-world focus.*