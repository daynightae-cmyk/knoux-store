import { KxPortal } from '@/components/kxvpn/KxPortal';
import { kxVpnMetadata } from '@/lib/kx-vpn-metadata';

export const metadata = kxVpnMetadata('KX Private VPN Documentation', 'Practical setup, profile import, consent, network verification and troubleshooting for the KX Android WireGuard client.', '/docs/kx-private-vpn');

export default function Page() {
  return <KxPortal page="docs" />;
}
