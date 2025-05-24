const elasticsearchService = require('./elasticsearch');
const logger = require('../utils/logger');

class SearchService {
  constructor() {
    this.es = elasticsearchService;
  }

  /**
   * Advanced product search dengan filters dan aggregations
   */
  async searchProducts(query, filters = {}, options = {}) {
    try {
      const searchQuery = this.buildProductSearchQuery(query, filters);
      const searchOptions = this.buildSearchOptions(options);

      const result = await this.es.search(
        this.es.indices.products,
        searchQuery,
        searchOptions
      );

      return this.formatSearchResults(result, options);
    } catch (error) {
      logger.error('Error in product search:', error);
      throw error;
    }
  }

  /**
   * Auto-complete untuk product names
   */
  async autocompleteProducts(query, limit = 10) {
    try {
      const searchQuery = {
        query: {
          bool: {
            must: [
              {
                match: {
                  'name.autocomplete': {
                    query: query,
                    fuzziness: 'AUTO'
                  }
                }
              }
            ],
            filter: [
              { term: { isActive: true } },
              { term: { isAvailable: true } }
            ]
          }
        },
        _source: ['productId', 'name', 'price', 'images', 'shopName'],
        size: limit
      };

      const result = await this.es.search(this.es.indices.products, searchQuery);

      return result.hits.map(hit => ({
        productId: hit.productId,
        name: hit.name,
        price: hit.price,
        image: hit.images?.[0],
        shopName: hit.shopName,
        score: hit.score
      }));
    } catch (error) {
      logger.error('Error in autocomplete:', error);
      throw error;
    }
  }

  /**
   * Search dengan suggestions dan spell correction
   */
  async searchWithSuggestions(query, filters = {}, options = {}) {
    try {
      const searchQuery = this.buildProductSearchQuery(query, filters);

      // Add suggestions
      searchQuery.suggest = {
        text: query,
        product_suggestion: {
          term: {
            field: 'name',
            size: 3,
            sort: 'frequency'
          }
        },
        product_phrase_suggestion: {
          phrase: {
            field: 'name',
            size: 3,
            gram_size: 2,
            direct_generator: [{
              field: 'name',
              suggest_mode: 'missing',
              min_word_length: 3
            }]
          }
        }
      };

      const result = await this.es.search(
        this.es.indices.products,
        searchQuery,
        this.buildSearchOptions(options)
      );

      return {
        ...this.formatSearchResults(result, options),
        suggestions: this.formatSuggestions(result.suggestions)
      };
    } catch (error) {
      logger.error('Error in search with suggestions:', error);
      throw error;
    }
  }

  /**
   * Similar products berdasarkan product tertentu
   */
  async findSimilarProducts(productId, limit = 10) {
    try {
      // Get the source product first
      const sourceProduct = await this.es.getDocument(this.es.indices.products, productId);
      if (!sourceProduct) {
        throw new Error('Product not found');
      }

      const searchQuery = {
        query: {
          bool: {
            must: [
              {
                more_like_this: {
                  fields: ['name', 'description', 'category', 'brand'],
                  like: [
                    {
                      _index: this.es.indices.products,
                      _id: productId
                    }
                  ],
                  min_term_freq: 1,
                  max_query_terms: 12,
                  min_doc_freq: 1
                }
              }
            ],
            filter: [
              { term: { isActive: true } },
              { term: { isAvailable: true } }
            ],
            must_not: [
              { term: { productId: productId } }
            ]
          }
        },
        size: limit
      };

      const result = await this.es.search(this.es.indices.products, searchQuery);
      return result.hits;
    } catch (error) {
      logger.error('Error finding similar products:', error);
      throw error;
    }
  }

  /**
   * Trending products analysis
   */
  async getTrendingProducts(timeRange = '7d', limit = 20) {
    try {
      const searchQuery = {
        query: {
          bool: {
            filter: [
              { term: { isActive: true } },
              { term: { isAvailable: true } },
              {
                range: {
                  'metadata.lastUpdated': {
                    gte: `now-${timeRange}`
                  }
                }
              }
            ]
          }
        },
        sort: [
          { popularityScore: { order: 'desc' } },
          { soldCount: { order: 'desc' } },
          { reviewCount: { order: 'desc' } }
        ],
        size: limit
      };

      const result = await this.es.search(this.es.indices.products, searchQuery);
      return result.hits;
    } catch (error) {
      logger.error('Error getting trending products:', error);
      throw error;
    }
  }

  /**
   * Product analytics dan insights
   */
  async getProductAnalytics(filters = {}, timeRange = '30d') {
    try {
      const searchQuery = {
        query: {
          bool: {
            filter: this.buildFilters(filters)
          }
        },
        aggs: {
          categories: {
            terms: {
              field: 'category',
              size: 20
            },
            aggs: {
              avg_price: { avg: { field: 'price' } },
              avg_rating: { avg: { field: 'rating' } },
              total_sold: { sum: { field: 'soldCount' } }
            }
          },
          brands: {
            terms: {
              field: 'brand',
              size: 20
            },
            aggs: {
              avg_price: { avg: { field: 'price' } },
              product_count: { value_count: { field: 'productId' } }
            }
          },
          price_ranges: {
            range: {
              field: 'price',
              ranges: [
                { to: 50000, key: 'under_50k' },
                { from: 50000, to: 200000, key: '50k_200k' },
                { from: 200000, to: 500000, key: '200k_500k' },
                { from: 500000, key: 'above_500k' }
              ]
            }
          },
          rating_distribution: {
            histogram: {
              field: 'rating',
              interval: 0.5,
              min_doc_count: 1
            }
          },
          daily_trends: {
            date_histogram: {
              field: 'metadata.scrapedAt',
              calendar_interval: 'day',
              format: 'yyyy-MM-dd'
            },
            aggs: {
              new_products: { value_count: { field: 'productId' } },
              avg_price: { avg: { field: 'price' } }
            }
          }
        },
        size: 0
      };

      const result = await this.es.search(this.es.indices.products, searchQuery);
      return this.formatAnalyticsResults(result.aggregations);
    } catch (error) {
      logger.error('Error getting product analytics:', error);
      throw error;
    }
  }

  /**
   * Build search query untuk products
   */
  buildProductSearchQuery(query, filters) {
    const searchQuery = {
      query: {
        bool: {
          must: [],
          filter: [],
          should: []
        }
      }
    };

    // Text search
    if (query && query.trim()) {
      searchQuery.query.bool.must.push({
        multi_match: {
          query: query,
          fields: [
            'name^3',
            'name.autocomplete^2',
            'description^1',
            'brand^2',
            'category^1.5',
            'tags^1'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'and'
        }
      });

      // Boost exact matches
      searchQuery.query.bool.should.push({
        match_phrase: {
          name: {
            query: query,
            boost: 2
          }
        }
      });
    } else {
      searchQuery.query.bool.must.push({ match_all: {} });
    }

    // Apply filters
    searchQuery.query.bool.filter = this.buildFilters(filters);

    return searchQuery;
  }

  /**
   * Build filters array
   */
  buildFilters(filters) {
    const filterArray = [
      { term: { isActive: true } }
    ];

    if (filters.category) {
      filterArray.push({ term: { category: filters.category } });
    }

    if (filters.brand) {
      filterArray.push({ term: { brand: filters.brand } });
    }

    if (filters.shopId) {
      filterArray.push({ term: { shopId: filters.shopId } });
    }

    if (filters.priceMin || filters.priceMax) {
      const priceRange = {};
      if (filters.priceMin) priceRange.gte = parseFloat(filters.priceMin);
      if (filters.priceMax) priceRange.lte = parseFloat(filters.priceMax);
      filterArray.push({ range: { price: priceRange } });
    }

    if (filters.rating) {
      filterArray.push({ range: { rating: { gte: parseFloat(filters.rating) } } });
    }

    if (filters.freeShipping) {
      filterArray.push({ term: { 'shipping.freeShipping': true } });
    }

    if (filters.inStock) {
      filterArray.push({ range: { stock: { gt: 0 } } });
    }

    if (filters.location) {
      filterArray.push({ term: { shopLocation: filters.location } });
    }

    return filterArray;
  }

  /**
   * Build search options
   */
  buildSearchOptions(options) {
    const searchOptions = {
      from: options.from || 0,
      size: options.size || 20
    };

    // Sorting
    if (options.sort) {
      const sortField = options.sort;
      const sortOrder = options.order || 'desc';

      searchOptions.sort = [{ [sortField]: { order: sortOrder } }];

      // Add secondary sort for consistency
      if (sortField !== 'popularityScore') {
        searchOptions.sort.push({ popularityScore: { order: 'desc' } });
      }
    }

    // Aggregations
    if (options.includeAggregations) {
      searchOptions.aggs = {
        categories: {
          terms: { field: 'category', size: 10 }
        },
        brands: {
          terms: { field: 'brand', size: 10 }
        },
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { to: 50000, key: 'under_50k' },
              { from: 50000, to: 200000, key: '50k_200k' },
              { from: 200000, key: 'above_200k' }
            ]
          }
        }
      };
    }

    return searchOptions;
  }

  /**
   * Format search results
   */
  formatSearchResults(result, options) {
    return {
      hits: result.hits,
      total: result.total,
      aggregations: result.aggregations || {},
      took: result.took,
      maxScore: result.maxScore
    };
  }

  /**
   * Format suggestions
   */
  formatSuggestions(suggestions) {
    if (!suggestions) return {};

    const formatted = {};

    if (suggestions.product_suggestion) {
      formatted.terms = suggestions.product_suggestion[0]?.options || [];
    }

    if (suggestions.product_phrase_suggestion) {
      formatted.phrases = suggestions.product_phrase_suggestion[0]?.options || [];
    }

    return formatted;
  }

  /**
   * Format analytics results
   */
  formatAnalyticsResults(aggregations) {
    return {
      categories: aggregations.categories?.buckets || [],
      brands: aggregations.brands?.buckets || [],
      priceRanges: aggregations.price_ranges?.buckets || [],
      ratingDistribution: aggregations.rating_distribution?.buckets || [],
      dailyTrends: aggregations.daily_trends?.buckets || []
    };
  }

  /**
   * Order analytics dan reporting
   */
  async getOrderAnalytics(filters = {}, timeRange = '30d') {
    try {
      const searchQuery = {
        query: {
          bool: {
            filter: this.buildOrderFilters(filters, timeRange)
          }
        },
        aggs: {
          sales_over_time: {
            date_histogram: {
              field: 'orderDate',
              calendar_interval: 'day',
              format: 'yyyy-MM-dd'
            },
            aggs: {
              total_sales: { sum: { field: 'finalAmount' } },
              order_count: { value_count: { field: 'orderId' } },
              avg_order_value: { avg: { field: 'finalAmount' } }
            }
          },
          top_categories: {
            terms: {
              field: 'category',
              size: 10
            },
            aggs: {
              total_revenue: { sum: { field: 'finalAmount' } },
              order_count: { value_count: { field: 'orderId' } }
            }
          },
          top_products: {
            terms: {
              field: 'productId',
              size: 20
            },
            aggs: {
              total_revenue: { sum: { field: 'finalAmount' } },
              quantity_sold: { sum: { field: 'quantity' } },
              product_name: { terms: { field: 'productName.keyword', size: 1 } }
            }
          },
          payment_methods: {
            terms: {
              field: 'paymentMethod',
              size: 10
            }
          },
          customer_demographics: {
            terms: {
              field: 'customerLocation',
              size: 20
            },
            aggs: {
              avg_age: { avg: { field: 'customerAge' } },
              gender_breakdown: {
                terms: { field: 'customerGender' }
              }
            }
          },
          return_analysis: {
            filter: { term: { isReturned: true } },
            aggs: {
              return_reasons: {
                terms: { field: 'returnReason', size: 10 }
              },
              return_rate: {
                bucket_script: {
                  buckets_path: {
                    returns: '_count',
                    total: 'total_orders>_count'
                  },
                  script: 'params.returns / params.total * 100'
                }
              }
            }
          },
          total_orders: {
            value_count: { field: 'orderId' }
          }
        },
        size: 0
      };

      const result = await this.es.search(this.es.indices.orders, searchQuery);
      return this.formatOrderAnalyticsResults(result.aggregations);
    } catch (error) {
      logger.error('Error getting order analytics:', error);
      throw error;
    }
  }

  /**
   * Revenue trends analysis
   */
  async getRevenueTrends(timeRange = '90d', interval = 'day') {
    try {
      const searchQuery = {
        query: {
          range: {
            orderDate: {
              gte: `now-${timeRange}`
            }
          }
        },
        aggs: {
          revenue_trends: {
            date_histogram: {
              field: 'orderDate',
              calendar_interval: interval,
              format: 'yyyy-MM-dd'
            },
            aggs: {
              total_revenue: { sum: { field: 'finalAmount' } },
              order_count: { value_count: { field: 'orderId' } },
              avg_order_value: { avg: { field: 'finalAmount' } },
              unique_customers: { cardinality: { field: 'customerId' } }
            }
          },
          growth_rate: {
            serial_diff: {
              buckets_path: 'revenue_trends>total_revenue'
            }
          }
        },
        size: 0
      };

      const result = await this.es.search(this.es.indices.orders, searchQuery);
      return result.aggregations;
    } catch (error) {
      logger.error('Error getting revenue trends:', error);
      throw error;
    }
  }

  /**
   * Customer behavior analysis
   */
  async getCustomerBehaviorAnalysis(timeRange = '30d') {
    try {
      const searchQuery = {
        query: {
          range: {
            orderDate: {
              gte: `now-${timeRange}`
            }
          }
        },
        aggs: {
          repeat_customers: {
            terms: {
              field: 'customerId',
              min_doc_count: 2,
              size: 1000
            },
            aggs: {
              order_count: { value_count: { field: 'orderId' } },
              total_spent: { sum: { field: 'finalAmount' } },
              avg_order_value: { avg: { field: 'finalAmount' } }
            }
          },
          customer_lifetime_value: {
            terms: {
              field: 'customerId',
              size: 100,
              order: { total_spent: 'desc' }
            },
            aggs: {
              total_spent: { sum: { field: 'finalAmount' } },
              order_count: { value_count: { field: 'orderId' } },
              first_order: { min: { field: 'orderDate' } },
              last_order: { max: { field: 'orderDate' } }
            }
          },
          purchase_frequency: {
            histogram: {
              script: {
                source: "doc['customerId'].value.hashCode()"
              },
              interval: 1
            }
          }
        },
        size: 0
      };

      const result = await this.es.search(this.es.indices.orders, searchQuery);
      return result.aggregations;
    } catch (error) {
      logger.error('Error getting customer behavior analysis:', error);
      throw error;
    }
  }

  /**
   * Build order filters
   */
  buildOrderFilters(filters, timeRange) {
    const filterArray = [];

    // Time range filter
    if (timeRange) {
      filterArray.push({
        range: {
          orderDate: {
            gte: `now-${timeRange}`
          }
        }
      });
    }

    if (filters.category) {
      filterArray.push({ term: { category: filters.category } });
    }

    if (filters.shopId) {
      filterArray.push({ term: { shopId: filters.shopId } });
    }

    if (filters.paymentMethod) {
      filterArray.push({ term: { paymentMethod: filters.paymentMethod } });
    }

    if (filters.customerLocation) {
      filterArray.push({ term: { customerLocation: filters.customerLocation } });
    }

    if (filters.orderStatus) {
      filterArray.push({ term: { orderStatus: filters.orderStatus } });
    }

    if (filters.minAmount || filters.maxAmount) {
      const amountRange = {};
      if (filters.minAmount) amountRange.gte = parseFloat(filters.minAmount);
      if (filters.maxAmount) amountRange.lte = parseFloat(filters.maxAmount);
      filterArray.push({ range: { finalAmount: amountRange } });
    }

    return filterArray;
  }

  /**
   * Format order analytics results
   */
  formatOrderAnalyticsResults(aggregations) {
    return {
      salesOverTime: aggregations.sales_over_time?.buckets || [],
      topCategories: aggregations.top_categories?.buckets || [],
      topProducts: aggregations.top_products?.buckets || [],
      paymentMethods: aggregations.payment_methods?.buckets || [],
      customerDemographics: aggregations.customer_demographics?.buckets || [],
      returnAnalysis: aggregations.return_analysis || {},
      totalOrders: aggregations.total_orders?.value || 0
    };
  }
}

module.exports = new SearchService();
