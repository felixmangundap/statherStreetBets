import {
  pgTable,
  pgEnum,
  text,
  integer,
  numeric,
  timestamp,
  serial,
  unique,
  index,
  boolean,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const betTypeEnum = pgEnum('bet_type', [
  'match_winner',
  'over_under',
  'btts',
  'accumulator',
  'custom',
])

export const betStatusEnum = pgEnum('bet_status', [
  'pending',
  'won',
  'lost',
  'void',
  'cashed_out',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  currency: text('currency').notNull().default('USD'),
  timezone: text('timezone').notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const leagues = pgTable(
  'leagues',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    adminId: integer('admin_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('leagues_slug_idx').on(t.slug), unique('leagues_slug_unique').on(t.slug)]
)

export const leagueMembers = pgTable(
  'league_members',
  {
    id: serial('id').primaryKey(),
    leagueId: integer('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('league_members_unique').on(t.leagueId, t.userId)]
)

export const fixtures = pgTable('fixtures', {
  id: serial('id').primaryKey(),
  apiFootballId: integer('api_football_id').notNull().unique(),
  leagueIdExt: integer('league_id_ext'),
  season: integer('season'),
  round: text('round'),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  homeTeamLogo: text('home_team_logo'),
  awayTeamLogo: text('away_team_logo'),
  kickoffAt: timestamp('kickoff_at', { withTimezone: true }).notNull(),
  status: text('status').notNull().default('NS'),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
})

export const bets = pgTable('bets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  placedByUserId: integer('placed_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  leagueId: integer('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  fixtureId: integer('fixture_id').references(() => fixtures.id, { onDelete: 'set null' }),
  betType: betTypeEnum('bet_type').notNull(),
  description: text('description').notNull(),
  selection: text('selection').notNull(),
  odds: numeric('odds', { precision: 10, scale: 4 }).notNull(),
  stake: numeric('stake', { precision: 10, scale: 4 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  status: betStatusEnum('status').notNull().default('pending'),
  payout: numeric('payout', { precision: 10, scale: 4 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const betReactions = pgTable(
  'bet_reactions',
  {
    id: serial('id').primaryKey(),
    betId: integer('bet_id')
      .notNull()
      .references(() => bets.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('bet_reactions_unique').on(t.betId, t.userId, t.emoji)]
)

export const betLegs = pgTable('bet_legs', {
  id: serial('id').primaryKey(),
  betId: integer('bet_id')
    .notNull()
    .references(() => bets.id, { onDelete: 'cascade' }),
  fixtureId: integer('fixture_id').references(() => fixtures.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  selection: text('selection').notNull(),
  odds: numeric('odds', { precision: 10, scale: 4 }).notNull(),
  status: betStatusEnum('status').notNull().default('pending'),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  leagueMembers: many(leagueMembers),
  bets: many(bets),
  adminLeagues: many(leagues),
}))

export const leaguesRelations = relations(leagues, ({ one, many }) => ({
  admin: one(users, { fields: [leagues.adminId], references: [users.id] }),
  members: many(leagueMembers),
  bets: many(bets),
}))

export const leagueMembersRelations = relations(leagueMembers, ({ one }) => ({
  league: one(leagues, { fields: [leagueMembers.leagueId], references: [leagues.id] }),
  user: one(users, { fields: [leagueMembers.userId], references: [users.id] }),
}))

export const fixturesRelations = relations(fixtures, ({ many }) => ({
  bets: many(bets),
  betLegs: many(betLegs),
}))

export const betsRelations = relations(bets, ({ one, many }) => ({
  user: one(users, { fields: [bets.userId], references: [users.id] }),
  placedBy: one(users, { fields: [bets.placedByUserId], references: [users.id] }),
  league: one(leagues, { fields: [bets.leagueId], references: [leagues.id] }),
  fixture: one(fixtures, { fields: [bets.fixtureId], references: [fixtures.id] }),
  legs: many(betLegs),
  reactions: many(betReactions),
}))

export const betReactionsRelations = relations(betReactions, ({ one }) => ({
  bet: one(bets, { fields: [betReactions.betId], references: [bets.id] }),
  user: one(users, { fields: [betReactions.userId], references: [users.id] }),
}))

export const betLegsRelations = relations(betLegs, ({ one }) => ({
  bet: one(bets, { fields: [betLegs.betId], references: [bets.id] }),
  fixture: one(fixtures, { fields: [betLegs.fixtureId], references: [fixtures.id] }),
}))

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type League = typeof leagues.$inferSelect
export type NewLeague = typeof leagues.$inferInsert
export type LeagueMember = typeof leagueMembers.$inferSelect
export type Fixture = typeof fixtures.$inferSelect
export type NewFixture = typeof fixtures.$inferInsert
export type Bet = typeof bets.$inferSelect
export type NewBet = typeof bets.$inferInsert
export type BetLeg = typeof betLegs.$inferSelect
export type NewBetLeg = typeof betLegs.$inferInsert
export type BetType = (typeof betTypeEnum.enumValues)[number]
export type BetStatus = (typeof betStatusEnum.enumValues)[number]
export type BetReaction = typeof betReactions.$inferSelect
export type NewBetReaction = typeof betReactions.$inferInsert
