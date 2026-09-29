import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/forum/queries";
import { MobileTabBarClient } from "@/components/layout/mobile-tab-bar-client";

/*
  The bar along the bottom of the screen on phones: Forum, Pickups, New post,
  Notifications and You. Signed-out visitors get Sign in and Join in place of
  the last two. Both lookups are cached per request, so sharing them with the
  header costs nothing.
*/
export async function MobileTabBar() {
  const user = await getCurrentUser();
  const unread = user ? await getUnreadNotificationCount(user.id) : 0;
  return <MobileTabBarClient username={user?.profile.username ?? null} unread={unread} />;
}
