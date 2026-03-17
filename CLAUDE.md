# Cosmos Note

Obsidian-style interactive graph note app with space/cosmos dark theme.

## Tech Stack
- React 19 + Vite 8 + TypeScript (zero external dependencies beyond React)
- HTML5 Canvas 2D rendering (not DOM nodes)
- Custom force-directed physics simulation
- useReducer + Context for state management
- Pure CSS (no Tailwind)

## Key Architecture
- `src/canvas/` — Canvas rendering, hit-testing, viewport transforms
- `src/physics/simulation.ts` — Spring, repulsion, centering, damping forces
- `src/hooks/useSimulation.ts` — rAF physics loop with mutable refs (60fps)
- `src/hooks/useCanvasInteraction.ts` — Drag, pan, zoom, connect, add nodes
- `src/state/` — GraphContext + graphReducer (all state actions)
- `src/types/graph.ts` — Core type definitions
- `src/components/` — Sidebar, Header, StatusBar, NodeTooltip, BranchInput
- `src/utils/generateBranches.ts` — Brainstorming branch tree generation

## Important Notes
- DPR scaling: Canvas transform must include `dpr * scale` for Retina displays
- Viewport centering: Hit-test uses `viewport + canvas_center_offset` for correct coordinates
- Physics uses alpha cooling (1.0 → 0.001), stops rAF when settled to save CPU
- Branching: `/` key opens input, generates connected node trees

## Commands
- `npm run dev` — Start dev server (port 5173)
- `npm run build` — Production build
- `npm run preview` — Preview production build

## Preview Server
Config in `.claude/launch.json`, name: `cosmos-note`, port 5173
