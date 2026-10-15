'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import type { CompanionContext } from '@/lib/sentinel/companion-contract';
import type { GuideLanguage } from '@/lib/sentinel/guide';
import type { CompanionReply } from './KnouxThoughtBubble';
import { companionTransport } from './companion-transport';
const empty: CompanionReply={text:'',state:'idle',sources:[]};
export function useCompanionReply(pathname: string,language: GuideLanguage,quiet: boolean) {
  const key=`${pathname}:${language}`;
  const [value,setValue]=useState<CompanionReply & {key:string}>({...empty,key:''});
  const abort=useRef<AbortController|null>(null),serial=useRef(0),last=useRef<CompanionContext|null>(null);
  const stop=useCallback(()=>{serial.current++;abort.current?.abort();setValue({...empty,key});},[key]);
  useEffect(()=>()=>{serial.current++;abort.current?.abort();},[key,quiet]);
  const send=useCallback((context: CompanionContext,question: string,explicit=true)=>{
    abort.current?.abort();const controller=new AbortController();abort.current=controller;const ticket=++serial.current;last.current=context;
    setValue({...empty,key,state:'thinking'});
    companionTransport({id:crypto.randomUUID(),language,context,question},controller.signal,event=>{
      if(ticket!==serial.current || controller.signal.aborted)return;
      if(event.type==='delta')setValue(previous=>({...previous,text:previous.text+event.text,state:'streaming'}));
      else if(event.type==='done')setValue(previous=>({...previous,state:'done',sources:event.sourceIds,model:event.model}));
      else setValue({...empty,key,state:explicit?'error':'idle',error:event.code});
    }).catch(error=>{if(ticket===serial.current && !controller.signal.aborted)setValue({...empty,key,state:explicit?'error':'idle',error:error instanceof Error?error.message:'UNAVAILABLE'});});
  },[key,language]);
  const unavailable=useCallback(()=>setValue({...empty,key,state:'error',error:'UNKNOWN_CONTEXT'}),[key]);
  return {reply:value.key===key?value:empty,send,stop,unavailable,lastContext:last};
}
