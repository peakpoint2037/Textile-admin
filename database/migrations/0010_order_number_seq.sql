-- Backs order_number generation: atomic, gap-tolerant, no race conditions
-- under concurrent order creation (unlike computing "max + 1" in application code).
CREATE SEQUENCE order_number_seq START 1001;
