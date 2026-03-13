# Mi App (PWA)

Aplicación ejemplo con **PIN seguro**, **IndexedDB** con **filtros + paginación**, **normalización de inputs** y **Service Worker** con smart-cache.

## Estructura
```
mi-app/
  public/
    index.html
    manifest.json
    sw.js
    styles.css
    icons/
      icon-192.png
      icon-512.png
  src/
    app.js
    db.js
    pin.js
    normalizer.js
```

## Puesta en marcha
Sirve el **directorio raíz** (no solo `public/`) para que los módulos de `/src` sean accesibles.

```bash
# con Node.js
npx http-server . -p 5173
# o
python3 -m http.server 5173
```

Abre: `http://localhost:5173/public/index.html`

> Nota: Si sirves únicamente `/public`, los módulos de `/src` quedarán fuera del **scope** del Service Worker y no estarán disponibles **offline**. Para PWA completa, sirve el **raíz** del repo (recomendado) o mueve los módulos a `public/`.

## Funcionalidades
- **PIN seguro** con PBKDF2 (SHA-256), sal aleatoria, límite de intentos y bloqueo temporal.
- **Datos** en IndexedDB (`items`) con índices compuestos para paginación eficiente.
- **Filtros** por prefijo de texto y rango de fechas.
- **Normalización** en tiempo real mediante atributos `data-normalize`.
- **Service Worker** con estrategias `network-first` (HTML), `stale-while-revalidate` (CSS/JS) y caché de imágenes.

## Personalización
- Cambia el color principal en `styles.css` (`--primary`).
- Ajusta `MAX_ATTEMPTS` y `LOCK_MINUTES` en `src/pin.js`.
- Añade más *stores* o índices en `src/db.js` si lo necesitas.

## Seguridad
- El PIN **no** se almacena en claro; se guarda un **hash derivado** con PBKDF2 + sal.
- Aun así, recuerda que la seguridad del lado cliente tiene límites.

## Licencia
MIT
