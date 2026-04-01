#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const OWNER = "charlie2233";
const HOME_DIR = os.homedir();
const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA_DIR = path.join(REPO_ROOT, "data");
const META_PATH = path.join(DATA_DIR, "github-meta.json");
const WEEKLY_PATH = path.join(DATA_DIR, "github-weekly.json");
const LAST_UPDATED_PATH = path.join(DATA_DIR, "last-updated.txt");
const REPOS_PATH = path.join(DATA_DIR, "github-repos.json");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function runGit(repoPath, args) {
  return execFileSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function getRemoteRepo(repoPath) {
  try {
    const remote = runGit(repoPath, ["remote", "get-url", "origin"]);
    const match = remote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/i);
    if (!match) return null;

    const owner = match[1];
    const name = match[2];
    if (owner.toLowerCase() !== OWNER.toLowerCase()) return null;

    return { owner, name };
  } catch {
    return null;
  }
}

function getLocalRepoInfo(repoPath) {
  const remoteRepo = getRemoteRepo(repoPath);
  if (!remoteRepo) return null;

  try {
    const pushedAtRaw = runGit(repoPath, ["log", "-1", "--date=iso-strict", "--format=%cI"]);
    const pushedAt = new Date(pushedAtRaw).toISOString().replace(/\.\d{3}Z$/, "Z");
    const since = runGit(repoPath, ["log", '--since=7 days ago', "--format=%H"]);
    const recentCommits = since ? since.split("\n").filter(Boolean) : [];
    const defaultBranch = runGit(repoPath, ["symbolic-ref", "--short", "HEAD"]);

    return {
      name: remoteRepo.name,
      full_name: `${remoteRepo.owner}/${remoteRepo.name}`,
      html_url: `https://github.com/${remoteRepo.owner}/${remoteRepo.name}`,
      updated_at: pushedAt,
      pushed_at: pushedAt,
      default_branch: defaultBranch || "main",
      recentCommitCount: recentCommits.length,
    };
  } catch {
    return null;
  }
}

function collectLocalRepos() {
  const entries = fs.readdirSync(HOME_DIR, { withFileTypes: true });
  const repos = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    const repoPath = path.join(HOME_DIR, entry.name);
    if (!fs.existsSync(path.join(repoPath, ".git"))) continue;

    const repoInfo = getLocalRepoInfo(repoPath);
    if (repoInfo) repos.push(repoInfo);
  }

  return repos;
}

function main() {
  const existingRepos = readJson(REPOS_PATH, []);
  const existingMeta = readJson(META_PATH, {});
  const localRepos = collectLocalRepos();
  const localRepoMap = new Map(localRepos.map((repo) => [repo.full_name.toLowerCase(), repo]));

  const trackedRepos = Array.isArray(existingRepos) ? existingRepos : [];
  const trackedLocalRepos = trackedRepos
    .map((repo) => localRepoMap.get(String(repo?.full_name || "").toLowerCase()))
    .filter(Boolean);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const mostRecentPush = trackedLocalRepos
    .map((repo) => repo.pushed_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? (trackedRepos.map((repo) => repo?.pushed_at).filter(Boolean).sort().at(-1) ?? null);

  const totalStars = trackedRepos.reduce((sum, repo) => sum + Number(repo?.stargazers_count || 0), 0);
  const totalForks = trackedRepos.reduce((sum, repo) => sum + Number(repo?.forks_count || 0), 0);
  const languageCount = new Set(
    trackedRepos.map((repo) => repo?.language).filter((value) => typeof value === "string" && value.trim()),
  ).size;

  const totalCommitContributions = trackedLocalRepos.reduce((sum, repo) => sum + repo.recentCommitCount, 0);
  const totalRepositoryContributions = trackedLocalRepos.filter((repo) => repo.recentCommitCount > 0).length;
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

  const meta = {
    updatedAt: now,
    repoCount: trackedRepos.length,
    totalStars,
    totalForks,
    languageCount,
    mostRecentPush,
    source: "local-git-refresh",
  };

  const weekly = {
    updatedAt: now,
    from,
    to: now,
    totalCommitContributions,
    totalPullRequestContributions: 0,
    totalIssueContributions: 0,
    totalRepositoryContributions,
  };

  writeJson(META_PATH, meta);
  writeJson(WEEKLY_PATH, weekly);
  fs.writeFileSync(LAST_UPDATED_PATH, `${now}\n`, "utf8");
}

main();
