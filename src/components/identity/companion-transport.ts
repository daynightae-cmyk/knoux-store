import { COMPANION_MAX_RESPONSE,type CompanionEvent,type CompanionRequest } from '@/lib/sentinel/companion-contract';
export async function companionTransport(input: CompanionRequest,signal: AbortSignal,onEvent: (event: CompanionEvent)=>void) {
  const session=await fetch('/api/sentinel/session',{method:'POST',credentials:'same-origin',signal});
  if(!session.ok) throw new Error(session.status===429?'RATE_LIMITED':'UNAVAILABLE');
  const readiness=await session.json().catch(()=>({ready:false})) as {ready?:boolean};
  if(!readiness.ready) throw new Error('UNAVAILABLE');
  const response=await fetch('/api/sentinel/reply',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal});
  if(!response.ok || !response.body || !response.headers.get('content-type')?.startsWith('text/event-stream')) throw new Error(response.status===429?'RATE_LIMITED':'UNAVAILABLE');
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',total=0,finished=false;
  try {
    while(true){const chunk=await reader.read();if(chunk.done) break;pending+=decoder.decode(chunk.value,{stream:true});if(pending.length>12000) throw new Error('RESPONSE_LIMIT');
      let boundary;while((boundary=pending.indexOf('\n\n'))>=0){const block=pending.slice(0,boundary);pending=pending.slice(boundary+2);const line=block.split('\n').find(line=>line.startsWith('data: '));if(!line) continue;
        const event=JSON.parse(line.slice(6)) as CompanionEvent;
        if(event.type==='delta'){if(typeof event.text!=='string')throw new Error('INVALID_RESPONSE');total+=event.text.length;if(total>COMPANION_MAX_RESPONSE)throw new Error('RESPONSE_LIMIT');onEvent(event);}
        else if(event.type==='error'){onEvent(event);finished=true;}
        else if(event.type==='done'){if(event.requestId!==input.id || !Array.isArray(event.sourceIds) || event.sourceIds.length>5)throw new Error('INVALID_RESPONSE');onEvent(event);finished=true;}
        else throw new Error('INVALID_RESPONSE');
      }
    }
    if(!finished && !signal.aborted)throw new Error('INCOMPLETE_RESPONSE');
  } finally {await reader.cancel().catch(()=>{});}
}
