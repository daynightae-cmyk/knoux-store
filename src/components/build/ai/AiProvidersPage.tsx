'use client';
import { ProviderCenter } from '../providers/ProviderCenter';
export function AiProvidersPage({embedded=false}:Readonly<{embedded?:boolean}>){return <ProviderCenter embedded={embedded}/>;}
