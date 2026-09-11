ALTER TABLE "artworks" ADD CONSTRAINT "artworks_price_positive" CHECK ("artworks"."price" > 0);--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_stock_nonnegative" CHECK ("artworks"."stock" >= 0);--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_year_valid" CHECK ("artworks"."year" between 1000 and 2200);--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_quantity_positive" CHECK ("cart_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_amounts_nonnegative" CHECK ("order_items"."unit_price" >= 0 and "order_items"."line_total" >= 0 and "order_items"."platform_fee" >= 0 and "order_items"."seller_earnings" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_amounts_nonnegative" CHECK ("orders"."subtotal" >= 0 and "orders"."shipping" >= 0 and "orders"."tax" >= 0 and "orders"."discount" >= 0 and "orders"."total" >= 0);--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" between 1 and 5);