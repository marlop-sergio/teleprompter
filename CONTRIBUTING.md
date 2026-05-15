# Contribuir a Teleprónter PRO

¡Gracias por tu interés! Este proyecto prefiere **contribuciones al repo principal** antes que forks independientes. Así el esfuerzo de todos va en la misma dirección.

---

## Cómo contribuir

### 1. Reportar un bug

Abre un [issue](https://github.com/marlop-sergio/teleprompter/issues) con:

- **Descripción clara** de lo que ocurre y lo que esperabas
- **Pasos para reproducirlo**
- **Navegador y sistema operativo**
- Captura de pantalla o vídeo si ayuda

### 2. Proponer una mejora

Abre un issue con la etiqueta `enhancement` antes de ponerte a programar.
Así evitamos duplicar trabajo y podemos discutir el enfoque.

### 3. Enviar código (Pull Request)

```bash
# 1. Haz fork del repo y clónalo
git clone https://github.com/TU_USUARIO/teleprompter.git
cd teleprompter

# 2. Crea una rama descriptiva
git checkout -b fix/scroll-race-condition
# o
git checkout -b feat/importar-guiones

# 3. Haz tus cambios y commitea
git commit -m "fix: corregir race condition en el scroll del teleprónter"

# 4. Sube y abre un Pull Request hacia main
git push origin fix/scroll-race-condition
```

---

## Guía de estilo

- **Sin dependencias nuevas** salvo que sea imprescindible y lo discutamos antes
- **Vanilla JS** — el proyecto no usa frameworks de frontend a propósito
- **Sin comentarios redundantes**: el código debe ser autoexplicativo; comenta solo el *por qué*, no el *qué*
- Los tres ficheros principales (`server.js`, `studio.html`, `teleprompter.html`) son grandes por diseño — añade el código donde corresponda, no crees ficheros nuevos sin necesidad
- Prueba en Chrome/Edge (estudio y teleprónter) y en móvil (mando)

---

## Arquitectura rápida

```
server.js           — Servidor HTTP + WebSocket. Estado global de la sesión.
public/
  studio.html       — Consola del técnico. Editor, transport, reloj, config.
  teleprompter.html — Pantalla del presentador. Solo renderiza, no edita.
  remote.html       — Mando móvil. Controles mínimos.
scripts/            — Guiones JSON guardados (ignorados por git, datos de usuario)
config.json         — Configuración local persistente (ignorada por git)
```

El servidor mantiene un **estado global único** y lo sincroniza a todos los
clientes via WebSockets. Cada cliente registra su rol (`studio`, `teleprompter`,
`remote`) al conectarse.

---

## Lo que más se agradece

- Correcciones de bugs con reproducción clara
- Mejoras de accesibilidad
- Compatibilidad con más navegadores
- Traducciones del README
- Pruebas en entornos reales de producción (plató, eventos, etc.)

---

## Licencia

Al contribuir aceptas que tu código se publique bajo la misma licencia
[AGPL-3.0](LICENSE) del proyecto.
