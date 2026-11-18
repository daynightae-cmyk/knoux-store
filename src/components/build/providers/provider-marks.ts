const marks = new Map(Object.entries({
  'opencode-console-v2': 'opencode', 'opencode-go': 'opencode',
  openai: 'openai', anthropic: 'anthropic', gemini: 'gemini',
  openrouter: 'openrouter', mistral: 'mistral', deepseek: 'deepseek', qwen: 'qwen', ollama: 'ollama',
}));

export function providerMark(providerId: string) {
  return marks.get(providerId);
}
