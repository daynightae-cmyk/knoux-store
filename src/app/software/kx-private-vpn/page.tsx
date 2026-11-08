import { KxPortal } from '@/components/kxvpn/KxPortal';
import { kxVpnMetadata } from '@/lib/kx-vpn-metadata';

export const metadata = kxVpnMetadata('KX Private VPN — Android WireGuard client', 'Evidence-led native Android WireGuard VPN client under development. Secure local profiles, routing controls, real system consent, and transparent testing status.', '/software/kx-private-vpn');

export default function Page() {
  return <KxPortal page="overview" />;
}
