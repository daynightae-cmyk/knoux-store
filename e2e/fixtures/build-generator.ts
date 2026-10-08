import type { Page, Route } from '@playwright/test';

/** Explicit browser contracts only. None of these records prove live provider execution. */
export const SECTIONS = ['GOAL', 'PRODUCT TYPE', 'ARCHITECTURE', 'STACK', 'ROUTES', 'DATA MODEL', 'AUTH', 'INTEGRATIONS', 'UI SYSTEM', 'FILES / MODULES', 'TEST PLAN', 'DEPLOYMENT PLAN', 'RISKS', 'EXECUTION PLAN'];
export const CONTRACT_MODEL = { providerId: 'gemini', modelId: 'contract-thinking', displayName: 'Thinking · CONTRACT FIXTURE', contextWindow: 200000, maxOutputTokens: 8192, discoveredAt: null, modalities: { text: true, imageInput: false, audioInput: false, audioOutput: false }, capabilities: { streaming: 'SUPPORTED', tools: 'UNKNOWN', reasoning: 'SUPPORTED', vision: 'UNSUPPORTED', structuredOutput: 'UNKNOWN' }, controls: { temperature: true, topP: true, maxTokens: true, reasoningEffort: false, seed: false, stop: false, toolChoice: false }, pricing: { inputPerMillion: null, outputPerMillion: null, cachedInputPerMillion: null, currency: 'USD' }, lifecycle: 'active', source: 'STATIC' };
export function contractPlan(product = 'delivery platform') {
  const sources = product.includes('delivery') ? { architecture: 'Dispatch service references Deliveries.', data: ['Deliveries -> Customers via customerId', 'Customers table holds contact records'] } : product.includes('ecommerce') ? { architecture: 'Checkout service references Orders.', data: ['Orders -> Products via productId', 'Products table holds catalogue records'] } : product.includes('academy') ? { architecture: 'Lesson service references Courses.', data: ['Courses -> Lessons via courseId', 'Lessons table holds learning records'] } : { architecture: 'Pipeline service references Contacts.', data: ['Contacts -> Companies via companyId', 'Companies table holds account records'] };
  return { ...Object.fromEntries(SECTIONS.map((section) => [section, [`CONTRACT FIXTURE · Proposed ${section.toLowerCase()} for ${product}.`]])), GOAL: [`CONTRACT FIXTURE · Build a ${product}.`], 'PRODUCT TYPE': [product], ARCHITECTURE: [sources.architecture], ROUTES: product.includes('delivery') ? ['/dispatch', '/deliveries'] : product.includes('ecommerce') ? ['/catalog', '/checkout'] : product.includes('academy') ? ['/courses', '/lessons'] : ['/contacts', '/pipeline'], 'DATA MODEL': sources.data, AUTH: ['No authentication required in this isolated fixture.'], INTEGRATIONS: ['No payment integration in this isolated fixture.'] };
}
export const decision = { selected: { providerId: 'gemini', modelId: 'contract-thinking' }, reasons: ['Explicit isolated browser contract fixture; no live generation evidence.'], fallbackChain: [] };
export async function intelligenceFixture(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('knoux-dev-entry-intent', 'Build a delivery portal'));
  await page.route('**/api/build/ai/models', (route) => route.fulfill({ json: { providers: [{ providerId: 'gemini', models: [CONTRACT_MODEL] }, { providerId: 'deepseek', models: [{ ...CONTRACT_MODEL, providerId: 'deepseek', modelId: 'contract-fixed', displayName: 'Fixed · CONTRACT FIXTURE', capabilities: { ...CONTRACT_MODEL.capabilities, reasoning: 'UNKNOWN' } }] }] } }));
  const health = { transport: 'CONTRACT FIXTURE', configured: true, auth: 'AUTHENTICATED', discovery: 'DISCOVERY_VERIFIED', generation: 'CONFIGURED_UNTESTED', streaming: 'CONFIGURED_UNTESTED', modelCount: 1, latencyMs: null, lastTestedAt: null, lastError: null };
  await page.route('**/api/build/ai/providers', (route) => route.fulfill({ json: { providers: [{ ...health, providerId: 'gemini', displayName: 'Gemini · CONTRACT FIXTURE' }, { ...health, providerId: 'deepseek', displayName: 'DeepSeek · CONTRACT FIXTURE', generation: 'BLOCKED' }, { ...health, providerId: 'custom-openai', displayName: 'Custom · CONTRACT FIXTURE', configured: false }] } }));
}
export async function planFixture(page: Page, product = 'delivery platform') {
  await page.route('**/api/build/ai/prepare', (route) => route.fulfill({ json: { state: 'ROUTING', decision } }));
  await page.route('**/api/build/ai/stream', (route) => completePlan(route, product));
}
export function completePlan(route: Route, product = 'delivery platform') {
  const body = route.request().postDataJSON();
  return route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ delta: JSON.stringify(contractPlan(product)), done: false })}\n\ndata: ${JSON.stringify({ delta: '', done: true, actualProviderId: 'gemini', actualModelId: 'contract-thinking-version', controlsUsed: body.controls, usage: { inputTokens: 12, outputTokens: 40 }, latencyMs: 10, ttftMs: 3, estimatedCost: { amount: null, basis: 'UNKNOWN', currency: 'USD' } })}\n\n` });
}
export async function generateContract(page: Page, prompt = 'Build a delivery portal') {
  await page.getByLabel('Describe what you want to build', { exact: true }).fill(prompt);
  await page.getByRole('button', { name: 'Generate engineering plan', exact: true }).click();
}
