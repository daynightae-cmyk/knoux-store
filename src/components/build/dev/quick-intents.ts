/**
 * Starter intents for the Build workspace.
 *
 * Each one is a sentence the deterministic intent compiler already resolves to
 * real KNOuX registry entities, so offering them is offering a known-good
 * starting point rather than a sample that would fail. The gate and the
 * workspace composer both read them, which keeps the two lists identical.
 */
export const QUICK_INTENTS = [
  { label: 'WEB APP', prompt: 'Build a web app with React and TypeScript' },
  { label: 'DESKTOP APP', prompt: 'Build a desktop app for Windows' },
  { label: 'ANDROID', prompt: 'Build a web app for Android' },
  { label: 'SYSTEM TOOL', prompt: 'Build a system tool for maintenance' },
  { label: 'AI SYSTEM', prompt: 'Build an AI application with a chatbot' },
] as const;