# Buscador de artículos estilo YiQi

Sitio estático para GitHub Pages. Permite importar un archivo Excel/CSV y consultar artículos en una tabla con buscador en vivo.

## Archivos

- `index.html`: estructura principal de la página.
- `assets/app.css`: estilos propios de la pantalla.
- `assets/app.js`: lectura de Excel, filtro y renderizado de tabla.

## Columnas esperadas en el Excel

La primera hoja del archivo debe tener encabezados reconocibles para estas columnas:

- `SKU`
- `Nombre del artículo`
- `CRM` o `Costo`
- `Lista 1 - Contado`

El sistema también reconoce variantes como `Código`, `Descripción`, `Precio final`, `Precio de venta`, etc.

## Publicación

Subir todo el contenido de esta carpeta al repositorio y configurar GitHub Pages para publicar desde la rama `main` y carpeta `/root`.
