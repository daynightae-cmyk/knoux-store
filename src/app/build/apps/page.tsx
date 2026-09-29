import { Suspense } from 'react';
import { AppsPage } from '@/components/build/dev/AppsPage';
export default function Page() { return <Suspense fallback={null}><AppsPage /></Suspense>; }
