import { permanentRedirect } from 'next/navigation';

/** The One Platform constellation is the Build entry itself now. */
export default function Page() { permanentRedirect('/build'); }