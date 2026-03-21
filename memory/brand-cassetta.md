# Brand Guidelines — La Cassetta degli AI-trezzi
> Riferimento visivo per tutti i siti, tool e artefatti del brand.
> Estratte dal Substack e dal Workflow AI Analyzer. Data: 2026-03-18.
---
## Palette Colori
### Colore Primario (Brand)
- **Teal / Verde Acqua**: `#2DD4A8` / `rgb(45, 212, 168)`
- Variante chiara (hover): `#5EEAD2` / `rgb(94, 234, 210)`
- Variante scura (sfondo accent): `#0D9488` / `rgb(13, 148, 136)`
- Variante trasparente (badge): `rgba(13, 148, 136, 0.2)`
- Uso: pulsanti primari, icone attive, progress bar, badge, CTA
### Sfondo (Dark Mode)
- **Dark Stone**: `#292524` / `rgb(41, 37, 36)` — sfondo principale
- **Dark Surface**: `#2D2D2D` / `rgb(45, 45, 45)` — card e contenitori
- **Dark Hover**: `#3A3A3A` / `rgb(58, 58, 58)` — superfici in hover
- **Dark Border**: `#454545` / `rgb(69, 69, 69)` — bordi e separatori
- **Dark Elevated**: `#4A4A4A` / `rgb(74, 74, 74)` — elementi elevati
### Testo
- **Bianco**: `#FFFFFF` — titoli, testo principale su dark
- **Grigio chiaro**: `#A9A8A7` / `rgb(169, 168, 167)` — testo secondario, date, metadati
- **Grigio medio**: `#9CA3AF` / `rgb(156, 163, 175)` — placeholder, hint
- **Scuro (su light)**: `#363231` / `rgb(54, 50, 49)` — testo su sfondi chiari
### Colori Funzionali (Dashboard/Tool)
- **Verde successo**: `#4ADE80` / `rgb(74, 222, 128)`
- **Blu info**: `#60A5FA` / `rgb(96, 165, 250)`
- **Viola highlight**: `#C084FC` / `rgb(192, 132, 252)`
- **Giallo warning**: `#FDE047` / `rgb(253, 224, 71)`
- **Rosso errore**: `#F87171` / `rgb(248, 113, 113)`
---
## Tipografia
### Font Principale (UI / Heading)
- **SF Pro Display** (Apple) → fallback: system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif
- Peso titoli: **700 (Bold)**
- Peso corpo UI: **400-600**
### Font Editoriale (Contenuti Newsletter)
- **Spectral** (serif) — usato su Substack per il corpo dei post
- Fallback: serif, Georgia, Times New Roman
### Gerarchia
- H1 (pagina): 24px+ bold, bianco
- H2 (sezione): 20px bold, bianco
- Body: 16px regular, bianco o grigio chiaro
- Meta (date, autore): 12-14px, grigio `#A9A8A7`, maiuscoletto
---
## Componenti UI
### Pulsanti
- **Primario**: bg `#2DD4A8`, testo `#2D2D2D` (scuro su teal), border-radius 8px
- **Secondario**: bg `#454545`, testo bianco, border 1px `#454545`, border-radius 8px
- **Outline (Iscritto/CTA)**: bg trasparente, border teal `#0D9488`, testo teal
### Card
- Background: `#2D2D2D` o `#3A3A3A`
- Border: 1px `#454545` o nessuna
- Border-radius: 8-12px
- Ombra: subtle, nera con bassa opacità
### Badge / Chip
- Background: `rgba(13, 148, 136, 0.2)` (teal trasparente)
- Testo: teal `#2DD4A8`
- Border-radius: 6px
### Progress / Stepper
- Attivo: cerchio teal `#2DD4A8` con check bianco
- Linea connettore: teal `#2DD4A8`
- Inattivo: cerchio grigio `#454545`
---
## Principi di Design
1. **Dark-first**: Tutto è progettato per dark mode. Il light mode è secondario.
2. **Teal come accento, mai come sfondo pieno**: Il verde acqua guida l'occhio, non domina.
3. **Leggibilità sopra tutto**: Contrasto alto, testo bianco su scuro, niente effetti che ostacolano la lettura.
4. **Professionale ma accessibile**: Non è un sito tech per developer — è per PMI, imprenditori, professionisti. Pulito, non intimidatorio.
5. **Coerenza cross-piattaforma**: Substack, siti web, tool, presentazioni — stessi colori, stessi principi.
---
## Tailwind CSS Reference
Per implementazione rapida nei progetti web:
```css
/* Custom colors per tailwind.config.js */
colors: {
  brand: {
    DEFAULT: '#2DD4A8',
    light: '#5EEAD2',
    dark: '#0D9488',
  },
  dark: {
    bg: '#292524',
    surface: '#2D2D2D',
    hover: '#3A3A3A',
    border: '#454545',
    elevated: '#4A4A4A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A9A8A7',
    muted: '#9CA3AF',
    dark: '#363231',
  }
}
```
---
## Logo e Icona
- Icona attuale: quadrato con testo "Cassetta degli AI-trezzi" stilizzato (favicon Substack)
- Stile: compatto, leggibile anche in piccolo
- Colori: teal su sfondo scuro
