import { HomeExperience } from '@/components/HomeExperience';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('Digital Headquarters', 'Engineering digital systems. Discover the products and practice of KNOuX.', '/');
export default function Home() { return <HomeExperience />; }
