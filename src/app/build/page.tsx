import { BuildEntry } from '@/components/build/dev/BuildEntry';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('Welcome to KNOUX STORE', 'A cinematic engineering platform. Enter the KNOuX Build workspace or jump straight to providers, models, terminal and deployments.', '/build');

export default function BuildPage() { return <BuildEntry />; }
