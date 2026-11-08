import { KxPortal } from '@/components/kxvpn/KxPortal';
import { kxVpnMetadata } from '@/lib/kx-vpn-metadata';

export const metadata = kxVpnMetadata('KX Private VPN Privacy Policy', 'Privacy disclosure for the KX Android VPN client: local encrypted profiles, network permissions, third parties and development limitations.', '/legal/kx-private-vpn/privacy');

export default function Page() {
  return <KxPortal page="privacy" />;
}
