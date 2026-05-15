# 🎙️ Teleprónter PRO

Sistema profesional de teleprónter con reconocimiento de voz, control remoto
y gestión de guiones multiparticipante. Todo en red local, sin internet.

---

## Arrancar

```bash
cd teleprompter-pro
pnpm install   # solo la primera vez
pnpm start
```

La terminal mostrará:

```
🎙️  Teleprónter PRO arrancado

   🎛️  ESTUDIO (principal)  →  http://localhost:3000

   📱 Mando (móvil)        →  http://192.168.1.XX:3000/remote.html
   📺 Teleprónter (cast)   →  http://192.168.1.XX:3000/teleprompter.html
   🎛️  Estudio (red local)  →  http://192.168.1.XX:3000
```

---

## Las tres pantallas

### 📺 Teleprónter (`teleprompter.html`)
Pantalla que se muestra en el portátil / monitor del presentador.
- Texto grande, fondo negro, desplazamiento suave
- Cada participante en su color pastel
- HUD superior con nombre de participantes y reloj
- Recibe avances de voz desde el Estudio

### 🎛️ Estudio (`studio.html`)
Consola del técnico o regidor. Puede abrirse en el portátil o en otro dispositivo de la red.
- **Editor de guion** completo: bloques, líneas, notas de dirección
- **Hasta 8 participantes** con 8 colores pastel únicos
- **Biblioteca de guiones**: guardar, cargar, eliminar
- **Transport**: play/pausa, inicio, avanzar/retroceder
- **Velocidad y tamaño** de texto en tiempo real
- **Navegación por bloques** con salto directo
- **Reloj configurable**: hora actual / cronómetro / temporizador
  - Toggle mostrar/ocultar en pantalla
  - Menú desplegable para elegir modo
  - Botones de inicio/reset para cronómetro y timer
- **Reconocimiento de voz**: escucha el micrófono y avanza el teleprónter automáticamente

### 📱 Mando (`remote.html`)
Versión mínima para móvil.
- Play / Pausa con botón grande
- Inicio, subir, bajar
- Área de scroll táctil (arrastrar para desplazar)
- Salto a bloques del guion
- Control de velocidad
- Hasta 2 mandos conectados simultáneamente

---

## Participantes y colores

| Slot | Color | Hex |
|------|-------|-----|
| 1 | Rosa Pétalo     | #FFD6E0 |
| 2 | Menta Suave     | #C7F2E8 |
| 3 | Azul Niebla     | #D6E8FF |
| 4 | Crema Dorada    | #FFF3C7 |
| 5 | Lila Crepúsculo | #E8D6FF |
| 6 | Melocotón       | #FFE8D6 |
| 7 | Agua Marina     | #D6FFE8 |
| 8 | Malva Claro     | #FFD6F5 |

Cada participante puede asignarse cualquier color desde el panel del Estudio
haciendo clic en el círculo de color.

---

## Formato del guion

Los guiones se guardan como archivos JSON en la carpeta `scripts/`.
Hay un ejemplo incluido: `parla_barrio_a_barrio_ep1.json`.

Estructura:
```json
{
  "title": "Nombre del programa",
  "participants": [
    { "id": "p1", "name": "Lourdes", "colorIdx": 0 }
  ],
  "blocks": [
    {
      "title": "Bloque 1",
      "time": "00:00 – 02:00",
      "lines": [
        { "participantId": "p1", "text": "Texto aquí", "type": "line" },
        { "text": "Nota de dirección", "type": "note" }
      ]
    }
  ]
}
```

---

## Reconocimiento de voz

Disponible en el **Estudio** (requiere Chrome o Edge).

- Activa el micrófono con el botón "🎤 Activar"
- Detecta pausas naturales entre frases
- Avanza el teleprónter automáticamente
- No requiere internet (usa la Web Speech API del navegador)
- Solo funciona en Chrome/Edge (no en Firefox ni Safari)

---

## Clientes conectados

El topbar del Estudio muestra en tiempo real todos los dispositivos conectados:
📺 Teleprónter · 🎛️ Estudio · 📱 Mando

---

## Sin internet

Todo funciona en WiFi local. Solo se hace una petición externa a Google Fonts
para las tipografías. Para modo 100% offline, elimina las líneas
`@import url('https://fonts.googleapis.com/...')` de los HTML y las fuentes
del sistema se usarán como fallback.
