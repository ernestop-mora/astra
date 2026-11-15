# ASTRA — NASA Space Apps Challenge 2026
## Health Monitoring Software for Astronauts

Eres el principal ingeniero de este proyecto. Seguí estas reglas en cada respuesta, sin excepción.

---

## Sistema de diseño — manda sobre cualquier skill

Un único sistema para todo el programa. Estas reglas mandan sobre cualquier skill y sustituyen a cualquier regla anterior que las contradiga.

**Generales**
- Sin emojis en ningún lado: ni en la UI, ni en el código, ni en las respuestas
- Riqueza visual con criterio: más gráfica, no más palabras. Cada elemento visual aporta información
- Antes de escribir UI, releer esta sección y usar los componentes de `src/components/ds/`

**Paleta completa, con papeles fijos** (tokens en `globals.css` bajo `:root`; nunca hex en JSX). Todos se ven en cada pantalla, cada uno en su papel:
- `--navy #172A39`: escenario y fondo base
- `--navy-2 #20384A` y `--navy-3 #2A4659`: capas de profundidad (superficies, tarjetas, paneles)
- `--cream #E9E4E0`: texto principal y también superficies claras (tarjeta destacada con texto navy, bandas de contraste, el visor)
- `--slate #6E7575`: texto secundario, líneas, divisores y elementos inactivos
- `--cyan #62D4E6`: datos, interacción y señal (`--cyan-soft` .16, `--cyan-line` .32)
- `--amber #E8A838`: estado de precaución
- `--coral #FC563C`: alertas, elementos nuevos o sin ver, y UN único acento de énfasis por pantalla. Nunca como decoración repetida
- Estado de métricas: en rango = cyan, precaución = amber, actúa ya = coral, sin señal = slate. No hay verde. El estado nunca va solo por color: lleva icono propio (check, triángulo, octágono, sin señal) y palabra ("In range", "Caution", "Act now", "No signal")
- Contraste WCAG 2.2 AA: el texto secundario usa `--slate-text #B8B8B5` (slate aclarado, 5.0:1 sobre navy-3); `--slate` queda para líneas e inactivos. Los bordes de controles usan `--control-border` (crema al 50 %, 3.2:1)
- Catálogo con el papel y un ejemplo de cada color en `/ds`

**Superficies y profundidad**
- Capas navy, navy-2 y navy-3, con degradados muy sutiles entre ellas. Ningún degradado con colores ajenos a la paleta
- Cristal: `--glass-bg rgba(23,42,57,.58)`, borde 1px `rgba(233,228,224,.14)`, blur 18px, brillo interior `inset 0 1px 0 rgba(233,228,224,.08)`
- Radios: 14 paneles, 999 píldoras, 10 campos. Sombra suave solo en el panel lateral; nunca sombras fuertes
- Detrás del cuerpo: un resplandor cian muy tenue y anillos orbitales finos en slate. Sin imágenes ni partículas

**Gráfica**
- Iconos de línea lucide-react, trazo 1.5, siempre coherentes
- Mini gráficos: sparkline de 24 horas en cada BodyTag y en cada panel, con el rango sombreado
- ScoreRing con marcas de graduación y arco segmentado

**Tipografía**
- Space Grotesk (400, 500 y 600) para texto; DM Mono (400 y 500) para todos los números y valores. Ningún otro peso
- Una sola escala en rem (tokens en `globals.css`, la de Tailwind está anulada): `--text-xs` 0.75 (solo etiquetas cortas y metadatos), `--text-sm` 0.875, `--text-md` 1 (cuerpo), `--text-lg` 1.25, `--text-xl` 1.75, `--text-figure` 3 (cifras grandes en DM Mono). Interlineado 1.5 en lectura y 1.2 en titulares. `npm run audit:type` debe dar cero fuera de escala
- Oraciones en minúscula normal (sentence case), sin mayúsculas sostenidas
- Cargar ambas fuentes en `layout.tsx` vía `next/font/google`; nunca Inter, Roboto ni fuentes por defecto

**Componentes** (`src/components/ds/`, sobre Base UI, animados con motion, respetan prefers-reduced-motion)
GlassPanel, Button (píldora 40 px; el primario es la píldora rellena en cian, uno por vista; el resto "quiet"), ActionRow (anillo de marca de 250 ms, variante destacada en crema), Segmented (indicador deslizante), BodyTag (icono de estado, nombre, sparkline y valor; aria-label completo), RangeBar, Sparkline, ScoreRing (cian desde 80, ámbar 60-79, coral debajo), StatusDot y StatusBadge (icono y palabra)

**Accesibilidad y layout** (WCAG 2.2 AA; lo comprueban `npm run audit:a11y` y `npm run audit:layout`)
- Una pantalla sin scroll desde 1280x720 (variante `fit:`); por debajo, con zoom 200 % o texto ampliado, la página hace scroll (variante `small:`) y nada se corta. Sin `overflow:auto` internos en el layout de una pantalla
- Foco siempre visible: anillo cian de 2 px (navy sobre crema). Objetivos de 24 px como mínimo. Un h1 por ruta, enlace "Skip to content", `role="alert"` solo para el fallo de sensor
- Todo movimiento se detiene con prefers-reduced-motion

**Presupuesto de texto**: unas 70 palabras visibles en reposo en el Inicio. Nada de texto de ayuda en reposo. Rangos, explicaciones y fuentes van al panel que se abre al pulsar. Prohibido: más texto, sombras fuertes y efectos que distraigan.

## Arquitectura del proyecto

```
src/
  app/
    layout.tsx          ← fuentes + globals + MotionConfig
    page.tsx            ← tab Inicio
    capsule/page.tsx    ← tab Time capsule
    ds/page.tsx         ← catálogo del sistema de diseño
  components/
    ds/                 ← sistema de diseño (Base UI + motion)
    body/               ← cuerpo 3D, silueta SVG, anclas, tags, panel de zona
    capsule/            ← galería y lightbox de la cápsula
  data/
    thresholds.json     ← umbrales NASA HRP con source_url
  lib/
    triage.ts           ← motor determinista (función ASTRA, sin IA)
    simulator.ts        ← emite valores cada 5s
  store/
    useAppStore.ts      ← Zustand
```

## Motor de triage — regla fundamental

**El LLM nunca decide un color ni cambia un umbral.**

El color de cada métrica lo calcula `triage.ts` — una función ASTRA que lee `thresholds.json`. Cada entrada en thresholds.json tiene:
```json
{
  "metric": "heart_rate",
  "unit": "bpm",
  "min_green": 50, "max_green": 90,
  "min_amber": 40, "max_amber": 100,
  "source": "NASA HRP Risk of Adverse Health Outcomes",
  "source_url": "https://www.nasa.gov/hrp/risks/"
}
```

## Tab Inicio — especificación

**Una sola pregunta que responde:** *"¿Voy a poder hacer mi trabajo mañana?"*

- Columna izquierda: cabecera (día de misión + cuenta atrás real), frase diagnóstica corta, ScoreRing, tres ActionRow (la de mayor impacto destacada en crema) que suman al score en vivo vía Zustand, Segmented de consentimiento ("Private" · "My doctor only" · "Open NASA data")
- Columna derecha: cuerpo con BodyTag por métrica (nombre, sparkline y valor), anillos orbitales detrás
- Panel lateral: detalle de zona (valor, estado en texto, sparkline, RangeBar, por qué importa, acciones, fuente) o paquete de datos que sale del dispositivo según el consentimiento
- `?demo=1` fija cámara y lecturas; `?open=heart|abdomen|torso|head` abre una zona

## Tab Time capsule — especificación

- Galería en cuadrícula de mosaicos de distinto tamaño, sin carpetas. Chips de filtro: All, Videos, Photos, Notes y uno por remitente si hay más de uno
- Mosaico destacado: el más reciente sin ver, grande, superficie crema con texto navy y punto coral de "nuevo"
- Lightbox con anterior/siguiente por teclado, Escape para cerrar, video con controles, sin reproducción automática y silenciado
- Estado de ánimo bajo (mock visual): selector de ánimo de cinco opciones con icono y palabra (Great, Good, Okay, Low, Very low) en la cabecera de Capsule y en el asistente ("Check in"). Low o Very low activa la vista de ánimo bajo: fondo cálido (`mood-warm`, 450 ms), la cápsula sellada "Open when you feel low" pasa al centro y se abre, y le siguen en cascada tres tarjetas (video ilustrado con subtítulos y reproducción simulada, nota de voz con transcripción, pausa de respiración 4 s / 6 s). "Not now" vuelve a la galería. Intents `mood_low` y `mood_crisis` del asistente (palabras clave fijas, inglés y español); `mood_crisis` muestra solo la tarjeta fija de apoyo con acciones simuladas, nunca video
- El ánimo es presentación, no clínica: no cambia el readiness score, ni los umbrales, ni triage.ts. No se detecta nada por voz ni por rostro. Vive solo en memoria (`useMoodStore`) y nunca entra en `packet.ts` (regla de ESLint y tests en `scripts/packet.test.mjs`). Este mock no es un servicio de salud mental
- Demo: `?demo=1&tab=capsule&mood=low|crisis|ok` (estado congelado, sin animación de entrada), `&checkin=1` abre el selector en el asistente, `&mute=1` sin voz
- Solo en el navegador (IndexedDB). Nunca entra en `src/lib/packet.ts` ni en el consentimiento (lo garantiza una regla de ESLint). Cero archivos multimedia en el repositorio; las entradas de `?demo=1` son solo metadatos

## Reglas de código

- TypeScript estricto — sin `any`
- Tailwind para layout y spacing; variables CSS para colores (nunca hardcodear hex en JSX)
- Zustand para estado global
- Simulador: `useEffect` + `setInterval` cada 5000ms, variación ±3% random
- `npm run dev` debe correr sin errores de TypeScript antes de reportar completado
- Commits descriptivos en inglés

## Contexto del proyecto

- **Reto:** NASA Space Apps Challenge 2026 — Health Monitoring Software for Astronauts
- **Diferencial:** el sistema trabaja *para* el astronauta, no *sobre* él. Responde una pregunta diaria: ¿puedo hacer mi trabajo mañana?
- **5 peligros NASA HRP mapeados a 5 tabs:** Inicio (entorno cerrado) · Cápsula del tiempo (aislamiento) · Taller (distancia) · Cuerpo (gravedad) · Dosis (radiación)
- **Submisión cierra:** Dom 15 nov 2026, 11:59 p.m. hora Costa Rica
- **Deploy:** Vercel. Links públicos sin login.
- **No hacer todavía:** tabs Cuerpo y Dosis, login, base de datos, Supabase
- **Privacidad:** ver `SECURITY.md`. `src/lib/packet.ts` documenta qué campos salen en cada nivel de consentimiento; cabeceras de seguridad en `next.config.ts`
