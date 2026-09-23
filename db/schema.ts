import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    placeId: text("place_id").notNull(),
    authorName: text("author_name").notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    status: text("status").notNull().default("published"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_reviews_place_created").on(table.placeId, table.createdAt)],
);
