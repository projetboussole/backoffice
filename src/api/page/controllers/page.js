const { createCoreController } = require("@strapi/strapi").factories;
const { createStorefrontApiClient } = require("@shopify/storefront-api-client");

const client = createStorefrontApiClient({
  apiVersion: "2024-04",
  storeDomain: "http://projet-boussole.myshopify.com",
  publicAccessToken: "963489a685f158c6a0e499c449321340",
});

const brandCollectionQuery = `
  query CollectionQuery($id: ID) {
    collection(id: $id) {
      title
      handle
      image {
        url
      }
      products(first: 250, filters: {available: true}) {
        edges {
          cursor
        }
      }
    }
  }
`;

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

/**
 * @param {any} id
 */
async function getBrandCollection(id) {
  const { data } = await client.request(brandCollectionQuery, {
    variables: { id: `gid://shopify/Collection/${id}` },
  });
  return data;
}

module.exports = createCoreController("api::page.page", () => ({
  async find(ctx) {
    const { data } = await super.find(ctx);

    const item = data?.[0];

    const content =
      item?.attributes?.content && item.attributes.content.length > 0
        ? await Promise.all(
            item.attributes.content.map(
              async (
                /** @type {{ __component: string; collection: { data: { attributes: { shopifyID: any; }; }; }; metafields: any[]; collections: { data: any[]; }; }} */ section
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

                if (
                  section.__component === "blocks.brands-section" &&
                  (section?.collections?.data || []).length > 0
                ) {
                  const res = await Promise.all(
                    section.collections.data.map(async (collection) => {
                      const id = collection?.attributes?.shopifyID;
                      const shopify = id ? await getBrandCollection(id) : null;
                      return {
                        ...collection,
                        productsLength: (
                          shopify?.collection?.products?.edges || []
                        ).length,
                      };
                    })
                  );

                  return {
                    ...section,
                    collections: { data: res },
                  };
                }

                return section;
              }
            )
          )
        : [];

    return {
      ...(item?.attributes || {}),
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
