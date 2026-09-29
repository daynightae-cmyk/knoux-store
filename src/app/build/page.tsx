import { DevWorkspaceHome } from '@/components/build/dev/DevWorkspaceHome';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('KNOuX DEV', 'The KNOuX engineering workspace: inspect real products, project state, preview, and verification.', '/build');

export default function BuildPage() { return <DevWorkspaceHome />; }
