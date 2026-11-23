# Review the annual PLFC social planner without changing production

The isolated development view is \`public/social-campaign-review.html\`. It uses the **same campaign generation and placement specification modules** as the proposed committee interface, but does not require a login, D1 database, real member records, SMS or third-party posting credentials.

This view is a **visual rehearsal only**. Settings live in browser-tab memory; refreshing resets them. "Use as draft" shows copyable sample content in a modal, not a real saved committee post.

## Option 1: on your PC (no Cloudflare changes)

You need Git and Node.js 20 or newer.

In a PowerShell terminal, from a folder in which you want the code:

\`\`\`powershell
git clone --branch feature/layered-social-calendar-2026-11 --single-branch https://github.com/auraofintelligence/PLFC-members-club.git PLFC-social-review
cd PLFC-social-review
npm ci
npm run build
npm test
npm run dev
\`\`\`

Open **http://localhost:4183/social-campaign-review.html**.

The full app's API requests will not work in this basic local static server because it deliberately has no D1 database or accounts. Use the **review URL**, not the ordinary sign-in page, to see and adjust the annual patterns.

If you already have a local clone, instead run \`git fetch origin\` and check out the feature branch, without changing your production working tree.

## Option 2: Worker Preview under plfc-clubhouse (isolated code)

As of 23 Nov 2026, Cloudflare Worker Previews requires **Wrangler 4.135.0 or later**.

This branch contains a \`previews\` block in \`wrangler.jsonc\` with Preview-only \`ENVIRONMENT=preview\`, \`OUTBOUND_ENABLED=false\`, \`SMS_ENABLED=false\`, and dedicated Durable Object/AI bindings. **There are deliberately no D1 bindings in the Preview**, so it cannot reach the production membership or showcase databases. The existing Worker API may return storage errors on other pages; the standalone social review page works without D1.

From the checked-out feature branch (do not run on \`main\`):

\`\`\`powershell
npm ci
npm run build
npm test
npx wrangler@latest login
npx wrangler@latest preview --name plfc-social-test
\`\`\`

Use the actual **Preview URL printed by Wrangler** and append \`/social-campaign-review.html\`. Do not assume a URL until the deployment succeeds. Do **not** run \`wrangler deploy\`, which would target production.

> Worker Preview URLs are publicly reachable by default. The review page contains no real member records or private content. If a richer authenticated review is needed later, protect the Preview using Cloudflare Access before adding any test accounts.

### Future full committee Preview (not done here)

For realistic authenticated workflows, separately create **two** new D1 databases and use the actual database IDs as \`previews.d1_databases\` bindings for \`DB\` and \`SHOWCASE_DB\`. Keep the IDs in sync with a separate \`wrangler.preview-migrations.jsonc\`. For the clubhouse's main database, the correct migrations directory is **\`drizzle\`**, not \`migrations\`. The showcase is assembled from a custom **fictional demo schema** with \`scripts/build-showcase-schema.mjs\`, not blindly from the main migration set. Set a new Preview-only \`PRIVATE_AUTH_KEY\`, create fictitious staff accounts, and explicitly approve every additional binding before deployment.

Never copy production contacts, SMS credentials, Gmail/Resend credentials, or real D1 data into this environment. The existing \`drizzle/0052_pause_meeting_sms.sql\` and \`drizzle/0053_pause_member_sms.sql\` disable SMS queueing and reminders. The annual campaign engine has no SMS channel or sender, and the Preview explicitly disables outbound email.

## What to check in the visual review

1. Try generating and hiding each layer without deleting other ideas.
2. Compare QLD school breaks, smaller NSW holiday waves and overlap weeks.
3. Change weekday, Friday, weekend and holiday posting limits.
4. Test the target of roughly 67% video content and the 30-second video storyboards.
5. Toggle YouTube, Facebook, Instagram, TikTok and *proposed* Noticeboard outlets. View separate paid/organic placement exports and size notes.
6. Try membership/gender (voluntary)/local-tourist-regional audience filters.
7. Open one sample, inspect placement-specific media sizes, thumbnails and safe-area notes, then select "Use as draft" to see its proposed wording.

No post, ad budget, SMS, email or public Noticeboard record is created or sent by this page. The branch is still a draft PR and has not been merged or deployed to production.

Sources:
- https://developers.cloudflare.com/workers/previews/get-started/
- https://developers.cloudflare.com/workers/previews/configuration/
- https://developers.cloudflare.com/workers/previews/resources/
