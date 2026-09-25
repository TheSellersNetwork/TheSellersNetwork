/*
  Applies every migration to an in-memory Postgres (PGlite), exercises the
  triggers and policies that matter, then applies every down script and
  checks nothing is left behind. Run with `npm run test:db`.

  The Supabase auth schema and roles do not exist in PGlite, so a small stub
  is created first. auth.uid() reads request.jwt.claim.sub, the same setting
  PostgREST uses, so tests can act as a given member with set_config.
*/

import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const upDir = path.join(root, "supabase", "migrations");
const downDir = path.join(upDir, "down");

const db = new PGlite();
let failures = 0;

async function step(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${error.message.split("\n")[0]}`);
  }
}

// A write blocked by RLS or by a missing grant both count as denied.
const DENIED = ["row-level security", "permission denied"];

async function expectError(promise, fragment) {
  const fragments = Array.isArray(fragment) ? fragment : [fragment];
  try {
    await promise;
  } catch (error) {
    if (!fragment || fragments.some((f) => error.message.includes(f))) return;
    throw new Error(`expected error containing "${fragments.join('" or "')}", got: ${error.message}`);
  }
  throw new Error(`expected an error${fragment ? ` containing "${fragments.join('" or "')}"` : ""}`);
}

async function actAs(userId, role = "authenticated") {
  await db.exec(`
    select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);
    select set_config('request.jwt.claim.role', '${role}', false);
  `);
}

async function asUser(userId, sql, params) {
  // Policies are enforced for non-superuser roles, so switch role for the call.
  await actAs(userId);
  await db.exec("set role authenticated");
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

async function asAnon(sql, params) {
  await actAs(null, "anon");
  await db.exec("set role anon");
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

const sqlFiles = async (dir) =>
  (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

console.log("Stubbing Supabase auth schema and roles");
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid
    language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text
    language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
`);

console.log("Applying up migrations");
for (const file of await sqlFiles(upDir)) {
  await step(file, async () => {
    await db.exec(await readFile(path.join(upDir, file), "utf8"));
  });
}

if (failures > 0) {
  console.log(`\n${failures} migration(s) failed to apply, stopping.`);
  process.exit(1);
}

console.log("Exercising schema");

// Fixtures, inserted as superuser so RLS does not interfere with setup.
const ids = {};
await step("fixtures", async () => {
  const users = await db.query(`
    insert into auth.users (email) values
      ('staff@example.test'), ('newbie@example.test'), ('regular@example.test'), ('member@example.test')
    returning id
  `);
  [ids.staff, ids.newbie, ids.regular, ids.member] = users.rows.map((r) => r.id);
  await db.query(
    `insert into public.profiles (id, username, display_name, trust_level, is_staff, marketplaces) values
      ($1, 'tom', 'Tom', 4, true, '{ebay,amazon}'),
      ($2, 'newbie', null, 0, false, '{vinted}'),
      ($3, 'regular', 'A Regular', 3, false, '{ebay}'),
      ($4, 'member', null, 2, false, '{facebook,other}')`,
    [ids.staff, ids.newbie, ids.regular, ids.member],
  );
  const cats = await db.query(`
    insert into public.categories (slug, name, colour, position, min_account_age_hours) values
      ('ebay', 'eBay', 'ebay', 1, 0),
      ('wins', 'Wins and case studies', 'general', 2, 24)
    returning id, slug
  `);
  for (const row of cats.rows) ids[`cat_${row.slug}`] = row.id;
  const sub = await db.query(
    `insert into public.categories (slug, name, colour, position, parent_id)
     values ('ebay-postage', 'Postage and packaging', 'ebay', 1, $1) returning id`,
    [ids.cat_ebay],
  );
  ids.cat_postage = sub.rows[0].id;
});

await step("username must be lowercase and valid", async () => {
  await expectError(
    db.query(`insert into public.profiles (id, username) values (gen_random_uuid(), 'Bad Name')`),
    "profiles_username_format",
  );
});

await step("marketplaces are validated", async () => {
  await expectError(
    db.query(`update public.profiles set marketplaces = '{ebay,shopee}' where id = $1`, [ids.member]),
    "profiles_marketplaces_valid",
  );
});

await step("categories nest one level only", async () => {
  await expectError(
    db.query(
      `insert into public.categories (slug, name, parent_id) values ('too-deep', 'Too deep', $1)`,
      [ids.cat_postage],
    ),
    "one level",
  );
});

await step("member can create a topic and its opening post", async () => {
  const topic = await asUser(
    ids.member,
    `insert into public.topics (title, category_id, author_id) values ($1, $2, $3) returning id, slug, short_id`,
    ["Royal Mail Tracked 24 versus Tracked 48", ids.cat_postage, ids.member],
  );
  ids.topic = topic.rows[0].id;
  if (topic.rows[0].slug !== "royal-mail-tracked-24-versus-tracked-48") {
    throw new Error(`unexpected slug ${topic.rows[0].slug}`);
  }
  if (!/^[0-9a-f]{8}$/.test(topic.rows[0].short_id)) {
    throw new Error(`unexpected short_id ${topic.rows[0].short_id}`);
  }
  const post = await asUser(
    ids.member,
    `insert into public.posts (topic_id, author_id, body_md) values ($1, $2, $3) returning post_number`,
    [ids.topic, ids.member, "Opening post body."],
  );
  if (post.rows[0].post_number !== 1) throw new Error("opening post should be number 1");
});

await step("reply increments post_number and reply_count", async () => {
  const reply = await asUser(
    ids.regular,
    `insert into public.posts (topic_id, author_id, body_md) values ($1, $2, $3) returning id, post_number`,
    [ids.topic, ids.regular, "A reply."],
  );
  ids.reply = reply.rows[0].id;
  if (reply.rows[0].post_number !== 2) throw new Error("reply should be number 2");
  const t = await db.query(`select reply_count, last_poster_id from public.topics where id = $1`, [ids.topic]);
  if (t.rows[0].reply_count !== 1) throw new Error(`reply_count ${t.rows[0].reply_count}`);
  if (t.rows[0].last_poster_id !== ids.regular) throw new Error("last_poster_id not updated");
  const c = await db.query(`select topic_count, post_count from public.categories where id = $1`, [ids.cat_postage]);
  if (c.rows[0].topic_count !== 1 || c.rows[0].post_count !== 2) throw new Error("category counters wrong");
});

await step("duplicate body within ten minutes is rejected", async () => {
  await expectError(
    asUser(
      ids.regular,
      `insert into public.posts (topic_id, author_id, body_md) values ($1, $2, $3)`,
      [ids.topic, ids.regular, "A reply."],
    ),
    "duplicate_post",
  );
});

await step("cannot post as someone else", async () => {
  await expectError(
    asUser(
      ids.regular,
      `insert into public.posts (topic_id, author_id, body_md) values ($1, $2, $3)`,
      [ids.topic, ids.member, "Impersonation."],
    ),
    DENIED,
  );
});

await step("signed-out visitor can read but not write", async () => {
  const r = await asAnon(`select count(*)::int as n from public.posts`);
  if (r.rows[0].n !== 2) throw new Error(`anon saw ${r.rows[0].n} posts`);
  await expectError(
    asAnon(`insert into public.posts (topic_id, author_id, body_md) values ($1, $2, 'x')`, [ids.topic, ids.member]),
    DENIED,
  );
});

await step("new account cannot post in a 24 hour category", async () => {
  await expectError(
    asUser(
      ids.newbie,
      `insert into public.topics (title, category_id, author_id) values ('My first win', $1, $2)`,
      [ids.cat_wins, ids.newbie],
    ),
    DENIED,
  );
});

await step("TL0 is capped at three topics a day", async () => {
  for (let i = 1; i <= 3; i += 1) {
    await asUser(
      ids.newbie,
      `insert into public.topics (title, category_id, author_id) values ($1, $2, $3)`,
      [`Newbie topic number ${i}`, ids.cat_ebay, ids.newbie],
    );
  }
  await expectError(
    asUser(
      ids.newbie,
      `insert into public.topics (title, category_id, author_id) values ('One too many', $1, $2)`,
      [ids.cat_ebay, ids.newbie],
    ),
    DENIED,
  );
});

await step("likes update post, topic and author counters", async () => {
  await asUser(ids.member, `insert into public.likes (user_id, post_id) values ($1, $2)`, [ids.member, ids.reply]);
  const p = await db.query(`select like_count from public.posts where id = $1`, [ids.reply]);
  const t = await db.query(`select like_count from public.topics where id = $1`, [ids.topic]);
  const a = await db.query(`select likes_received from public.profiles where id = $1`, [ids.regular]);
  if (p.rows[0].like_count !== 1 || t.rows[0].like_count !== 1 || a.rows[0].likes_received !== 1) {
    throw new Error("like counters not updated");
  }
  await asUser(ids.member, `delete from public.likes where user_id = $1 and post_id = $2`, [ids.member, ids.reply]);
  const p2 = await db.query(`select like_count from public.posts where id = $1`, [ids.reply]);
  if (p2.rows[0].like_count !== 0) throw new Error("unlike did not decrement");
});

await step("editing stores a revision and clears the cached render", async () => {
  await db.query(`update public.posts set body_html = '<p>A reply.</p>' where id = $1`, [ids.reply]);
  await asUser(ids.regular, `update public.posts set body_md = 'An edited reply.' where id = $1`, [ids.reply]);
  const p = await db.query(`select edit_count, edited_at, body_html from public.posts where id = $1`, [ids.reply]);
  if (p.rows[0].edit_count !== 1 || !p.rows[0].edited_at || p.rows[0].body_html !== null) {
    throw new Error("edit bookkeeping wrong");
  }
  const r = await db.query(`select body_md, editor_id from public.post_revisions where post_id = $1`, [ids.reply]);
  if (r.rows.length !== 1 || r.rows[0].body_md !== "A reply." || r.rows[0].editor_id !== ids.regular) {
    throw new Error("revision not recorded");
  }
});

await step("TL0 cannot edit posts", async () => {
  const own = await asUser(
    ids.newbie,
    `insert into public.posts (topic_id, author_id, body_md) values ($1, $2, 'Newbie reply.') returning id`,
    [ids.topic, ids.newbie],
  );
  await expectError(
    asUser(ids.newbie, `update public.posts set body_md = 'Changed.' where id = $1`, [own.rows[0].id]),
    "edit_not_allowed",
  );
});

await step("member cannot raise own trust level or staff flag", async () => {
  await asUser(ids.member, `update public.profiles set trust_level = 4, is_staff = true, bio = 'Hello' where id = $1`, [ids.member]);
  const p = await db.query(`select trust_level, is_staff, bio from public.profiles where id = $1`, [ids.member]);
  if (p.rows[0].trust_level !== 2 || p.rows[0].is_staff !== false || p.rows[0].bio !== "Hello") {
    throw new Error("protected columns changed or allowed column blocked");
  }
});

await step("author cannot pin own topic, staff can", async () => {
  await asUser(ids.member, `update public.topics set is_pinned = true where id = $1`, [ids.topic]);
  let t = await db.query(`select is_pinned from public.topics where id = $1`, [ids.topic]);
  if (t.rows[0].is_pinned) throw new Error("author pinned a topic");
  await asUser(ids.staff, `update public.topics set is_pinned = true where id = $1`, [ids.topic]);
  t = await db.query(`select is_pinned from public.topics where id = $1`, [ids.topic]);
  if (!t.rows[0].is_pinned) throw new Error("staff could not pin");
});

await step("author can mark own topic solved", async () => {
  await asUser(ids.member, `update public.topics set is_solved = true, solution_post_id = $2 where id = $1`, [ids.topic, ids.reply]);
  const t = await db.query(`select is_solved, solution_post_id from public.topics where id = $1`, [ids.topic]);
  if (!t.rows[0].is_solved || t.rows[0].solution_post_id !== ids.reply) throw new Error("solution not set");
});

await step("TL0 cannot flag, TL1 can, TL3 flag hides on its own", async () => {
  await expectError(
    asUser(ids.newbie, `insert into public.flags (post_id, reporter_id, reason) values ($1, $2, 'spam')`, [ids.reply, ids.newbie]),
    DENIED,
  );
  await asUser(ids.member, `insert into public.flags (post_id, reporter_id, reason) values ($1, $2, 'spam')`, [ids.reply, ids.member]);
  let p = await db.query(`select is_hidden from public.posts where id = $1`, [ids.reply]);
  if (p.rows[0].is_hidden) throw new Error("one TL2 flag should not hide");
  await asUser(ids.regular, `insert into public.flags (post_id, reporter_id, reason) values ($1, $2, 'selling')`, [ids.reply, ids.regular]);
  p = await db.query(`select is_hidden, hidden_reason from public.posts where id = $1`, [ids.reply]);
  if (!p.rows[0].is_hidden || p.rows[0].hidden_reason !== "flags") throw new Error("TL3 flag did not hide");
  const t = await db.query(`select reply_count from public.topics where id = $1`, [ids.topic]);
  if (t.rows[0].reply_count !== 1) throw new Error(`hidden post still counted: ${t.rows[0].reply_count}`);
});

await step("hidden post is invisible to others but visible to its author and staff", async () => {
  const other = await asUser(ids.member, `select count(*)::int as n from public.posts where id = $1`, [ids.reply]);
  const author = await asUser(ids.regular, `select count(*)::int as n from public.posts where id = $1`, [ids.reply]);
  const staff = await asUser(ids.staff, `select count(*)::int as n from public.posts where id = $1`, [ids.reply]);
  if (other.rows[0].n !== 0 || author.rows[0].n !== 1 || staff.rows[0].n !== 1) {
    throw new Error(`visibility wrong: other ${other.rows[0].n}, author ${author.rows[0].n}, staff ${staff.rows[0].n}`);
  }
});

await step("locked topic rejects replies from members but not staff", async () => {
  await asUser(ids.staff, `update public.topics set is_locked = true where id = $1`, [ids.topic]);
  await expectError(
    asUser(ids.member, `insert into public.posts (topic_id, author_id, body_md) values ($1, $2, 'Late reply.')`, [ids.topic, ids.member]),
    DENIED,
  );
  await asUser(ids.staff, `insert into public.posts (topic_id, author_id, body_md) values ($1, $2, 'Staff note.')`, [ids.topic, ids.staff]);
});

await step("private category is hidden without group membership", async () => {
  const g = await db.query(`insert into public.groups (slug, name, is_paid) values ('inner-circle', 'Inner Circle', true) returning id`);
  ids.group = g.rows[0].id;
  const c = await db.query(
    `insert into public.categories (slug, name, is_private, allowed_group_id) values ('inner-circle', 'Inner Circle', true, $1) returning id`,
    [ids.group],
  );
  ids.cat_private = c.rows[0].id;
  let seen = await asUser(ids.member, `select count(*)::int as n from public.categories where id = $1`, [ids.cat_private]);
  if (seen.rows[0].n !== 0) throw new Error("non-member saw private category");
  await db.query(`insert into public.group_members (group_id, user_id) values ($1, $2)`, [ids.group, ids.member]);
  seen = await asUser(ids.member, `select count(*)::int as n from public.categories where id = $1`, [ids.cat_private]);
  if (seen.rows[0].n !== 1) throw new Error("member could not see private category");
  await asUser(
    ids.member,
    `insert into public.topics (title, category_id, author_id) values ('Members only question', $1, $2)`,
    [ids.cat_private, ids.member],
  );
});

await step("moderation log is append only", async () => {
  const row = await asUser(
    ids.staff,
    `insert into public.moderation_log (actor_id, action, target_type, target_id, reason) values ($1, 'pin', 'topic', $2, 'Read this first') returning id`,
    [ids.staff, ids.topic],
  );
  await expectError(
    db.query(`update public.moderation_log set reason = 'changed' where id = $1`, [row.rows[0].id]),
    "immutable",
  );
  await expectError(db.query(`delete from public.moderation_log where id = $1`, [row.rows[0].id]), "immutable");
  await expectError(
    asUser(ids.member, `insert into public.moderation_log (actor_id, action, target_type) values ($1, 'pin', 'topic')`, [ids.member]),
    DENIED,
  );
});

await step("search vectors match", async () => {
  const r = await db.query(
    `select count(*)::int as n from public.topics where search_vector @@ plainto_tsquery('english', 'royal mail tracked')`,
  );
  if (r.rows[0].n !== 1) throw new Error(`search found ${r.rows[0].n}`);
});

await step("email subscriber emails are unique regardless of case", async () => {
  await db.query(`insert into public.email_subscribers (email, source) values ('Someone@Example.test', '/blog')`);
  await expectError(
    db.query(`insert into public.email_subscribers (email) values ('someone@example.test')`),
    "email_subscribers_email_key",
  );
  const anon = await asAnon(`select count(*)::int as n from public.email_subscribers`);
  if (anon.rows[0].n !== 0) throw new Error("anon could read subscribers");
});

await step("every public table has RLS enabled", async () => {
  const r = await db.query(`
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  `);
  if (r.rows.length > 0) throw new Error(`RLS off on ${r.rows.map((x) => x.relname).join(", ")}`);
});

console.log("Applying down migrations");
await db.exec("reset role");
for (const file of (await sqlFiles(downDir)).reverse()) {
  await step(file, async () => {
    await db.exec(await readFile(path.join(downDir, file), "utf8"));
  });
}

await step("schema is empty after rollback", async () => {
  const tables = await db.query(`select tablename from pg_tables where schemaname = 'public'`);
  const funcs = await db.query(`
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  `);
  const left = [...tables.rows.map((r) => r.tablename), ...funcs.rows.map((r) => r.proname)];
  if (left.length > 0) throw new Error(`left behind: ${left.join(", ")}`);
});

await db.close();
console.log(failures === 0 ? "\nAll migration checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
