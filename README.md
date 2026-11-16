# TrailTag dog tracker waitlist

The [live waitlist](https://trailtag-gps-waitlist.athul-p.chatgpt.site/) lets visitors choose GPS at $89 for the first year and $49 per year after, Bluetooth at $18 one-time, or neither. GPS and Bluetooth choices collect an email. Neither is anonymous.

The existing [Wayback Collar link](https://ouyang184.github.io/wayback-collar/) sends visitors to the live waitlist. The `gh-pages` branch serves that redirect, and it keeps everything after the address, including `?src=`.

## Tracking where answers come from

Add `?src=` and a short tag to each link you share, for example `?src=tiktok`, `?src=flyer` or `?src=mooseboyle`. Tags use lowercase letters, digits, `-` and `_`, up to 32 characters. Each answer saves its tag in the `source` column; an answer with no tag, or an invalid one, is saved as `direct`. A person who signs up twice keeps the tag from their first visit.

To count answers by tag:

```sql
SELECT source, product, COUNT(*) AS answers FROM waitlist_signups GROUP BY source, product
UNION ALL
SELECT source, 'neither', COUNT(*) FROM waitlist_neither_votes GROUP BY source
ORDER BY answers DESC;
```

## Build and hosting

Run `npm run build` with Node.js to create `dist/server/index.js`. The build has no package dependencies.

The live page runs as a Worker and stores responses in a D1 database. To deploy another instance, bind its D1 database as `DB` and apply the SQL migrations in `drizzle/` in order. The first migration creates the signup table, the second adds the comparison choices, and the third adds the `source` column. Until the third has run, the Worker saves answers without a tag rather than failing.
