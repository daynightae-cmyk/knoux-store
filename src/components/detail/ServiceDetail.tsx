import Link from "next/link";
import { Breadcrumb } from "@/components/DivisionShell";
import { capabilityById } from "@/data/capabilities";
import { entityById } from "@/data/composer-rules";
import type { CreativeDiscipline, WebSystem } from "@/data/services";
import styles from "./ServiceDetail.module.css";

type Division = "web" | "creative";

function capabilityRoute(providedBy: readonly string[]): string {
  if (providedBy.includes("web")) return "/web#matrix";
  if (providedBy.includes("wordpress")) return "/wordpress";
  if (providedBy.includes("growth")) return "/growth";
  if (providedBy.includes("creative")) return "/creative";
  return "/products";
}

const geometry: Record<
  string,
  { name: string; path: string }
> = {
  "corporate-site": {
    name: "Editorial grid",
    path: "M40 40H560M40 136H560M40 232H560M40 328H560M40 40V328M214 40V328M388 40V328M560 40V328",
  },
  ecommerce: {
    name: "Catalogue to checkout",
    path: "M48 184H154L205 100H312L370 184H456L548 184M456 184L508 142M456 184L508 226M205 100V268M312 100V268M205 268H312",
  },
  "web-application": {
    name: "State and permission topology",
    path: "M70 184L212 70L340 184L212 298ZM340 184L520 80M340 184L520 288M212 70L520 80M212 298L520 288",
  },
  "customer-portal": {
    name: "Scoped identity boundary",
    path: "M300 42A142 142 0 1 1 299 42M300 102A82 82 0 1 1 299 102M300 150A34 34 0 1 1 299 150M70 184H160M440 184H530",
  },
  "admin-dashboard": {
    name: "Information planes",
    path: "M40 56H560M40 120H560M40 184H560M40 248H560M40 312H560M40 56V312M170 56V312M300 56V312M430 56V312M560 56V312M40 184H300M300 120H560",
  },
  "interactive-experience": {
    name: "Progressive spatial layers",
    path: "M300 38L510 110V258L300 330L90 258V110ZM300 38V184L510 258M300 184L90 258M300 184L510 110M300 184L90 110M300 184V330",
  },
  "brand-identity": {
    name: "Mark construction",
    path: "M78 300L210 70L340 300M128 210H288M390 70V300M390 70H520M390 184H500M390 300H520",
  },
  "ui-ux": {
    name: "Focus and state flow",
    path: "M45 72H185V146H45ZM230 72H370V146H230ZM415 72H555V146H415ZM45 222H185V296H45ZM230 222H370V296H230ZM415 222H555V296H415ZM185 109H230M370 109H415M485 146V222M415 259H370M230 259H185",
  },
  "art-direction": {
    name: "Editorial field",
    path: "M45 42H555M45 328H555M45 42V328M555 42V328M220 42V328M45 120H220M220 246H555M300 82H505M300 112H470M300 142H520",
  },
  "campaign-creative": {
    name: "Variant matrix",
    path: "M65 58H535M65 140H535M65 222H535M65 304H535M65 58V304M222 58V304M379 58V304M535 58V304M92 90L195 110M249 110L350 84M405 90L510 110M92 172L195 192M249 192L350 166M405 172L510 192",
  },
  "social-content": {
    name: "Publishing cadence",
    path: "M50 72H550M50 148H550M50 224H550M50 300H550M50 72V300M175 72V300M300 72V300M425 72V300M550 72V300M75 112H150M200 188H275M325 264H400M450 112H525",
  },
  motion: {
    name: "Timing and transition",
    path: "M45 292C90 292 100 74 180 74S270 292 345 292S440 74 555 74M45 292H555M45 74V292M180 74V292M345 74V292M555 74V292",
  },
  "product-visuals": {
    name: "Lighting and scale reference",
    path: "M300 54L468 132V266L300 336L132 266V132ZM300 54V196L468 266M300 196L132 266M300 196L468 132M300 196L132 132M300 196V336M58 54L92 54M58 54V302M58 302H92",
  },
  presentation: {
    name: "Narrative sequence",
    path: "M60 72H205V292H60ZM228 92H373V272H228ZM396 112H541V252H396ZM205 182H228M373 182H396M85 118H180M85 148H160M253 132H348M253 162H322M421 152H516M421 182H490",
  },
};

function DetailVisual({ slug, labels }: { slug: string; labels: string[] }) {
  const profile = geometry[slug];
  return (
    <div
      className={`${styles.visual} ${styles[slug.replaceAll("-", "_")] ?? ""}`}
      aria-label={`${profile.name} diagram`}
      role="img"
    >
      <div className={styles.visualTop}>
        <span>FIG. {slug.toUpperCase().replaceAll("-", " / ")}</span>
        <span>{profile.name}</span>
      </div>
      <svg
        viewBox="0 0 600 370"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <path className={styles.visualTrace} d={profile.path} />
        <path className={styles.visualAccent} d={profile.path} />
      </svg>
      <div className={styles.visualLabels}>
        {labels.slice(0, 4).map((label, index) => (
          <span key={label}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Action({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      className={`${styles.action} ${primary ? styles.actionPrimary : ""}`}
      href={href}
    >
      {children}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}

function Section({
  index,
  title,
  children,
  id,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section className={styles.section} id={id}>
      <div className={styles.sectionHead}>
        <span>{index}</span>
        <h2>{title}</h2>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function CapabilityLinks({ ids }: { ids: string[] }) {
  return (
    <div className={styles.capabilities}>
      {ids.map((id) => {
        const capability = capabilityById.get(id);
        if (!capability) return null;
        const entity = entityById.get(id);
        const route = entity?.route ?? capabilityRoute(capability.providedBy);
        return (
          <Link href={route} key={id}>
            <span>{capability.label}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        );
      })}
    </div>
  );
}

function RelatedLinks({
  ids,
  currentId,
}: {
  ids: string[];
  currentId: string;
}) {
  const links = ids.flatMap((id) => {
    if (id === currentId) return [];
    const entity = entityById.get(id);
    if (entity?.route)
      return [
        { id, label: entity.name, route: entity.route, code: entity.code },
      ];
    const capability = capabilityById.get(id);
    if (capability)
      return [
        {
          id,
          label: capability.label,
          route: capabilityRoute(capability.providedBy),
          code: "CAP",
        },
      ];
    return [];
  });
  return (
    <div className={styles.related}>
      {links.map((item) => (
        <Link key={item.id} href={item.route}>
          <span>{item.code}</span>
          <strong>{item.label}</strong>
          <span aria-hidden="true">↗</span>
        </Link>
      ))}
    </div>
  );
}

function DetailFrame({
  division,
  slug,
  code,
  category,
  title,
  subtitle,
  statement,
  visualLabels,
  primaryHref,
  requestHref,
  children,
}: {
  division: Division;
  slug: string;
  code: string;
  category: string;
  title: string;
  subtitle: string;
  statement: string;
  visualLabels: string[];
  primaryHref: string;
  requestHref: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page} data-division={division}>
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <Breadcrumb path={`/${division}/${slug}`} />
          <div className={styles.identity}>
            <span>
              {code} / {category}
            </span>
            <span>KNOuX {division.toUpperCase()}</span>
          </div>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <h1>{title}</h1>
              <p className={styles.subtitle}>{subtitle}</p>
              <p className={styles.statement}>{statement}</p>
              <div className={styles.actions}>
                <Action href={primaryHref} primary>
                  Compose this {division === "web" ? "system" : "discipline"}
                </Action>
                <Action href={requestHref}>
                  Request this {division === "web" ? "system" : "discipline"}
                </Action>
              </div>
            </div>
            <DetailVisual slug={slug} labels={visualLabels} />
          </div>
        </div>
      </div>
      <div className={styles.content}>{children}</div>
      <div className={styles.endcap}>
        <span>{code} / NEXT STEP</span>
        <h2>Define the brief.</h2>
        <p>{subtitle}</p>
        <div className={styles.actions}>
          <Action href={primaryHref} primary>
            Open Composer
          </Action>
          <Action href={requestHref}>Start a request</Action>
        </div>
      </div>
    </main>
  );
}

export function WebDetail({ system }: { system: WebSystem }) {
  const preset = `I need ${system.title.toLowerCase()}. ${system.tagline}.`;
  const primaryHref = `/build?preset=${encodeURIComponent(preset)}`;
  const requestHref = `/contact?requestType=web&system=${system.slug}`;
  return (
    <DetailFrame
      division="web"
      slug={system.slug}
      code={system.code}
      category={system.category.toUpperCase()}
      title={system.title}
      subtitle={system.tagline}
      statement={system.statement}
      visualLabels={system.disciplines.map((item) => item.label)}
      primaryHref={primaryHref}
      requestHref={requestHref}
    >
      <Section index="01 / ARCHITECTURE" title="The disciplines">
        <div className={styles.cards}>
          {system.disciplines.map((item, index) => (
            <article key={item.label} className={styles.card}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section index="02 / HANDOVER" title="What the build contains">
        <ol className={styles.list}>
          {system.artefacts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </Section>
      <Section index="03 / PLATFORM" title="Starting points">
        <div className={styles.notes}>
          {system.platformNotes.map((item, index) => (
            <p key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item}
            </p>
          ))}
        </div>
      </Section>
      <Section
        index="04 / SCOPE"
        title="Questions that change the architecture"
      >
        <ol className={styles.questions}>
          {system.qualifiers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </Section>
      <Section index="05 / CONNECTIONS" title="Connected capabilities">
        <CapabilityLinks ids={system.capabilityIds} />
        <h3 className={styles.subhead}>Related across KNOuX</h3>
        <RelatedLinks ids={system.relatedEntityIds} currentId={system.id} />
      </Section>
    </DetailFrame>
  );
}

export function CreativeDetail({
  discipline,
}: {
  discipline: CreativeDiscipline;
}) {
  const preset = `I need ${discipline.title.toLowerCase()} for a build. ${discipline.subtitle}.`;
  const primaryHref = `/build?preset=${encodeURIComponent(preset)}`;
  const requestHref = `/contact?requestType=creative&discipline=${discipline.slug}`;
  return (
    <DetailFrame
      division="creative"
      slug={discipline.slug}
      code={discipline.code}
      category="DISCIPLINE"
      title={discipline.title}
      subtitle={discipline.subtitle}
      statement={discipline.statement}
      visualLabels={discipline.deliverables}
      primaryHref={primaryHref}
      requestHref={requestHref}
    >
      <Section index="01 / OUTPUT" title="Deliverables">
        <ol className={styles.list}>
          {discipline.deliverables.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </Section>
      <Section index="02 / METHOD" title="Operating principles">
        <div className={styles.principles}>
          {discipline.principles.map((item, index) => (
            <p key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item}
            </p>
          ))}
        </div>
      </Section>
      <Section index="03 / CONNECTIONS" title="Capability relationships">
        <CapabilityLinks ids={discipline.capabilityIds} />
        <h3 className={styles.subhead}>Pairs with</h3>
        <RelatedLinks ids={discipline.pairsWith} currentId={discipline.id} />
      </Section>
    </DetailFrame>
  );
}
