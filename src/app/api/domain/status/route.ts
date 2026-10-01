import { activeDomainProvider } from '@/lib/domain';

/**
 * Registrar connection state, without the credentials.
 *
 * A deliberately small endpoint. The Domain Finder has to be able to say
 * whether a registrar is connected *before* anybody types a name, and the page
 * itself is statically generated — so reading `process.env` during that build
 * would bake the provider state into the HTML and serve a stale answer to every
 * visitor until the next deployment. Reading it at request time is what makes
 * the statement true rather than merely true at some point in the past.
 *
 * What crosses this boundary: a status word, a sentence explaining it, and the
 * fact that a provider is connected. What does not: an account id, a token, a
 * secret, an endpoint hostname, or any value from the environment. The
 * response shape is fixed, so adding a secret here would be a visible change
 * rather than a silent one.
 *
 * It is not rate limited, because it makes no provider call — it is a read of
 * this process's own configuration, and it cannot cost a registrar a cent.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const active = activeDomainProvider();

  return new Response(
    JSON.stringify({
      status: active.status,
      explanation: active.explanation,
      provider: active.provider?.name ?? null,
    }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    },
  );
}
