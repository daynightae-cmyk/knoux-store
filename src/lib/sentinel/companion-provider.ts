import 'server-only';
import { GeminiAdapter } from '@/lib/ai/adapters/gemini';
export const COMPANION_MODEL='gemini-3.1-flash-lite';
export const companionProvider=new GeminiAdapter();
let discovery: Promise<boolean> | null=null,checked=0;
export async function confirmCompanionModel() {
  if(!discovery || Date.now()-checked>600000) {
    checked=Date.now();
    discovery=companionProvider.discoverModels(process.env).then(result=>result.source==='LIVE' && result.models.some(model=>model.modelId===COMPANION_MODEL));
  }
  return discovery;
}
