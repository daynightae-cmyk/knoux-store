import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findSoftwareProduct, softwareProducts } from '@/data/software';
import { ProductExperience } from '@/components/products/ProductExperience';
import { pageMetadata } from '@/lib/metadata';

export function generateStaticParams() {
  return softwareProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = findSoftwareProduct(slug);
  if (!product) return pageMetadata('Product not found', 'This KNOuX product route does not exist.', '/products');
  return pageMetadata(
    product.name,
    `${product.tagline}. ${product.statement.split('.')[0]}. Evidence and stated limitations from the public repository.`,
    `/products/${product.slug}`,
  );
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = findSoftwareProduct(slug);
  if (!product) notFound();

  const index = softwareProducts.findIndex((entry) => entry.id === product.id);
  const previous = index > 0 ? softwareProducts[index - 1] : undefined;
  const next = index < softwareProducts.length - 1 ? softwareProducts[index + 1] : undefined;
  const related = product.relatedIds
    .map((id) => softwareProducts.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return (
    <ProductExperience product={product} previous={previous} next={next} related={related} />
  );
}
