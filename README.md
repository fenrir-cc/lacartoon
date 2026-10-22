# Stremio Addon - LACartoons

Addon para **[Stremio](https://www.stremio.com/)** que reproduce caricaturas y series animadas clásicas y retro de **[LACartoons](https://www.lacartoons.com/)** en Audio Latino.

![Stremio LACartoons](https://www.lacartoons.com/favicon.ico)

## 📺 Características

- **Catálogo completo por canales / categorías**:
  - `Top` (todas las series)
  - `Nickelodeon`
  - `Cartoon Network`
  - `Fox Kids`
  - `Hanna Barbera`
  - `Disney`
  - `Warner Channel`
  - `Marvel`
  - `Otros`
- **Buscador integrado**: Busca cualquier serie animada directamente desde la barra de búsqueda de Stremio.
- **Temporadas y Episodios completos**: Desglose por temporadas y episodios con sus nombres correspondientes.
- **Extracción de video directa**:
  - Soporte para **Cubeembed (Cloudflare HLS 1080p y servidor directo)** descifrado dinámicamente con AES-CBC.
  - Soporte para **OK.ru (HLS y calidades MP4)**.
- **Landing page interactiva**: Permite instalar con 1 clic en Stremio o abrir en Stremio Web.

---

## 🚀 Inicio Rápido (Local)

### 1. Requisitos
- [Node.js](https://nodejs.org/) v18 o superior.

### 2. Instalación de dependencias
```bash
npm install
```

### 3. Iniciar el servidor
```bash
npm start
```
El servidor arrancará en:
```text
http://localhost:7000
```

### 4. Instalar en Stremio
1. Abre tu navegador en `http://localhost:7000` y haz clic en **"🚀 Instalar en Stremio"**, o
2. Abre la app de Stremio, ve a la sección de **Addons / Complementos**, pega la siguiente URL en el buscador de addons:
   ```text
   http://localhost:7000/manifest.json
   ```
   y pulsa **Instalar**.

---

## ☁️ Despliegue en la Nube (Gratis)

Para poder usar el addon en tu celular, Android TV, tablet o Stremio Web sin tener tu PC encendida, puedes desplegarlo gratis en cualquiera de estas plataformas:

### Opción A: Render (Recomendada)
1. Sube este repositorio a tu cuenta de GitHub.
2. Regístrate en [Render.com](https://render.com/).
3. Crea un **New Web Service** y conecta tu repositorio.
4. Parámetros:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Una vez desplegado, Render te dará una URL HTTPS (por ejemplo `https://lacartoons-addon.onrender.com`).
6. En Stremio instala:
   ```text
   https://lacartoons-addon.onrender.com/manifest.json
   ```

### Opción B: Railway / Koyeb / Hugging Face Spaces
Funciona directamente con `npm install && npm start` con la variable de entorno `PORT`.

---

## 📁 Estructura del Proyecto

```text
├── scraper.js               # Scraper de lacartoons.com y descifrador de streams
├── server.js                # Servidor Express y endpoints compatibles con Stremio Addon
├── package.json             # Configuración del paquete y dependencias
├── test_scraper_module.js   # Script de pruebas unitarias
└── README.md                # Documentación
```

## 🛠️ Endpoints de la API Stremio

- `GET /manifest.json`: Manifiesto del Addon.
- `GET /catalog/series/lacartoons_series.json`: Catálogo principal.
- `GET /catalog/series/lacartoons_series/genre=:genre.json`: Filtro por categorías.
- `GET /catalog/series/lacartoons_series/search=:query.json`: Búsqueda de series.
- `GET /meta/series/:id.json`: Metadatos de la serie y lista de episodios.
- `GET /stream/series/:id.json`: Enlaces de reproducción directa de video.
