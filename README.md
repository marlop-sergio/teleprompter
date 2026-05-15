# 🎙️ Teleprónter PRO

Sistema profesional de teleprónter con reconocimiento de voz, control remoto
y gestión de guiones multiparticipante. Todo en red local, sin internet.

---

## Arrancar

```bash
git clone https://github.com/marlop-sergio/teleprompter.git
cd teleprompter
pnpm install   # solo la primera vez (descarga dependencias y fuentes)
pnpm start
```

La terminal mostrará las URLs y el estudio abrirá en `http://localhost:3000`.

---

## Las tres pantallas

### 📺 Teleprónter (`teleprompter.html`)
Pantalla para el presentador. Mientras no haya guión cargado muestra una
pantalla de espera con las IPs del servidor y códigos QR para conectar los
demás dispositivos.

- Texto grande, fondo negro, desplazamiento suave con auto-parada al final
- Cada participante en su color
- HUD superior: fecha, hora, cronómetro y temporizador simultáneos
- Línea de foco con resaltado de la frase activa
- Recibe ediciones en vivo desde el Estudio sin perder la posición

### 🎛️ Estudio (`studio.html`)
Consola del técnico o regidor.

- **Editor de guión** completo: bloques, líneas, notas de dirección con emojis
- **Hasta 8 participantes** con 8 colores únicos y cambio por línea
- **Biblioteca de guiones**: guardar, cargar, eliminar, importar y exportar JSON
- **Arrastrar y soltar** para reordenar líneas · **Ctrl+Z** para deshacer
- **Saltar a línea** concreta en el teleprónter con animación suave
- **Transport**: play/pausa, inicio, avanzar/retroceder
- **Velocidad y tamaño** de texto en tiempo real
- **Reloj**: fecha · hora actual · cronómetro (con pausa) · temporizador H:M:S
  con 5 presets rápidos — visible en teleprónter y/o en la barra del estudio
- **Reconocimiento de voz**: avanza automáticamente al detectar silencio
- **Actualizaciones**: botón 🔄 para hacer `git pull` desde la propia interfaz

### 📱 Mando (`remote.html`)
Control mínimo para móvil.

- Play/Pausa con botón grande
- Inicio, subir, bajar
- Área de scroll táctil (arrastrar para desplazar)
- Salto a bloques del guión
- Control de velocidad

---

## Participantes y colores

| Slot | Color | Hex |
|------|-------|-----|
| 1 | Coral       | #FFB3B3 |
| 2 | Naranja     | #FFD4A0 |
| 3 | Amarillo    | #FFF4A0 |
| 4 | Menta       | #AEFFCC |
| 5 | Celeste     | #A0DEFF |
| 6 | Periwinkle  | #A0AAFF |
| 7 | Lila        | #CCA0FF |
| 8 | Rosa Fucsia | #FFB3E8 |

---

## Formato del guión

Los guiones se guardan como archivos JSON en la carpeta `scripts/`
y se pueden importar/exportar desde el editor.

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

Disponible en el **Estudio** (requiere Chrome o Edge — Firefox no soporta Web Speech API).

- Activa el micrófono con el botón "🎤 Activar"
- Detecta pausas naturales entre frases
- Avanza el teleprónter automáticamente
- No requiere internet

---

## Actualizaciones (Ubuntu / NUC)

Con `pm2` el servidor se relanza automáticamente tras una actualización:

```bash
npm install -g pm2
pm2 start server.js --name teleprompter
pm2 save && pm2 startup
```

Desde el estudio, el botón **🔄** ejecuta `git pull` en el servidor y
ofrece reiniciar con un clic.

---

## HTTPS (opcional, recomendado en producción)

HTTPS es necesario para que el **acceso a la cámara del móvil** funcione
y para evitar que los navegadores modernos bloqueen la conexión en redes locales.

El servidor arranca en HTTP por defecto. Para activar HTTPS basta con colocar
`cert.pem` y `key.pem` en la raíz del proyecto — el servidor los detecta
automáticamente al arrancar.

### Generar un certificado autofirmado (una sola vez)

Ejecuta esto en el servidor (Ubuntu/NUC). Sustituye `alikat` por el hostname
real de tu máquina (`hostname` para consultarlo):

```bash
cd ~/tp2
openssl req -x509 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -days 3650 -nodes \
  -subj "/CN=$(hostname).local" \
  -addext "subjectAltName=DNS:$(hostname).local"
```

Reinicia el servidor:

```bash
pm2 restart teleprompter
```

El log de arranque confirmará `[HTTPS]` y mostrará la URL con el hostname `.local`.

### Aceptar el certificado en cada dispositivo

La primera vez que un dispositivo abre la URL `https://alikat.local:3000`
(sustituye `alikat` por tu hostname), el navegador mostrará un aviso de
seguridad. Acepta la excepción — no volverá a aparecer en ese dispositivo.

En **iOS Safari**: toca _Mostrar detalles_ → _Visitar este sitio web_ → _Visitar_.  
En **Android Chrome**: toca _Avanzado_ → _Acceder a alikat.local (sitio no seguro)_.  
En **macOS/Windows**: haz clic en _Avanzado_ → _Continuar_.

### Nota sobre la IP dinámica

El certificado se genera para el **hostname** (p. ej. `alikat.local`), no para
la IP. Funciona aunque la IP del servidor cambie, siempre que el hostname
sea accesible vía mDNS (estándar en redes locales — funciona sin DNS).

Los archivos `cert.pem` y `key.pem` están excluidos del repositorio (`.gitignore`).

---

## Sin internet

Todo funciona en Wi-Fi local. Las fuentes se descargan una sola vez durante
`pnpm install` y quedan almacenadas localmente. No se hace ninguna petición
externa en tiempo de ejecución.

---

## Licencia

[GNU Affero General Public License v3.0](LICENSE) — si modificas el código
y lo usas como servicio, debes publicar tus cambios.
