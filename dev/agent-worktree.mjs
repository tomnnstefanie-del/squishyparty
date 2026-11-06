// Gives a coding agent its own copy of the repo for one issue, so several agents can work at once without clashing.
//   npm run agent:worktree -- 12 dashboard-filters   -> ../squishyparty-12-dashboard-filters on branch agent/12-dashboard-filters
//   npm run agent:worktree -- --remove 12 dashboard-filters   (after the PR is merged or closed)
// Always starts from the latest origin/main. Never touches the checkout you run it from (no stash, reset or branch switch).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...a) => execFileSync('git', a, { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

const args = process.argv.slice(2), remove = args[0] === '--remove';
const [issue, slug] = remove ? args.slice(1) : args;
if (!/^\d+$/.test(issue || '') || !/^[a-z0-9-]{2,40}$/.test(slug || '')) {
  console.error('Usage: npm run agent:worktree -- [--remove] <issue number> <short-slug>');
  process.exit(1);
}
const branch = `agent/${issue}-${slug}`;
const dir = path.resolve(root, '..', `${path.basename(root)}-${issue}-${slug}`);

if (remove) {
  // Unlink the shared node_modules first: `git worktree remove` would otherwise delete the real packages through it.
  const link = path.join(dir, 'node_modules');
  try { if (fs.lstatSync(link).isSymbolicLink()) fs.unlinkSync(link); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (fs.existsSync(link)) { console.error(`${link} is not a link; remove it yourself before removing the worktree.`); process.exit(1); }
  git('worktree', 'remove', dir);
  console.log(`Removed ${dir}. The branch ${branch} is kept; delete it on GitHub when the PR is closed.`);
  process.exit(0);
}
if (fs.existsSync(dir)) { console.error(`${dir} already exists.`); process.exit(1); }

git('fetch', 'origin', 'main');
git('worktree', 'add', '--no-track', '-b', branch, dir, 'origin/main');
// Share the installed packages instead of a fresh npm install (node_modules is git-ignored).
const nm = path.join(root, 'node_modules');
if (fs.existsSync(nm)) fs.symlinkSync(nm, path.join(dir, 'node_modules'), 'junction');

console.log(`Ready: ${dir}
Branch: ${branch} (from origin/main)
Next: cd there, make the change, npm run check, git push -u origin ${branch}, open a draft PR that says "Closes #${issue}".`);
