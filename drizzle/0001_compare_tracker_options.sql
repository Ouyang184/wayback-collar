ALTER TABLE `waitlist_signups` ADD `product` text DEFAULT 'gps' NOT NULL
  CONSTRAINT "valid_waitlist_product" CHECK (`product` IN ('gps', 'bluetooth'));
--> statement-breakpoint
ALTER TABLE `waitlist_signups` ADD `compared_at` text;
--> statement-breakpoint
CREATE TABLE `waitlist_neither_votes` (
  `voter_id` text PRIMARY KEY NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
