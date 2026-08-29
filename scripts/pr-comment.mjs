#!/usr/bin/env node
/**
 * Posts the guard's verdict as ONE sticky pull-request comment — created on
 * the first run, updated in place ever after. A guard that piles up a new
 * comment per push gets uninstalled by Friday; this one holds a single post.
 *
 * Needs: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH (all standard in
 * a workflow run). Outside a pull request it prints and exits quietly.
 */
import { readFileSync } from 'node:fs';
import { markdownReport } from '../src/report.mjs';

const MARKER = '<!-- guard-my-design-system -->';

const findingsFile = process.argv[2];
const { findings } = JSON.parse(readFileSync(findingsFile, 'utf8'));
const body = `${MARKER}\n${markdownReport(findings)}`;

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : null;
const pr = event?.pull_request?.number;

if (!token || !repo || !pr) {
  console.log(markdownReport(findings));
  console.log('\nguard: not a pull request context (or no GITHUB_TOKEN) — printed instead of commented.');
  process.exit(0);
}

const api = async (path, init = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`);
  return res.json();
};

try {
  const comments = await api(`/repos/${repo}/issues/${pr}/comments?per_page=100`);
  const mine = comments.find((c) => c.body?.startsWith(MARKER));

  if (mine) {
    await api(`/repos/${repo}/issues/comments/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
    console.log(`guard: updated comment on #${pr} (${findings.length} finding${findings.length === 1 ? '' : 's'})`);
  } else {
    await api(`/repos/${repo}/issues/${pr}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
    console.log(`guard: commented on #${pr} (${findings.length} finding${findings.length === 1 ? '' : 's'})`);
  }
} catch (e) {
  // A fork PR's token is read-only, and a workflow without pull-requests:
  // write cannot comment either. The guard still did its job; the verdict
  // just lands in the log instead of on the pull request.
  console.log(markdownReport(findings));
  console.log(`\nguard: could not post the comment (usually a fork PR's read-only token, or the workflow is missing "pull-requests: write"). The verdict is above instead. (${e.message.split('\n')[0]})`);
  process.exit(0);
}
