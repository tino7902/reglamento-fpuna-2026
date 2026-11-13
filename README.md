# Reglamento Académico 2026 de la FP-UNA: qué cambió

Sitio informativo de la Delegación de la Carrera de Ingeniería en Informática (IIN) que compara el Reglamento General de Cátedra (Res. CSU N° 0540-00-2016) con el Reglamento Académico de Carreras de Grado (Res. CSU N° 0439-00-2026), vigente desde el segundo periodo académico de 2026.

Incluye:

- Los cambios principales, con la cita de los artículos y una explicación breve.
- Una guía para consultar el porcentaje de asistencia en eAlu.
- Una calculadora para saber si se habilita el examen final, si corresponde recuperatorio y cuánto se necesita en el final para cada calificación.

Es material informativo sin carácter oficial. Ante cualquier diferencia, prevalece el texto de la resolución.

## Estructura

- `web/`: el sitio (HTML, CSS y JavaScript, sin dependencias ni compilación).
- `web/js/calculadora.js`: lógica de la calculadora, separada de la interfaz.
- `web/tests/`: pruebas de la lógica.
- `Docs/`: documentos originales.

## Uso local

Para ver el sitio:

```bash
python3 -m http.server 8765 --directory web
```

Para ejecutar las pruebas:

```bash
node --test web/tests/calculadora.test.cjs
```

## Publicación

Cada cambio en la rama `main` ejecuta las pruebas y publica la carpeta `web/` en GitHub Pages.
