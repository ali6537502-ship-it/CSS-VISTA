# CSS Vistagram: daily batch publishing contract

## Daily automation

CSS Vistagram publishes one atomic batch every day at **12:00 PM Asia/Karachi**.

The standard daily batch contains exactly **six unique posts**:

- **3 Pakistan-focused posts**
- **3 Global posts**, including concepts, explainers, data, case studies, current developments or exam insights

Every post is a separate public Vistagram article. The six posts are generated and published together through one Git branch/merge so a daily run does not trigger six independent deployments.

## Editorial standard

All automated Vistagram material must be:

- factual and source-based
- neutral and non-partisan
- educational rather than propagandistic
- respectful of Pakistan's state institutions and religious sensitivities
- free from personal attacks, insults, defamation and inflammatory framing
- free from candidate, party or political endorsements
- written without sensationalism
- suitable for competitive-examination preparation

This does not mean fabricating praise or suppressing necessary factual context. When a legitimate issue contains disagreement, criticism or controversy, describe the documented facts and relevant perspectives neutrally without attacking a person, religion, institution, party, country or community.

If a topic cannot be verified responsibly, replace it with another topic rather than publish uncertain material.

## Source file

The scheduled task creates one file:

`content/vistagram/YYYY/MM/YYYY-MM-DD.json`

The filename and path must match the batch `date`.

The build runs `scripts/package-vistagram.mjs`, validates every historical batch for duplicates, and generates:

- `public/vistagram-content/index.json`
- `public/vistagram-content/posts/<slug>.json`

Those generated assets are then copied into the production build by Vite.

## Required batch shape

A production batch uses:

- `schema_version: 1`
- `profile: "daily-six"`
- `date`
- `published_at` with an explicit timezone
- `edition`
- all five `editorial_safety` flags set to `true`
- exactly six posts

Each post requires:

- stable `id`
- public `slug`
- unique `dedupeKey`
- `scope`: `Pakistan` or `Global`
- title and feed excerpt
- one supported Vistagram type
- category, topic and tags
- at least two structured sections
- at least 350 words of substantive content
- at least one original source
- at least two sources for `Current Update` and `Data & Statistics`

Reading time is calculated automatically.

## No repetition

Publication fails if any historical batch repeats:

- a post ID
- a public slug
- a `dedupeKey`
- a substantially similar title

The scheduled task must inspect the existing archive before choosing topics. A new title that only rephrases an old article is not considered new.

If one proposed topic overlaps too strongly with earlier coverage, replace that topic before committing the batch.

## Verification

Before merge:

```sh
node scripts/package-vistagram.mjs --check
node --test tests/vistagramPublishing.test.ts
```

The Vistagram verification GitHub workflow runs these checks on every pull request and every push to `main`.

The normal Hostinger build also packages and validates Vistagram before Vite runs, so malformed or repetitive content cannot pass the production build.
