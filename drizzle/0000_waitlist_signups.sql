CREATE TABLE `waitlist_signups` (
  `email` text PRIMARY KEY NOT NULL,
  `intent` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "valid_purchase_intent" CHECK (`intent` IN ('yes', 'maybe', 'no'))
);
