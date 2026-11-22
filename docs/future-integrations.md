# Future community integrations

Prepared 20 November 2026, Australia/Brisbane.

Status: proposed for committee consideration. The club has not approved either connection. This record does not activate a connection, transfer data, create a partnership or grant access to another service.

## The two destinations

- [Ready SETCO](https://ready-setco.auraofintelligence.workers.dev/) could support shared event coordination, practical training and community participation.
- [Minjerribah Screen & Media Network](https://auraofintelligence.github.io/minjerribah-screen-media-network/network/) describes a possible route for checked club news, competition coverage and approved venue-screen notices.

The live Ready SETCO enquiry form was checked against the local source. The initial register is operated by Luke Hayes trading as Strange But True. A person using that form makes a separate choice about a possible future transfer to the cooperative. Media network findings below come from the local source and operating documentation.

## Where responsibility can change hands

Members offering help for a working bee or event choose volunteering or paid work from their membership area. Each request records the person's own consent and the specific task. The committee reviews the request before the member is offered the partner's form. That link carries only the enquiry category.

In the committee area, event coordination begins with a decision in approved minutes. Record the event, date and work covered. An authorised enquiry becomes a delegation only after the committee records its motion, the exact work, PLFC's retained duties, a responsible officer, a review date and the partner's written acceptance reference. Withdrawal closes the club authority and connected event referrals. The named contacts handle any records someone separately submitted to the partner.

Sunday's suggested decision is whether to try one defined task at one local meet. The partner could roster the welcome desk. PLFC would run the meet, approve spending and oversee safety. Volunteer participation, a paid engagement and public media release each have their own decision.

## What the existing source implements

### Ready SETCO

The exact local source is `G:\GithubLocal-PC\ready-set-co-op-trust-hub`. Its README identifies the requested Cloudflare URL and a rebuild dated 19 November 2026. The operating documentation describes Strange But True as the initial operator and Ready Sustainable Employment and Training Cooperative as proposed.

Implemented source capabilities include:

- `POST /api/intake`: expressions of interest with a stable submission ID, contact consent and separately chosen future-handover consent. Supported interests include events, training, resources, media and support. The server accepts a defined field list and returns a receipt after saving.
- Private participant review and export through `/api/admin/participants`, `/api/admin/participants/:id` and `/api/admin/export`.
- Public published-place GeoJSON at `GET /api/map/places` and `GET /api/map/export`, with private suggestions and publication review kept separate.
- Dedicated D1 storage, SQLite-compatible migrations, original operator/consent history, and a local persistence adapter.

The source does not provide formal cooperative membership admission, shared club sign-in, an event-calendar API, a media publishing/synchronisation service or a C-Hour ledger. Production organiser access is documented as closed until its own real identity configuration is completed and verified. These are implementation boundaries, not reasons to infer that a live private service is available.

### Minjerribah Screen & Media Network

The local source is `G:\GithubLocal-PC\minjerribah-screen-media-network`. The requested `/network/` page is included in its separate GitHub Pages build. It presents a proposed editorial path: receive a tip, verify, edit, publish to agreed channels, adapt for broadcast and retain the source and permission trail.

The page includes sport, events and community groups among its coverage topics. Proposed screen hosts participate only with the venue operator's agreement. Its public joining route points to a contact page. The main database schema is intentionally empty, and the Worker is the application/image-serving entry point. No operational feed-ingestion or publication API was identified in the audited source.

The neighbouring `ready-set-co-op-hyperlocal-media` project supplies a public proposal, a browser route finder and fictional production examples. Its README requires a recorded human decision before each public step. It offers useful workflow ideas rather than an already connected PLFC service.

## Practical connection points after approval

| Club need | Proposed connection | First reviewable result |
| --- | --- | --- |
| Local fishing meets, social events and training open to the public | Share committee-approved public events through a calendar feed and a versioned event record. Use direct invitations for small interclub meets with a limited guest list. Ready SETCO currently needs a new event adapter or a reviewed manual import. | One approved public event with stable ID, local timezone, venue, organiser, public contact, source URL, revision and cancellation state. |
| Volunteers, event support and training interest | Offer an optional link to Ready SETCO's own intake. Let the person choose to provide information to that operator. | A clearly explained external invitation. Club registration and external interest remain separate decisions. |
| Club and venue visibility | Consider a human-reviewed club/venue suggestion for the existing public place register. | A verified point with exact venue permission, appropriate public details, chosen credit and correction contact. Do not expose a member's location or sensitive fishing grounds. |
| Competition notices, sponsor stories and results | Prepare an approved media package for the proposed editorial workflow. No receiving publishing API currently exists in the inspected network source. | Headline, approved copy, public event link, credited assets, alt text/captions, channel permissions, sponsor wording, publish/expiry times and correction contact. |
| Hotel or community screens | Trial one approved notice at one willing venue when its operator agrees. | A readable screen layout, venue/channel approval, expiry and a tested removal or correction process. |
| Committee reporting | Keep the club's internal decisions and minutes in PLFC; share only an approved public summary when one is needed. | A short public extract tied to the club's decision reference, without exporting private minutes or member records. |

## Membership and identity

PLFC remains responsible for its own applications, admission decisions, renewals, committee appointments and permissions. A Ready SETCO expression of interest does not establish PLFC membership, cooperative membership, a volunteer appointment or an employment engagement.

No shared sign-in contract was found. Do not reuse either service's Access application, administrator allowlist or database. If shared sign-in is later useful, agree the issuer, audience, identity mapping and revocation process first; verify a person's role separately in each organisation. Any future link between records needs an explicit purpose and permission. An email-address match alone is insufficient authority to merge records.

## Decisions and accountable roles

These are proposed responsibilities for the committee to assign, not claims that anyone already holds them.

| Proposed role | Decision or responsibility |
| --- | --- |
| PLFC committee | Approve the scope, named receiving operator, permitted data, channels, costs and trial, with a recorded resolution or delegation. |
| Club registrar | Approve any membership-related fields, permissions, corrections and access revocation. |
| Club event lead | Confirm event details, venue agreement, postponement/cancellation and the public organiser contact. |
| Club media approver | Approve the exact notice, sponsor wording, images, credits, publication channels and expiry. |
| Receiving editor or organiser | Accept the agreed package, check channel-specific requirements and confirm publication or rejection. |
| Venue operator | Agree what appears on that venue's screen and who may change or remove it. |
| System custodian | Maintain separate credentials, bounded interfaces, audit history, backup/export and a working disconnect switch. |
| Relevant person or custodian | Grant the specific image, interview or cultural-material permission needed for the proposed use. Committee approval does not substitute for their permission. |

Agree how youth images, names, interviews and withdrawal requests will be handled before including them in a package. Public-display permission and wider reuse or AI-training permission are separate choices. No private minutes, contact list, payment details or raw member register should be included in a public feed.

## A bounded pilot

After committee approval, start with one public event and one approved notice, transferred manually. Record the approval, exact version, receiving person, permitted channels and expiry. Check the published result, exercise a correction or withdrawal, and confirm the club can stop the connection without disrupting membership or its own calendar.

Automated exchange can follow a successful pilot. A future adapter should use a versioned allowlisted public schema, stable IDs, UTC instants with the Brisbane timezone, idempotent retries, explicit cancellation/takedown, and source/approval references. Private permission evidence stays in controlled records rather than the public payload. Incoming changes remain drafts until the designated club reviewer approves them.

No integration credentials were read or used, no external submissions were made, and no integration was activated for this audit.

## Source trail

- `G:\GithubLocal-PC\ready-set-co-op-trust-hub\README.md`
- `G:\GithubLocal-PC\ready-set-co-op-trust-hub\AGENTS.md`
- `G:\GithubLocal-PC\ready-set-co-op-trust-hub\docs\CLOUDFLARE-OPERATIONS.md`
- `G:\GithubLocal-PC\ready-set-co-op-trust-hub\docs\MAP-DATA.md`
- `G:\GithubLocal-PC\ready-set-co-op-trust-hub\docs\SBT-TO-SETCO-HANDOVER.md`
- `G:\GithubLocal-PC\ready-set-co-op-trust-hub\cloudflare\worker.mjs`
- `G:\GithubLocal-PC\minjerribah-screen-media-network\README.md`
- `G:\GithubLocal-PC\minjerribah-screen-media-network\components\NetworkPage.tsx`
- `G:\GithubLocal-PC\minjerribah-screen-media-network\components\JoinPage.tsx`
- `G:\GithubLocal-PC\minjerribah-screen-media-network\db\schema.ts`
- `G:\GithubLocal-PC\minjerribah-screen-media-network\vite.pages.config.ts`
- `G:\GithubLocal-PC\ready-set-co-op-hyperlocal-media\README.md`
- `G:\GithubLocal-PC\ready-set-co-op-hyperlocal-media\demo.js`
