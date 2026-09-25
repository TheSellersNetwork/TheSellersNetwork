/*
  Row types for the tables the app reads. Kept by hand and matched to the
  migrations in supabase/migrations. When the Supabase project exists these
  can be replaced by generated types without changing call sites.
*/

export type MarketplaceId =
  | "ebay"
  | "amazon"
  | "vinted"
  | "etsy"
  | "depop"
  | "facebook"
  | "own_website"
  | "other";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  marketplaces: MarketplaceId[];
  trust_level: number;
  post_count: number;
  likes_received: number;
  days_visited: number;
  last_seen_at: string | null;
  is_staff: boolean;
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  rules_accepted_at: string | null;
  onboarded_at: string | null;
  email_on_reply: boolean;
  email_on_mention: boolean;
  email_digest: boolean;
  solution_count: number;
  home_visited_at: string | null;
  created_at: string;
  updated_at: string;
};

/* The subset of a profile shown next to posts and in topic rows. */
export type ProfileSummary = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url" | "trust_level" | "is_staff" | "solution_count"
>;

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  colour: string;
  icon: string | null;
  position: number;
  parent_id: string | null;
  min_trust_to_post: number;
  min_account_age_hours: number;
  is_private: boolean;
  allowed_group_id: string | null;
  topic_count: number;
  post_count: number;
  accepting_topics: boolean;
  accepting_note: string | null;
  created_at: string;
  updated_at: string;
};

export type Topic = {
  id: string;
  short_id: string;
  slug: string;
  title: string;
  category_id: string;
  author_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_unlisted: boolean;
  is_solved: boolean;
  solution_post_id: string | null;
  view_count: number;
  reply_count: number;
  like_count: number;
  last_post_at: string;
  last_poster_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TopicRow = Topic & {
  category: Pick<Category, "id" | "slug" | "name" | "colour"> | null;
  author: ProfileSummary | null;
  last_poster: ProfileSummary | null;
  tags: Pick<Tag, "id" | "slug" | "name">[];
};

export type Post = {
  id: string;
  topic_id: string;
  author_id: string;
  body_md: string;
  body_html: string | null;
  reply_to_post_id: string | null;
  post_number: number;
  like_count: number;
  is_deleted: boolean;
  deleted_by: string | null;
  deleted_at: string | null;
  is_hidden: boolean;
  hidden_at: string | null;
  hidden_reason: string | null;
  edited_at: string | null;
  edit_count: number;
  created_at: string;
  updated_at: string;
};

export type PostRow = Post & {
  author: ProfileSummary | null;
  liked_by_me?: boolean;
};

export type Tag = {
  id: string;
  slug: string;
  name: string;
  topic_count: number;
};

export type Flag = {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: "spam" | "selling" | "off_topic" | "abuse" | "policy_evasion" | "other";
  note: string | null;
  status: "open" | "agreed" | "disagreed" | "ignored";
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type NotificationType =
  | "reply"
  | "mention"
  | "quote"
  | "like"
  | "solution"
  | "badge"
  | "moderation"
  | "message"
  | "digest";

export type NotificationPayload = {
  topic_id?: string;
  topic_slug?: string;
  topic_short_id?: string;
  topic_title?: string;
  post_id?: string;
  post_number?: number;
  actor_id?: string;
  message?: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: NotificationPayload;
  read_at: string | null;
  emailed_at: string | null;
  created_at: string;
};

export type TopicListView = "latest" | "top" | "unanswered" | "following";
export type TopPeriod = "day" | "week" | "month" | "all";

export type PartnerCategory = "postage" | "bookkeeping" | "sourcing" | "software" | "other";
export type PartnerRelationship = "partner" | "sponsored" | "affiliate";

export type Partner = {
  id: string;
  slug: string;
  name: string;
  url: string;
  logo_url: string | null;
  blurb: string | null;
  category: PartnerCategory;
  relationship: PartnerRelationship;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type PlacementSlot = "rail" | "topic_list";

export type Placement = {
  id: string;
  partner_id: string;
  slot: PlacementSlot;
  headline: string;
  body: string | null;
  cta_label: string;
  url: string | null;
  starts_at: string;
  ends_at: string | null;
  weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LivePlacement = Placement & { partner: Pick<Partner, "id" | "name" | "slug" | "url" | "logo_url" | "relationship"> };

export type CategoryFollow = { user_id: string; category_id: string; level: "following" | "muted" };
