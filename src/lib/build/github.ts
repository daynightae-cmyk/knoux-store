import type { GitHubRepository } from './integration-types';

/** Strictly public GitHub coordinates; no credentials, query, fragments or shell input. */
export function parseGitHubRepository(input: unknown): { owner: string; repository: string; url: string } | null {
  if (typeof input !== 'string' || input.length > 300) return null;
  const text = input.trim();
  const match = /^(?:https:\/\/github\.com\/)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_][A-Za-z0-9_.-]{0,99})\/?$/.exec(text);
  if (!match) return null;
  const repository = match[2].replace(/\.git$/, '');
  if (!repository || repository === '.' || repository === '..' || repository.endsWith('.')) return null;
  return { owner: match[1], repository, url: `https://github.com/${match[1]}/${repository}` };
}

type ApiRepo = { full_name: string; html_url: string; description: string | null; private: boolean; default_branch: string; language: string | null; updated_at: string; owner: { login: string } };

export class GitHubIntegrationAdapter {
  private readonly token: string | null;
  private readonly fetcher: typeof fetch;
  constructor(token: string | null = null, fetcher: typeof fetch = fetch) { this.token = token; this.fetcher = fetcher; }
  private async request(endpoint: string): Promise<unknown> {
    const response = await this.fetcher(`https://api.github.com${endpoint}`, {
      headers: { accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(this.token ? { authorization: `Bearer ${this.token}` } : {}) },
      signal: AbortSignal.timeout(10000), cache: 'no-store', redirect: 'error',
    });
    if (!response.ok) throw new Error(response.status === 404 ? 'Repository unavailable or requires authentication.' : response.status === 403 || response.status === 429 ? 'GitHub rate limit or permission refused. Retry later or configure a scoped server token.' : `GitHub request failed (${response.status}).`);
    return response.json();
  }
  private project(repo: ApiRepo, sha: string | null): GitHubRepository {
    return { fullName: repo.full_name, url: repo.html_url, description: repo.description, private: repo.private, defaultBranch: repo.default_branch, language: repo.language, updatedAt: repo.updated_at, latestCommit: sha, owner: repo.owner.login };
  }
  async resolve(input: string): Promise<GitHubRepository> {
    const coordinate = parseGitHubRepository(input);
    if (!coordinate) throw new Error('Use owner/repository or an HTTPS github.com repository URL.');
    const endpoint = `/repos/${coordinate.owner}/${coordinate.repository}`;
    const repo = await this.request(endpoint) as ApiRepo;
    let sha: string | null = null;
    try { const commit = await this.request(`${endpoint}/commits/${encodeURIComponent(repo.default_branch)}`) as { sha?: string }; sha = commit.sha && /^[a-f0-9]{40}$/.test(commit.sha) ? commit.sha : null; } catch { /* Repository metadata is useful even when commit access is refused. */ }
    return this.project(repo, sha);
  }
  async list(): Promise<GitHubRepository[]> {
    if (!this.token) throw new Error('REQUIRES AUTHENTICATION. Set KNOUX_BUILD_GITHUB_TOKEN server-side with repository metadata read access.');
    const repos = await this.request('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member') as ApiRepo[];
    return repos.map((repo) => this.project(repo, null));
  }
}
