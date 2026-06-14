CREATE TABLE "bet_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bet_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bet_reactions_unique" UNIQUE("bet_id","user_id","emoji")
);
--> statement-breakpoint
ALTER TABLE "bet_reactions" ADD CONSTRAINT "bet_reactions_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet_reactions" ADD CONSTRAINT "bet_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;