import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './helpers.mjs';

/**
 * The Arrival Chamber.
 *
 * These tests hold two lines at once. The account routes must be real,
 * rendered, accessible and keyboard-operable, while the identity path must use
 * the actual Supabase adapter rather than local token/session simulation.
 * Automated route tests disable external writes, so they cannot mutate the live
 * project while still verifying the production auth contract in source.
 */

const port = Number(process.env.KNOUX_AUTH_TEST_PORT ?? 32231);
const origin = `http://127.0.0.1:${port}`;
const env = { ...process.env, KNOUX_TEST_DISABLE_EXTERNALS: '1' };
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'],
  { env, stdio: 'ignore' },
);
after(() => server.kill());

async function waitForServer() {
  for (let attempt = 0; attempt < 140; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Server exited with ${server.exitCode}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      /* awaiting startup */
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Production server did not start');
}

const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

const authDir = join(root, 'src', 'components', 'auth');
const authLibDir = join(root, 'src', 'lib', 'auth');
const readAuthSource = () =>
  readdirSync(authDir)
    .filter((file) => file.endsWith('.tsx') || file.endsWith('.ts'))
    .map((file) => readFileSync(join(authDir, file), 'utf8'))
    .join('\n');
const readAuthLib = () =>
  readdirSync(authLibDir)
    .map((file) => readFileSync(join(authLibDir, file), 'utf8'))
    .join('\n');

test('the three account routes render as real pages', async () => {
  await waitForServer();

  for (const path of AUTH_ROUTES) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, `GET ${path} must render`);
    const html = await response.text();

    assert.match(html, /<h1[^>]*>\s*[A-Za-z]/, `${path} must have one non-empty h1`);
    assert.match(html, /rel="canonical"/, `${path} must declare a canonical URL`);
    assert.match(html, /<title>[^<]{10,}<\/title>/, `${path} must have a meaningful title`);
    assert.match(html, /name="description"/, `${path} must have a meta description`);

    // The KNOuX identity, carried by the same wordmark construction the header
    // uses. A login screen with a different logo would be a different brand.
    assert.match(html, /class="brand-dot"/, `${path} must carry the KNOuX wordmark dot`);
    assert.match(html, /KNOuX/, `${path} must name the institution`);

    // The chamber, not a template: the arrival surface and its scene exist.
    assert.match(html, /class="chamber-page/, `${path} must use the arrival chamber`);
    assert.match(html, /class="auth-panel/, `${path} must render the auth panel`);
    assert.match(html, /class="auth-field/, `${path} must render real fields`);
  }
});

test('no reference branding survives in the auth surface', async () => {
  await waitForServer();

  for (const path of AUTH_ROUTES) {
    const html = await (await fetch(origin + path)).text();
    const text = html.toLowerCase();
    for (const banned of ['embacy', 'handbag']) {
      assert.ok(!text.includes(banned), `${path} must not reference ${banned}`);
    }
    // No third-party font, script or stylesheet is fetched at runtime.
    assert.ok(!/fonts\.googleapis|fonts\.gstatic|cdn\./.test(html), `${path} must not load remote assets`);
  }
});

test('exactly Google and GitHub are offered, and neither is faked', async () => {
  await waitForServer();

  const login = await (await fetch(origin + '/login')).text();
  assert.match(login, /value="google"/, 'Google must be offered');
  assert.match(login, /value="github"/, 'GitHub must be offered');

  // The offered set is exactly these two, read from the controls themselves.
  // The document as a whole cannot be searched for provider names: Next.js
  // emits Twitter card metadata on every page, which says nothing about sign-in.
  const offered = [...login.matchAll(/class="auth-provider"[^>]*value="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(offered.sort(), ['github', 'google'], 'exactly Google and GitHub must be offered');
  for (const banned of ['twitter', 'discord', 'facebook', 'apple', 'linkedin', 'x']) {
    assert.ok(!offered.includes(banned), `no unconnected ${banned} provider may be offered`);
  }
  // And no other social control exists in the panel.
  const panel = login.slice(login.indexOf('class="auth-providers"'));
  assert.ok(!/sign in with (twitter|discord|apple|facebook)/i.test(panel), 'no unconnected provider may be advertised');

  // The controls are real submissions into the server action, and the page
  // identifies Supabase OAuth as the transport without claiming provider passwords.
  assert.match(login, /Supabase OAuth/, 'the provider transport must be stated in the DOM');
  assert.equal(
    (login.match(/aria-describedby="oauth-state"/g) || []).length,
    2,
    'both provider controls must share the visible OAuth explanation',
  );
  assert.match(
    login,
    /class="auth-provider"[^>]*type="submit"[^>]*name="provider"/,
    'provider controls must submit the provider they name',
  );
});

test('the auth surface is accessible and keyboard operable', async () => {
  await waitForServer();

  const login = await (await fetch(origin + '/login')).text();

  // Real labels, real types, real autocomplete tokens: password managers and
  // assistive technology both depend on these being exactly right. React emits
  // the attribute in camelCase in the served markup and the HTML parser
  // lowercases it, so the comparison is case-insensitive.
  assert.match(login, /<label for="[^"]+">Email<\/label>/, 'email must have a real label');
  assert.match(login, /type="email"/i, 'email must use type=email');
  assert.match(login, /autocomplete="email"/i, 'email must use autocomplete=email');
  assert.match(login, /autocomplete="current-password"/i, 'sign-in must use autocomplete=current-password');

  // The password toggle is a button that reports its state, not a click handler
  // on an icon.
  assert.match(login, /class="auth-field__toggle"[\s\S]{0,220}type="button"/, 'the toggle must be a real button');
  assert.match(login, /aria-pressed=/, 'the toggle must report its pressed state');

  // The outcome of a submission is announced once, politely.
  assert.match(login, /role="status"/, 'the form must expose a live status region');
  assert.match(login, /aria-live="polite"/, 'the status region must be polite');

  const register = await (await fetch(origin + '/register')).text();
  assert.match(register, /autocomplete="name"/i, 'registration must use autocomplete=name');
  assert.equal(
    (register.match(/autocomplete="new-password"/gi) || []).length,
    2,
    'both registration password fields must be new-password',
  );
});

test('the auth routes navigate to each other in both directions', async () => {
  await waitForServer();

  const login = await (await fetch(origin + '/login')).text();
  assert.match(login, /href="\/register"/, 'sign in must offer registration');
  assert.match(login, /href="\/forgot-password"/, 'sign in must offer recovery');

  const register = await (await fetch(origin + '/register')).text();
  assert.match(register, /href="\/login"/, 'registration must link back to sign in');

  const forgot = await (await fetch(origin + '/forgot-password')).text();
  assert.match(forgot, /href="\/login"/, 'recovery must link back to sign in');

  // The header carries a quiet way in from anywhere on the site.
  const home = await (await fetch(origin + '/')).text();
  assert.match(home, /class="header-access"[\s\S]{0,120}href="\/login"/, 'the header must link to the account entry');
});

test('the public headquarters stays public', async () => {
  await waitForServer();

  // Nothing in front of the institution requires an account, and no public
  // route redirects into the chamber.
  for (const path of ['/', '/products', '/wordpress', '/web', '/growth', '/creative', '/solutions', '/build', '/labs', '/work', '/engineering', '/about', '/contact', '/products/knoux-one']) {
    const response = await fetch(origin + path, { redirect: 'manual' });
    assert.equal(response.status, 200, `${path} must stay publicly reachable`);
    assert.ok(
      !response.headers.get('location')?.includes('/login'),
      `${path} must not redirect to sign in`,
    );
  }

  // The homepage must not have acquired an auth gate.
  const home = await (await fetch(origin + '/')).text();
  assert.ok(!/sign in to continue|authentication required/i.test(home), 'the homepage must not demand an account');
});

test('the auth contract is Supabase-backed and never invents session material', () => {
  const provider = readFileSync(join(authLibDir, 'provider.ts'), 'utf8');
  const actions = readFileSync(join(authLibDir, 'actions.ts'), 'utf8');
  const serverClient = readFileSync(join(root, 'src', 'lib', 'supabase', 'server.ts'), 'utf8');
  const callback = readFileSync(join(root, 'src', 'app', 'auth', 'callback', 'route.ts'), 'utf8');

  assert.match(provider, /hasSupabaseConfig/, 'auth readiness must come from the real Supabase configuration');
  assert.match(serverClient, /createServerClient/, 'server auth must use the Supabase SSR client');

  for (const action of [
    'signInAction',
    'signUpAction',
    'requestPasswordResetAction',
    'updatePasswordAction',
    'signOutAction',
  ]) {
    assert.match(actions, new RegExp(`function ${action}`), `${action} must exist`);
  }

  assert.match(actions, /signInWithPassword/, 'credential sign-in must reach Supabase Auth');
  assert.match(actions, /signInWithOAuth/, 'provider sign-in must reach Supabase OAuth');
  assert.match(actions, /\.auth\.signUp/, 'registration must reach Supabase Auth');
  assert.match(actions, /resetPasswordForEmail/, 'recovery must use the provider mail flow');
  assert.match(actions, /updateUser\(\{ password \}\)/, 'recovery must be able to set the new password');
  assert.match(actions, /\.auth\.signOut\(\)/, 'logout must terminate the Supabase session');
  assert.match(callback, /exchangeCodeForSession/, 'OAuth callbacks must exchange the code for a real session');
  assert.match(callback, /safeNext/, 'OAuth callback redirects must be constrained to local paths');

  const source = `${readAuthSource()}\n${readAuthLib()}`;
  for (const banned of [
    'localStorage.setItem',
    'sessionStorage.setItem(\'token',
    'Bearer ',
    'service_role',
    'console.log',
  ]) {
    assert.ok(!source.includes(banned), `the auth layer must not contain ${banned}`);
  }

  const writers = readdirSync(authDir)
    .filter((file) => (file.endsWith('.tsx') || file.endsWith('.ts')))
    .filter((file) => /sessionStorage|localStorage/.test(readFileSync(join(authDir, file), 'utf8')));
  assert.deepEqual(writers, ['choreography.ts'], 'only arrival choreography may touch browser storage');
  const choreography = readFileSync(join(authDir, 'choreography.ts'), 'utf8');
  assert.match(choreography, /SEEN_KEY = 'knoux\.arrival\.seen'/, 'the stored key must be the arrival flag');
  assert.ok(!/localStorage/.test(choreography), 'the arrival flag must not outlive the session');
});

test('validation is shared, honest and does not invent a security policy', async () => {
  await waitForServer();

  const validation = readFileSync(join(authLibDir, 'validation.ts'), 'utf8');
  assert.match(validation, /export function validateSignIn/, 'sign-in must validate on the server');
  assert.match(validation, /export function validateSignUp/, 'registration must validate on the server');
  assert.match(validation, /export function validatePasswordReset/, 'recovery must validate on the server');

  // A length floor only. Composition rules would be the interface inventing a
  // policy on behalf of a provider that has not been chosen.
  assert.match(validation, /PASSWORD_MINIMUM = 8/, 'a length floor must be declared in one place');
  assert.ok(
    !/must contain an uppercase|at least one number|special character/i.test(validation),
    'no composition rules may be invented without a backend requirement',
  );

  // The forms submit through the server action, so nothing is judged in the
  // browser and nothing is decided there either.
  for (const route of ['/login', '/register', '/forgot-password']) {
    const html = await (await fetch(origin + route)).text();
    assert.ok(!/onSubmit=\{handleSubmit\}/.test(html), `${route} must not hand-roll a submit handler`);
  }
});

test('the chamber renders a finished interface before any motion runs', async () => {
  const css = readFileSync(join(root, 'src', 'app', 'globals.css'), 'utf8');

  // The rise is an enhancement. The hidden pre-rise state is scoped to the
  // marker that a pre-paint script sets, and that script declines to set it for
  // reduced motion. So a visitor without scripting, or without motion, is never
  // left looking at an empty room.
  assert.match(
    css,
    /html\[data-chamber="armed"\] \.auth-panel\{/,
    'the hidden panel state must be scoped to the armed marker',
  );
  const boot = readFileSync(join(authDir, 'ChamberBoot.tsx'), 'utf8');
  assert.match(boot, /prefers-reduced-motion/, 'the boot marker must respect reduced motion');
  assert.match(
    css,
    /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.auth-panel[^{]*\{opacity:1!important/,
    'reduced motion must force the panel visible',
  );
  // Reduced motion must also stand the figure down at its destination, so it is
  // never caught mid-travel or parked off the left edge.
  assert.match(
    css,
    /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.arrival-figure__leg[^{]*\{animation:none!important/,
    'reduced motion must stop the walk cycle',
  );
  // Pointer response is gated to fine pointers, so a touch device never pays
  // for a transform it cannot trigger.
  assert.match(css, /@media\(pointer:coarse\)\{[\s\S]*?\.chamber__plane[^{]*\{transform:none!important/,
    'coarse pointers must not move the environment');

  // The identity on the auth route is sampled from the canonical mark rather
  // than redrawn, so it cannot drift from the homepage.
  const field = readFileSync(join(root, 'src', 'lib', 'knouxField.ts'), 'utf8');
  assert.match(field, /buildMarkSamples/, 'the chamber mark must be sampled from the canonical geometry');
  assert.match(field, /function seeded\(|mulberry/i, 'the field must be deterministically seeded');
  // Comments are allowed to name the function this replaces; code is not.
  const fieldCode = field.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.ok(!/Math\.random\(/.test(fieldCode), 'the particle identity must never be random');

  // One canvas, not a second permanent WebGL renderer on the auth route.
  const scene = readFileSync(join(authDir, 'AuthScene.tsx'), 'utf8');
  assert.ok(!/react-three-fiber|@react-three|<Canvas/.test(scene), 'the auth scene must not mount a second WebGL renderer');
  const rendered = await Promise.all(AUTH_ROUTES.map((path) => fetch(origin + path).then((r) => r.text())));
  for (const html of rendered) {
    assert.ok(!/three\.module|\.js\?.*three/i.test(html), 'no three.js payload may be shipped to the auth routes');
  }
});
