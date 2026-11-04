import { KxPortal } from '@/components/kxvpn/KxPortal';
import { kxVpnMetadata } from '@/lib/kx-vpn-metadata';

export const metadata = kxVpnMetadata('KX Private VPN Releases & Verification', 'Current release status, Android build verification and public distribution gates for KX Private VPN.', '/software/kx-private-vpn/releases');

export default function Page() {
  return <KxPortal page="releases" />;
}
