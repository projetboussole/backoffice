const { createCoreController } = require("@strapi/strapi").factories;
const { createStorefrontApiClient } = require("@shopify/storefront-api-client");

const client = createStorefrontApiClient({
  apiVersion: "2024-04",
  storeDomain: "http://projet-boussole.myshopify.com",
  publicAccessToken: "963489a685f158c6a0e499c449321340",
});

/**
 * @param {any} id
 * @param {any[]} metafields
 */
async function getCollection(id, metafields, first) {
  const { data } = await client.request(productsSliderQuery, {
    variables: {
      first,
      id: `gid://shopify/Collection/${id}`,
      identifiers:
        metafields.length > 0
          ? metafields.map((m) => ({ namespace: "custom", key: m }))
          : undefined,
    },
  });
  return data;
}

module.exports = createCoreController("api::product.product", () => ({
  async find(ctx) {
    const response = await super.find(ctx);

    const content =
      response?.data?.attributes?.content || []
        ? await Promise.all(
            response.data.attributes.content.map(
              async (
                /** @type {{ __component: string; collection: { data: { attributes: { shopifyID: any; }; }; }; metafields: any[]; }} */ section
              ) => {
                if (
                  section.__component === "blocks.products-slider" &&
                  section?.collection?.data?.attributes?.shopifyID
                ) {
                  const id = section.collection.data.attributes.shopifyID;
                  const metafields = section?.metafields || [];
                  // @ts-ignore
                  const productsLength = section?.productsLength || 6;

                  const shopify = id
                    ? await getCollection(id, metafields, productsLength)
                    : null;
                  return {
                    ...section,
                    products: shopify?.collection?.products || [],
                  };
                }

                return section;
              }
            )
          )
        : [];

    return {
      ...(response?.data?.attributes || {}),
      content,
    };
  },
}));

const productsSliderQuery = `
  query ProductsSliderQuery($id: ID, $first: Int = 6, $identifiers: [HasMetafieldsIdentifier!] = [{namespace: "custom", key: "taille"}, {namespace: "custom", key: "annee"}]) {
    collection(id: $id) {
      products(first: $first, sortKey: CREATED, reverse: true) {
        nodes {
          id
          title
          handle
          vendor
          metafields(identifiers: $identifiers) {
            key
            value
          }
          featuredImage {
            url
            id
          }
          images(first: 2) {
            nodes {
              url
              id
            }
          }
          compareAtPriceRange {
            maxVariantPrice {
              amount
              currencyCode
            }
            minVariantPrice {
              amount
              currencyCode
            }
          }
          priceRange {
            maxVariantPrice {
              amount
              currencyCode
            }
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;
