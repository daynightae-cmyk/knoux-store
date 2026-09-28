import { notFound } from "next/navigation";
import { CreativeDetail } from "@/components/detail/ServiceDetail";
import { creativeDisciplines, findCreativeDiscipline } from "@/data/services";
import { pageMetadata } from "@/lib/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return creativeDisciplines.map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const discipline = findCreativeDiscipline(slug);
  if (!discipline) notFound();
  return {
    ...pageMetadata(
      discipline.title,
      discipline.statement,
      `/creative/${discipline.slug}`,
    ),
    title: { absolute: `${discipline.title} — KNOuX` },
  };
}

export default async function CreativeDisciplinePage({ params }: Props) {
  const { slug } = await params;
  const discipline = findCreativeDiscipline(slug);
  if (!discipline) notFound();
  return <CreativeDetail discipline={discipline} />;
}
