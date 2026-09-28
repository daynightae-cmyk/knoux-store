# KNOuX Living Companion

`KnouxLivingCompanion` uses the four exact canonical SVG paths. It evolves the existing single `PointerField` listener rather than adding another global scene. The native cursor remains. SVG and CSS cost no WebGL context, no particle buffer and no layout space.

On a fine mouse pointer, a short inertial transform trails at an offset. It is hidden over controls and forms, on page scroll, after idle time, in hidden tabs, on touch-only pointers, and under reduced-motion preference. The RAF loop runs only while converging to a new pointer target. The element is `aria-hidden` and `pointer-events:none`.

The same listener still writes local spatial-surface variables, keeping one motion integration point. Runtime profiling and broader browser/device QA must use measured evidence before this is called a performance pass.
