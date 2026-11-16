ALTER TABLE `waitlist_signups` ADD `source` text DEFAULT 'direct' NOT NULL
  CONSTRAINT "valid_signup_source" CHECK (length(`source`) BETWEEN 1 AND 32 AND `source` NOT GLOB '*[^a-z0-9_-]*');
--> statement-breakpoint
ALTER TABLE `waitlist_neither_votes` ADD `source` text DEFAULT 'direct' NOT NULL
  CONSTRAINT "valid_neither_source" CHECK (length(`source`) BETWEEN 1 AND 32 AND `source` NOT GLOB '*[^a-z0-9_-]*');
