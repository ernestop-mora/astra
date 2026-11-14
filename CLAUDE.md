# ASTRA — NASA Space Apps Challenge 2026
## Health Monitoring Software for Astronauts

Eres el principal ingeniero de este proyecto. Seguí estas reglas en cada respuesta, sin excepción.

---

## Reglas de diseño visual (aplican siempre)

- Sin emojis en ningún lado: ni en la UI, ni en el código, ni en tus respuestas
- Sin look de plantilla genérica: nada de cards azules con bordes redondeados y un ícono a la izquierda, nada de headers con gradiente purple-to-pink, nada de hero sections con "Get Started Today"
- Cada diseño tiene que justificarse desde el contenido: qué es, para quién, qué hace — eso dicta paleta, tipografía y layout
- Espacio en blanco generoso, jerarquía tipográfica clara, nada de elementos decorativos que no aporten información
- Antes de escribir cualquier componente de UI, revisar las reglas de diseño de este CLAUDE.md completo y aplicarlas sin excepción

## Tipografía del proyecto

- **Display / headings:** `Space Grotesk` (Google Fonts) — weights 300 y 500
- **Datos / valores numéricos:** `DM Mono` (Google Fonts) — para todos los números y valores de métricas
- **Razón:** Space Grotesk tiene carácter técnico sin ser fría; DM Mono da precisión visual a los datos médicos
- Nunca usar Inter, Roboto, o cualquier otra fuente por defecto
- Cargar ambas fuentes en `layout.tsx` via `next/font/google`

## Paleta de colores — tokens CSS obligatorios

Definir en `globals.css` bajo `:root`, con dark mode real bajo `@media (prefers-color-scheme: dark)` y clase `.dark`:

```css
:root {
  --navy:         #172A39;
  --navy-2:       #20384A;
  --navy-3:       #2A4659;
  --cream:        #E9E4E0;
  --cream-2:      #DED9D4;
  --cream-rule:   rgba(233,228,224,0.12);
  --coral:        #FC563C;
  --slate:        #6E7575;

  /* Status — solo para métricas, nunca decorativo */
  --status-green: #4CAF7D;
  --status-amber: #E8A838;
  --status-red:   #FC563C; /* mismo que coral */

  /* Fondo y texto base */
  --bg:           #172A39;
  --fg:           #E9E4E0;
  --fg-muted:     #6E7575;
  --border:       rgba(233,228,224,0.12);
  --card-bg:      #20384A;
}
```

**Reglas de uso del color:**
- `--coral` / `--status-red`: SOLO cuando hay alerta activa o acción requerida. Para nada más.
- `--status-green`: solo métricas en rango normal
- `--status-amber`: solo métricas en precaución
- Fondo de toda la app: `--navy` (#172A39)
- Texto principal: `--cream`
- Texto secundario / labels: `--slate`
- Cards: `--navy-2` sin sombra, border-radius máximo 8px
- Sin gradientes decorativos. Sin glassmorphism. Sin box-shadow grandes.

## Arquitectura del proyecto

```
src/
  app/
    layout.tsx          ← fuentes + globals
    page.tsx            ← tab Inicio
  components/
    ui/                 ← shadcn components
    MetricCard.tsx
    ScoreCircle.tsx
    ActionButton.tsx
    ConsentBanner.tsx
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

## Tab Inicio — especificación completa

**Una sola pregunta que responde:** *"¿Voy a poder hacer mi trabajo mañana?"*

Layout en dos columnas (desktop, `lg:grid-cols-[3fr_2fr]`):

**Columna izquierda:**
1. Header: "MISSION DAY 212" en `--slate` pequeño (Space Grotesk 300) + "EVA in 14h 23m" countdown real con JS
2. Frase diagnóstica de una línea: "Your body is at 78% readiness for tomorrow's EVA."
3. Score circular SVG (no librería) 0–100: número en `--cream` DM Mono, arco en color de estado
4. Tres acciones concretas (botones) que al clickear suman al score en tiempo real via Zustand

**Columna derecha:**
- 6 métricas: Heart Rate · Blood Pressure · Glucose · Temperature · Sleep · Mood
- Cada card: nombre en `--slate`, valor en `--cream` grande DM Mono, unidad en `--slate` pequeño, barra de estado horizontal, frase de una línea explicando relevancia para el EVA
- Sin íconos decorativos — solo los datos

**Footer del tab:**
- Banner de consentimiento de datos (compacto, no intrusivo)
- Tres opciones radio: "Private" · "My doctor only" · "Open NASA data"
- Estado en Zustand

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
- **No hacer todavía:** otros tabs, voz, login, base de datos, Supabase
