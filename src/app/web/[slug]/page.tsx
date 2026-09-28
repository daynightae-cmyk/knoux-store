import { notFound } from "next/navigation";
import { WebDetail } from "@/components/detail/ServiceDetail";
import { findWebSystem, webSystems } from "@/data/services";
import { pageMetadata } from "@/lib/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return webSystems.map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const system = findWebSystem(slug);
  if (!system) notFound();
  return {
    ...pageMetadata(system.title, system.statement, `/web/${system.slug}`),
    title: { absolute: `${system.title} — KNOuX` },
  };
}

export default async function WebSystemPage({ params }: Props) {
  const { slug } = await params;
  const system = findWebSystem(slug);
  if (!system) notFound();
  return <WebDetail system={system} />;
}
