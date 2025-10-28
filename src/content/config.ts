import { defineCollection, z } from "astro:content";

// Homepage collection schema
const homepageCollection = defineCollection({
  schema: z.object({
    banner: z.object({
      title: z.string(),
      content: z.string(),
      image: z.string(),
      image_alt: z.string().optional(),
      button: z.object({
        enable: z.boolean(),
        label: z.string(),
        link: z.string(),
      }),
    }),
    key_features: z.object({
      title: z.string(),
      description: z.string(),
      feature_list: z.array(z.object({
        icon: z.string(),
        title: z.string(),
        content: z.string(),
      })),
    }),
    service: z.object({
      homepage_tab: z.object({
        title: z.string(),
        description: z.string(),
        tab_list: z.array(z.object({
          title: z.string(),
          icon: z.string(),
          image: z.string(),
        })),
      }),
      our_service: z.array(z.object({
        title: z.string(),
        desctiption: z.string().optional(),
        description: z.string().optional(),
        image: z.string().optional(),
        list: z.array(z.string()).optional(),
        video: z.object({
          thumbnail: z.string(),
          video_id: z.string(),
        }).optional(),
        button: z.object({
          label: z.string(),
          link: z.string(),
          enable: z.boolean(),
        }).optional(),
      })),
    }).optional(),
    testimonial: z.object({
      title: z.string(),
      description: z.string(),
      testimonial_list: z.array(z.object({
        author: z.string(),
        avatar: z.string(),
        organization: z.string(),
        rating: z.string(),
        content: z.string(),
      })),
    }),
  }),
});

// Pricing collection schema
const pricingCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    page_title: z.string().optional(),
    pricing_card: z.array(z.object({
      title: z.string(),
      description: z.string(),
      featured: z.boolean(),
      image: z.string(),
      product_key: z.string(),
      buttons: z.object({
        buy_now: z.object({
          label: z.string(),
          link: z.string(),
        }),
      }),
      services: z.object({
        list: z.array(z.string()),
      }),
    })),
    faq: z.object({
      title: z.string(),
      description: z.string(),
      faq_list: z.array(z.object({
        title: z.string(),
        content: z.string(),
      })),
    }).optional(),
  }),
});

// Contact collection schema
const contactCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

// Export collections
export const collections = {
  homepage: homepageCollection,
  pricing: pricingCollection,
  contact: contactCollection,
};
