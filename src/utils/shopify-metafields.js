const SAVINGS_BADGE_TEMPLATE_KEY = "savings_badge_template";

function buildProductMetafieldIdentifiers(metafields = []) {
  const keys = new Set([...metafields, SAVINGS_BADGE_TEMPLATE_KEY]);
  return [...keys].map((key) => ({ namespace: "custom", key }));
}

module.exports = { buildProductMetafieldIdentifiers };
