import { Suspense } from 'react';
import { DocsPage } from '@/components/build/dev/DocsPage';
export default function Page() { return <Suspense fallback={null}><DocsPage /></Suspense>; }
