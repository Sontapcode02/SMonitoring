---
name: impeccable
description: "Use when designing, redesigning, shaping, auditing, critiquing, polishing, layouting, animating, or improving UI/UX. Enforces award-winning design craft, anti-patterns prevention (no nested cards, no Inter font fallback, no gray text on colors), modern dark glassmorphism styling, and responsive layout guidelines."
user-invocable: true
---

# Impeccable Design System & Craft Guidelines

This skill provides design directives and quality guardrails to ensure UI implementations look premium, state-of-the-art, and free of generic AI design tropes ("AI slop").

## Core Principles

1. **Go All Out:** No timid or plain default layouts. Work should feel distinct, polished, and award-winning.
2. **Visitor Success Modes:**
   - **Operate (Dashboards & App UI):** High scannability, clear visual hierarchy, consistent component tokens, dark mode glassmorphism.
   - **Persuade (Landing & Marketing):** Visual punch, strong typography contrast, distinct brand accents.

## Anti-Patterns (Strictly Avoid)

- ❌ **No Overused Font Stack:** Avoid default system fonts or raw Arial/Inter without custom styling. Use Google Fonts (e.g. Outfit, Plus Jakarta Sans, Inter with tight tracking/letter-spacing).
- ❌ **No Gray Text on Colored Backgrounds:** Use high-contrast text overlay colors (e.g., `#ffffff` or `rgba(255, 255, 255, 0.95)`).
- ❌ **No Pure Black (#000000) or Pure White (#ffffff) Backgrounds:** Use tinted dark shades (e.g., `#0b0f19`, `#111827`, `#0f172a`) with subtle gradients.
- ❌ **No Nested Cards inside Cards:** Avoid card-in-card containers. Use spacing, subtle divider borders (`rgba(255,255,255,0.08)`), or subtle background tint shifts instead.
- ❌ **No Cheap Bounce Easing:** Use smooth cubic-bezier transitions (`cubic-bezier(0.16, 1, 0.3, 1)`).

## Impeccable Commands

- `/impeccable init`: Initialize `PRODUCT.md` and `DESIGN.md` in the project root.
- `/impeccable audit`: Scan current UI for anti-patterns, contrast issues, and layout flaws.
- `/impeccable polish`: Perform a final visual sweep for visual alignment, spacing, glassmorphism, and micro-interactions.
- `/impeccable layout`: Fix visual hierarchy, grid spacing, and responsive padding.
- `/impeccable animate`: Add purposeful CSS transitions and micro-animations.
