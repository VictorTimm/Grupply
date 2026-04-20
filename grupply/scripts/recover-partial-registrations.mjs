import fs from "node:fs";
import https from "node:https";
import path from "node:path";

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx), line.slice(idx + 1)];
      }),
  );
}

function requestJson(method, urlString, headers) {
  const url = new URL(urlString);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (!body) {
            resolve(null);
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error(`Timed out while requesting ${urlString}`));
    });
    req.end();
  });
}

function parseArgs(argv) {
  const args = {
    apply: false,
    deletePattern: null,
    createdAfter: null,
  };

  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    if (arg.startsWith("--delete-pattern=")) {
      args.deletePattern = arg.slice("--delete-pattern=".length);
    }
    if (arg.startsWith("--created-after=")) {
      args.createdAfter = arg.slice("--created-after=".length);
    }
  }

  return args;
}

function shouldDelete(orphan, filters) {
  if (!filters.apply) return false;
  if (filters.deletePattern && !(new RegExp(filters.deletePattern).test(orphan.email ?? ""))) {
    return false;
  }
  if (filters.createdAfter && orphan.createdAt < filters.createdAfter) {
    return false;
  }
  return true;
}

const env = readEnvFile();
const args = parseArgs(process.argv.slice(2));
const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  Accept: "application/json",
};
const base = env.NEXT_PUBLIC_SUPABASE_URL;

const authResponse = await requestJson("GET", `${base}/auth/v1/admin/users?per_page=200`, headers);
const profiles = await requestJson(
  "GET",
  `${base}/rest/v1/profiles?select=user_id,organization_id,first_name,last_name`,
  headers,
);
const members = await requestJson(
  "GET",
  `${base}/rest/v1/organization_members?select=user_id,organization_id,member_role`,
  headers,
);

const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
const memberMap = new Map();
for (const member of members) {
  const existing = memberMap.get(member.user_id) ?? [];
  existing.push(member);
  memberMap.set(member.user_id, existing);
}

const report = authResponse.users.map((user) => {
  const profile = profileMap.get(user.id) ?? null;
  const userMembers = memberMap.get(user.id) ?? [];
  const hasMatchingMembership =
    profile && userMembers.some((member) => member.organization_id === profile.organization_id);

  return {
    email: user.email,
    id: user.id,
    createdAt: user.created_at,
    hasProfile: Boolean(profile),
    profileOrg: profile?.organization_id ?? null,
    memberCount: userMembers.length,
    memberOrgs: userMembers.map((member) => member.organization_id),
    orphaned: !profile || userMembers.length === 0 || !hasMatchingMembership,
  };
});

const orphanedUsers = report.filter((user) => user.orphaned);
const deleted = [];
for (const orphan of orphanedUsers) {
  if (!shouldDelete(orphan, args)) continue;
  await requestJson("DELETE", `${base}/auth/v1/admin/users/${orphan.id}`, headers);
  deleted.push(orphan);
}

console.log(
  JSON.stringify(
    {
      apply: args.apply,
      deletePattern: args.deletePattern,
      createdAfter: args.createdAfter,
      orphanedCount: orphanedUsers.length,
      deletedCount: deleted.length,
      orphanedUsers,
      deleted,
    },
    null,
    2,
  ),
);
