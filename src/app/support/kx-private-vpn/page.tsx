import { KxPortal } from '@/components/kxvpn/KxPortal';
import { kxVpnMetadata } from '@/lib/kx-vpn-metadata';

export const metadata = kxVpnMetadata('KX Private VPN Support', 'Find help, report issues and prepare safe, reproducible diagnostics for KX Private VPN Android.', '/support/kx-private-vpn');

export default function Page() {
  return <KxPortal page="support" />;
}
