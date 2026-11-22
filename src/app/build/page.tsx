import { BuildEntry } from '@/components/build/dev/BuildEntry';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('KNOuX DEV', 'One platform for services, apps, intelligence and control — the KNOuX engineering workspace.', '/build');

export default function BuildPage() { return <BuildEntry />; }
