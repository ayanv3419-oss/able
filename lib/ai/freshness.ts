const EXPLICIT_FRESHNESS =
  /\b(latest|newest|recent(?:ly)?|today|tonight|yesterday|right now|breaking|live|up[- ]to[- ]date|this (?:week|month|year))\b/i;

const CURRENT_VOLATILE_FACT =
  /\bcurrent(?:ly)?\s+(?:price|cost|version|model|president|prime minister|ceo|winner|score|weather|forecast|news|availability|status|leader|rate|law|rule)s?\b/i;

const LAUNCH_OR_AVAILABILITY =
  /\b(?:launch(?:ed|ing)?|release(?:d| date)?|coming out|available|availability|where (?:can|will) .*?(?:buy|launch)|when (?:does|did|will|is) .*?(?:launch|release))\b/i;

const LIVE_INFORMATION =
  /\b(?:news|weather|forecast|score|standings|schedule|stock price|exchange rate|election results?|flight status)\b/i;

const PRODUCT_REQUEST =
  /\b(?:features?|specs?|specifications?|camera|battery|processor|display|price|review)\b/i;

const NAMED_CONSUMER_PRODUCT =
  /\b(?:iphone|ipad|macbook|galaxy|pixel|surface|playstation|xbox|snapdragon|ryzen|geforce|rtx|oneplus|nothing phone|redmi|xiaomi|realme|oppo|vivo|tesla)\b|\b[a-z]{1,8}\d{2,4}(?:\s+(?:ultra|pro|max|plus|air|mini|fe))?\b/i;

/**
 * Conservatively detects questions that are unsafe to answer from model
 * memory alone. False negatives are preferable to searching every ordinary
 * lesson, while explicit current-event and named-product questions search by
 * default so Able never invents a launch date or specification.
 */
export function shouldAutoEnableWebSearch(input: string): boolean {
  const text = input.replace(/\s+/g, " ").trim();

  if (text.length < 3) {
    return false;
  }

  if (
    EXPLICIT_FRESHNESS.test(text) ||
    CURRENT_VOLATILE_FACT.test(text) ||
    LAUNCH_OR_AVAILABILITY.test(text) ||
    LIVE_INFORMATION.test(text)
  ) {
    return true;
  }

  return PRODUCT_REQUEST.test(text) && NAMED_CONSUMER_PRODUCT.test(text);
}
