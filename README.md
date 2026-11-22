# Point Lookout Fishing Club demo

**Demo only. Not complete or available for club use yet.**

Prepared for the Sunday 22 November 2026 discussion. This is a new, separate project. The current WordPress site, domain, earlier experiments and partner systems were not changed.

## Try the interfaces

- Home: real club logo, real club photo, licensed Point Lookout coast image and the existing Finnius character.
- The Wildlife Rescue Minjerribah feature opens the separate rescue app directly from Home, the fishing planner and the guide contents. Its koala emblem comes from the app’s own artwork. The companion help button shows the appropriate local or Queensland rescue numbers.
- What’s on: the one-off Sunday meeting, a guided calendar chooser, a prefilled Google Calendar option and explained import steps for other calendar apps. The one-hour duration is an estimate. No calendar account is changed automatically.
- Go fishing: a visual daily briefing for the selected area, date, method and target. Live Open-Meteo weather and offshore marine forecasts, official Brisbane Bar reference tide predictions for 2026 and 2027, computed sun and moon events, contextual fishing pointers, selected seasonal checks and a direct official BOM radar link. Lunar periods are estimates, not fishing forecasts. The tide curve is a labelled interpolation between official extrema, not official interval data or a Point Lookout station.
- The fish guide pairs eight real species photographs with bait and tackle pictures, trace lengths and strengths, hook patterns and preparation steps. A three-picture running-sinker lesson has manual playback and a downloadable GIF. Species photos carry their own author, source and licence in the guide.
- Local club competitions use brag-mat photos so the fish can go back. Regular island meets come first, alongside small interclub invitationals. The dated Sunday meeting and the proposed programme are presented separately.
- Anyone can send a product enquiry or request pickup from the shop. Each receives a reference. The treasurer can confirm stock, agree a collection time, record payment and complete the sale in the private stock book. Online payment uses a treasurer-confirmed Square product link. The treasurer reconciles online receipts from Square. Historical sales retain their original dated source references.
- Under Shop, stock and prices, the treasurer can publish merchandise prices, membership fees and event entry fees. Each public price change records the officer, time and previous and new prices in the committee inbox. Each officer can mark their own alerts as read. External messages require a chosen provider and sender.
- The treasurer and owner can receive stock, attach a supplier cost now or later, and export a monthly, quarterly or annual stock and sales report at `#stock/reports`. The club financial year ends on 30 June. Closing valuations use the latest documented unit cost per stock item, grouped by merchandise category. Reports identify missing costs and counts and keep archived source records separate from ledger totals.
- The five named offices contribute to club newsletters at `#committee/news`. The Secretary and Assistant Secretary assemble editions. Once published, issues appear in the paid-member archive at `#members/news`. Role-specific handover instructions live at `#committee/handover`.
- The newsletter desk gives the Secretary and Assistant Secretary one shared monthly birthday review. A member who opted in receives their own private greeting on their birthday.
- The private review shortcut opens the Secretary’s to-do list. Each named office has regular duties that can be added to a list, edited and printed on the club’s A4 letterhead. Either secretary can print and record work from returned sheets for any office.
- The meeting desk prepares formal agendas and tracks quorum, motions and follow-up work. Sunday’s hotel catch-up has its own informal agenda. Scheduling an AGM opens its preparation checklist. The events page also shows the next Queensland state school holiday period.
- Committee officers can start a shared brainstorm or choose an editable post idea in the social planner. An idea stays in the planner when the discussion ends. Officers can then agree the wording, dates and channels and record published links. Members can choose to load the club’s public Facebook timeline in Club socials.
- Events and fundraising keeps private run sheets for local meets, invitationals, BBQs, raffles and other fundraisers. Jobs start unassigned. A job goes onto an officer’s own list when they take it. Confirmed helpers can take shifts on paper. The Treasurer can record takings and costs.

- The water and catch-care chapters cover green zones, customary fishing rights, crabbing, gathering bait, spearfishing restrictions, sharing a jetty, seafood preparation, sharks and rays. The wildlife card gives direct rescue contacts and links to the separate prototype.
- Paid members sign in for member editions of minutes, a private catch journal, conversations, and photos. Youth social access requires guardian consent and committee review. Applications, payment verification, one-time invitations, pack fulfilment, birthdays, member numbers and renewal reminders use the club database.
- Committee officers schedule meetings, set agendas, record decisions, review transcript suggestions and approve minutes. A separate release publishes the member edition. Original documents and private notes stay under committee access. The treasurer's role adds stock, money and paid membership verification.
- Everyone can read the club constitution at `/constitution.pdf`. The available V1.2 copy has an unverified adoption date.

The app carries a demonstration notice for the committee review. Officers sign in to individual password-protected accounts. Forms explain when an action writes a real club record. Microphone, camera and browser speech transcription require participant agreement. Recordings can be downloaded locally. Additional consent is required to send reviewed text to the optional Cloudflare AI minutes assistant. Voice and video files currently stay with the recorder.

A first-visit welcome and persistent Guide me control explain the next action and its expected result. Back to top appears after scrolling. The fishing guide has a picture contents page and individual topic addresses, including `#guide/jetty` and `#guide/crabbing`. In the daily briefing, forecast, tide, lunar and trip details can be opened individually. Connection briefs explain purpose, information used, cost considerations and the committee decisions needed before activation.

Finnius automatically alternates between his original silent chat and wave while in view. Pause holds his pose and the same button resumes him. Reduced-motion visitors can start him manually. Both original GIFs remain available to download.

## Run locally

Use Node 20 or later:

```powershell
npm install
npm run build
npm test
npm run dev
```

Open the address printed by the preview server. Build again and restart the preview after changes. Tests also use Python’s built-in SQLite to verify database transactions.

## Cloudflare foundation

The committee demo is available at [the PLFC clubhouse on Cloudflare](https://plfc-clubhouse.auraofintelligence.workers.dev/). Visitors can open it without an account.

The build writes the API to `dist/server/index.js`. Cloudflare Workers serves the files in `public/`. The D1 database bound as `DB` holds access, applications, meeting records, approved member editions, stock, reminders and partner authorisations. The first committee user activates a private Webmaster invitation and chooses their own password. Account changes and invitations use the protected club account tools. Private records require server-side role checks. Passwords are individually salted and hashed with a Worker secret. Private downloads and member photo requests require a valid session.

Apply outstanding migrations with `wrangler d1 migrations apply DB --remote --config wrangler.jsonc` before deploying with `wrangler deploy --config wrangler.jsonc`. Preserve the existing `PRIVATE_AUTH_KEY` Worker secret. Keep the first-owner activation link and source archives private. GoDaddy domain changes are outside this deployment.

## What needs a club decision

- Set the fees and reconcile the old member-number register before authorising new number allocation. The treasurer checks actual payments. The committee must approve offer terms before birthday codes can be issued.
- In-app notices, pack stages and reminder queues work. Connect the club email account before enabling outgoing email. Decide who will archive voice and video and how long the club will retain recordings.
- For Ready SETCO, individual enquiries need opt-in and committee review. An operational handover needs a recorded decision for a named task, the club's retained duties, a club contact, a review date and an accepted agreement reference. Approval is private to PLFC. Applicants submit their own enquiries on the partner site. Any future automatic transfer and public media publishing need separate agreements.
- Before general use, agree backup restoration, membership and guardian review responsibilities, forecast licensing for sponsorship, and independent review of access controls. Competition registration, scoring and the offline app remain future work.

## Source findings and assets

See `docs/discovery-and-launch.md` for the source audit. Internal source documents remain in their original locations and were not copied into this project.

- Club logo: supplied `STICKER GREEN_BLUE_website.png` from the Fishing Club folder. Club material remains club material.
- Club group photo: supplied `club-competition-morning.webp` from the May planning project, already used on its public site.
- Finnius still: supplied `Finnius the Fishing Mate/Still Images/1.png`. Existing character and custom GPT, not a newly generated character. No GPT or avatar integration is enabled.
- The on-page motion comes from `Finnius the Fishing Mate/Videos/Finnius Welcome Juniors.mp4`. The excerpts are 13 to 16 seconds and 29.5 to 32.5 seconds into the original. The transparent crops preserve the existing facial expressions, hand gestures, hat, badges and fishing rod. The preparation script is `scripts/prepare-finnius-original-clips.mjs`.
- The Amity Point Jetty picture is [Pacificwizard’s 4 January 2025 photograph](https://commons.wikimedia.org/wiki/File:Amity_Point_Jetty_at_Sunset._North_Stradbroke_Island,_Queensland,_Australia.jpg), CC0. The dolphin image was also taken at Amity Point. Wildlife and species photographs include credits, licence and resizing details beside the images.
- The shirt image comes from the club archive photograph. The stubby cooler uses a detail of the club’s own merchandise illustration. The treasurer’s history draws on the 2025 workbook, sticker invoice and arrival message, June meeting transcript and signed minutes, July minutes, and March 2026 print review. The private import is stored outside the public assets and source control. The treasurer can establish each live shelf balance with a physical count.
- The album manuscript credits “Be The Legend: Wildlife Rescue Minjerribah” to i C. Infinity on *Straddie Fun*. The wildlife help section displays the creator-supplied video in a portrait player below the rescue contacts. It loads YouTube when the visitor presses Play. [Original song video](https://youtu.be/8yw-2ljAClE)
- Original generated illustration briefs covered the nine bait and lure specimens, three tackle components, the three stages of a running-sinker rig, four baited hooks, offshore tackle and simple preparation equipment. The bait and tackle illustrations are teaching aids. Identification cards use real photographs. The complete rig shows the main line, running sinker, swivel, separate trace and hook in sequence, following the [Victorian Fisheries Authority’s family fishing guide](https://vfa.vic.gov.au/education/fishing-info-for-kids/family-fishing-guide).
- Conditions imagery: built-in image generation created six transparent coastal mini illustrations in a 3 by 2 grid, with no labels or frames, representing weather, wind, swell, tide, sun/moon timing and storm radar. `fishing-condition-icons.webp` is a 1152-pixel web copy used by the website. The radar illustration is not a radar observation.
- Weather-state imagery: a second built-in image-generation sheet contains clear sun, partly cloudy, overcast, gentle rain without lightning, thunderstorm and moon/night scenes. The forecast selects an appropriate scene from the actual weather code and day/night field, so light rain is not presented as a thunderstorm. The responsive WebP retains transparency. Source PNGs are kept in the project archive.
- Coast photo: [North Stradbroke.jpg](https://commons.wikimedia.org/wiki/File:North_Stradbroke.jpg) by Tommort12, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The Wikimedia resized copy is displayed with a responsive crop and a separate colour overlay. The photograph and its presentation adaptations remain under CC BY-SA 4.0. Attribution is on the image.
- Astronomical calculations: [Astronomy Engine](https://github.com/cosinekitty/astronomy), MIT licence retained in the bundled output. No runtime astronomy provider call is required.
- Tide data: Maritime Safety Queensland official high/low CSV predictions, CC BY 4.0, with original dataset URLs and hashes retained in `worker/tides-data.mjs`. Brisbane Bar is a reference about 39 km from Point Lookout, without a local correction. Tangalooma is separately available in the data module. Source attribution is beside the chart.
- Forecasts: Open-Meteo weather and marine APIs, used for the non-commercial demo with attribution. Before sponsor-supported public use, agree appropriate commercial terms and server-side credentials. Provider failures remain unavailable, rather than replaced by sample conditions. Forecasts have limited future horizons and are not observations or safety assessments.
- Radar: the official Brisbane Mt Stapylton page opens on BOM. The page disallows embedding and radar reproduction requires a separate terms review. No proxy bypass, unlicensed radar copy or simulated live image is used.

No current fees, fabricated history, competition prize pool, contracted sponsors or insurance promises are presented as confirmed.
