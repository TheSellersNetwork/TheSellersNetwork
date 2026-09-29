/* Opens the site search palette from anywhere (header box, phone search button). */

export const OPEN_SEARCH_EVENT = "tsn:open-search";

export function openSearch(query = "") {
  window.dispatchEvent(new CustomEvent<{ query: string }>(OPEN_SEARCH_EVENT, { detail: { query } }));
}
