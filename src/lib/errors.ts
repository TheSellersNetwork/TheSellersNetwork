/* Turns database and auth errors into a sentence a member can act on. */
export function friendlyError(error: unknown, fallback = "Something went wrong. Try again in a moment."): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (message.includes("duplicate_post")) return "You posted the same thing in the last ten minutes.";
  if (message.includes("edit_not_allowed")) return "New members cannot edit posts yet.";
  if (message.includes("edit_window_closed")) return "Posts can be edited for 24 hours at your trust level.";
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "You cannot do that here yet. It may be a daily limit, a locked topic or a category for established members.";
  }
  if (message.includes("topics_title_length")) return "Titles need to be between 3 and 200 characters.";
  if (message.includes("posts_body_length")) return "Posts need at least one character and at most 40,000.";
  if (message.includes("profiles_username_key")) return "That username is taken.";
  if (message.includes("profiles_username_format")) return "Usernames are 3 to 30 characters: lowercase letters, numbers and underscores.";
  return fallback;
}
