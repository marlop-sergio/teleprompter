# Teleprónter PRO — Controladores externos

Todos los controladores usan la misma **HTTP GET API**:

```
GET http://<IP-DEL-SERVER>:3000/api/control?action=<ACCIÓN>
```

Sustituye `<IP-DEL-SERVER>` por la IP de tu máquina (visible en la pantalla de espera del teleprónter o en la pestaña **Red** del estudio).

---

## Acciones disponibles

| Acción | Descripción |
|---|---|
| `toggle_play` | Play / Pausa (alternado) |
| `play` | Play |
| `pause` | Pausa |
| `reset` | Volver al inicio |
| `nudge_forward` | Avanzar ~300 px |
| `nudge_back` | Retroceder ~200 px |
| `jump_next_block` | Saltar al bloque siguiente |
| `jump_prev_block` | Saltar al bloque anterior |
| `speed_up` | Velocidad +10 |
| `speed_down` | Velocidad −10 |
| `beep` | Pitido de aviso en el teleprónter |
| `attention` | Llamar la atención del locutor |

**Ejemplo:**
```
http://192.168.1.10:3000/api/control?action=toggle_play
```

---

## Stream Deck

### Plugin recomendado: **Website** (acción nativa de Elgato)

1. Abre Stream Deck y arrastra una acción **Website** a un botón.
2. En **URL** escribe la URL de la acción, p. ej.:
   ```
   http://192.168.1.10:3000/api/control?action=toggle_play
   ```
3. Activa **"Open in Background"** (no abre el navegador).
4. Repite para cada acción.

### Layout sugerido

| Botón | Acción |
|---|---|
| ▶ / ⏸ | `toggle_play` |
| ⏮ | `reset` |
| ⏭ bloque → | `jump_next_block` |
| ⏮ bloque ← | `jump_prev_block` |
| 🔼 vel. | `speed_up` |
| 🔽 vel. | `speed_down` |
| 🔔 | `beep` |
| ⚡ | `attention` |

---

## TouchPortal

### Paso a paso

1. En TouchPortal, crea un **botón nuevo**.
2. En la acción del botón elige **"HTTP GET"** o **"Open URL"** (según versión).
3. Pega la URL:
   ```
   http://192.168.1.10:3000/api/control?action=toggle_play
   ```
4. Guarda y asigna al botón el icono que quieras.

> Si tu versión de TouchPortal no tiene "HTTP GET" de forma nativa, instala el plugin **"Web Requests"** desde el marketplace de TouchPortal y úsalo en su lugar.

---

## MacroDeck

MacroDeck tiene soporte nativo para peticiones HTTP.

### Configuración por botón

1. Abre MacroDeck y crea o edita un botón.
2. Añade la acción **"HTTP Request"** (pestaña **Actions**).
3. Configura:
   - **Method:** `GET`
   - **URL:** `http://192.168.1.10:3000/api/control?action=toggle_play`
4. Guarda. Al pulsar el botón físico se enviará la petición.

> MacroDeck también admite `POST` con body JSON si prefieres:
> - **Method:** `POST`
> - **URL:** `http://192.168.1.10:3000/api/control`
> - **Body:** `{"action":"toggle_play"}`
> - **Content-Type:** `application/json`

---

## Notas generales

- El servidor **no requiere autenticación** (red local).
- Si el firewall de Windows bloquea el puerto 3000, ejecuta en PowerShell (como administrador):
  ```powershell
  New-NetFirewallRule -DisplayName "Teleprónter PRO" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
  ```
- Cada petición devuelve `{"ok":true}` si se ejecutó correctamente.
