# TrailTag dog tracker waitlist

The [live waitlist](https://trailtag-gps-waitlist.athul-p.chatgpt.site/) lets visitors choose GPS at $89 for the first year and $49 per year after, Bluetooth at $29 one-time, or neither. GPS and Bluetooth choices collect an email. Neither is anonymous.

The existing [Wayback Collar link](https://ouyang184.github.io/wayback-collar/) sends visitors to the live waitlist. The `gh-pages` branch serves that redirect.

## Build and hosting

Run `npm run build` with Node.js to create `dist/server/index.js`. The build has no package dependencies.

The live page runs as a Worker and stores responses in a D1 database. To deploy another instance, bind its D1 database as `DB` and apply the SQL migrations in `drizzle/` in order. The first migration creates the signup table, and the second adds the comparison choices.
