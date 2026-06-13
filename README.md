# 🌌 Humanidad 101

Este es un proyecto propio que he ido creando confome avanza el estudio de mi carrera de ser humano.
Aún no sé usar github de forma profesional, así que el resto de info está escrita con IA. 

Gracias por el tiempo de lectura. 

---

##  En vivo

** [www.humanidad101.com](https://www.humanidad101.com)**

---


> Línea de tiempo narrativa sobre el origen del universo, la era humana y el presente cósmico.

<div align="center">
  <img src="https://img.shields.io/website?url=https://www.humanidad101.com&label=Sitio%20Web&color=8B5CF6">
  <img src="https://img.shields.io/github/last-commit/salvarez-gh/Humanidad101?color=8B5CF6">
</div>


## ✨ Características

- **Línea de tiempo interactiva** — Navegación por eras cósmicas (Origen, Era Humana, Presente)
- **Fondos generativos** — Visuales únicos que evolucionan según el cuadrante
- **Lector inmersivo** — Paginación por secciones, tipografía cuidada, bloques de bitácora y datos técnicos
- **Historias con formato rico** — Soporte para citas, registros de sistema, separadores y datos técnicos
- **Navegación por teclado** — Flechas ← → para cambiar de era

---

## 🏗️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| **React 19** | Framework principal |
| **Vite** | Build tool y desarrollo rápido |
| **Firebase Firestore** | Base de datos de textos y metadatos |
| **Canvas API** | Fondos generativos animados |
| **GitHub Pages** | Hosting y despliegue |

---

## 📖 Contenido

Los escritos se alojan en Firestore y actualmente se organizan en tres eras:

| Cuadrante | Era | Color |
|-----------|-----|-------|
| **q1** | El Origen — Nacimiento del universo | 🟡 Dorado |
| **q2** | La Era Humana — Del billón 13 al 26 | 🔵 Cyan |
| **q3** | El Presente — Inicio del billón 26 | 🟣 Violeta |

Cada archivo `.txt` sigue un formato de metadatos:

```yaml
---
id: identificador-unico
title: Título del escrito
quadrantId: q1 / q2 / q3
timePosition: 0.01-0.99
era: Época
type: story / novel / chronicle
tags: Etiquetas
summary: Resumen breve
---