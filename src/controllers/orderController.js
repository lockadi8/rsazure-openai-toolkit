const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const moment = require('moment');

class OrderController {
  // Get orders with filters
  async getOrders(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        page = 1,
        limit = 20,
        status,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        accountId,
        sort = 'orderDate',
        order = 'desc'
      } = req.query;

      const userId = req.user.userId;

      // Simulate order data
      const orders = [
        {
          id: 'order_001',
          orderId: 'SPE2024030001',
          userId,
          accountId: 'acc_001',
          orderDate: moment().subtract(2, 'days').toISOString(),
          status: 'completed',
          totalAmount: 250000,
          shippingFee: 15000,
          discount: 25000,
          finalAmount: 240000,
          paymentMethod: 'Credit Card',
          shippingAddress: {
            name: 'John Doe',
            phone: '+6281234567890',
            address: 'Jl. Sudirman No. 123',
            city: 'Jakarta',
            postalCode: '12345'
          },
          items: [
            {
              productId: 'prod_001',
              name: 'Smartphone Case',
              price: 150000,
              quantity: 1,
              variant: 'Black'
            },
            {
              productId: 'prod_002',
              name: 'Screen Protector',
              price: 100000,
              quantity: 1,
              variant: 'Clear'
            }
          ],
          tracking: {
            courier: 'JNE',
            trackingNumber: 'JNE123456789',
            status: 'delivered'
          }
        },
        {
          id: 'order_002',
          orderId: 'SPE2024030002',
          userId,
          accountId: 'acc_001',
          orderDate: moment().subtract(5, 'days').toISOString(),
          status: 'shipped',
          totalAmount: 450000,
          shippingFee: 20000,
          discount: 0,
          finalAmount: 470000,
          paymentMethod: 'Bank Transfer',
          shippingAddress: {
            name: 'John Doe',
            phone: '+6281234567890',
            address: 'Jl. Sudirman No. 123',
            city: 'Jakarta',
            postalCode: '12345'
          },
          items: [
            {
              productId: 'prod_003',
              name: 'Wireless Headphones',
              price: 450000,
              quantity: 1,
              variant: 'White'
            }
          ],
          tracking: {
            courier: 'SiCepat',
            trackingNumber: 'SC987654321',
            status: 'in_transit'
          }
        }
      ];

      // Apply filters (simulation)
      let filteredOrders = orders;
      
      if (status) {
        filteredOrders = filteredOrders.filter(order => order.status === status);
      }
      
      if (startDate) {
        filteredOrders = filteredOrders.filter(order => 
          moment(order.orderDate).isAfter(moment(startDate))
        );
      }
      
      if (endDate) {
        filteredOrders = filteredOrders.filter(order => 
          moment(order.orderDate).isBefore(moment(endDate))
        );
      }

      if (minAmount) {
        filteredOrders = filteredOrders.filter(order => order.finalAmount >= parseInt(minAmount));
      }

      if (maxAmount) {
        filteredOrders = filteredOrders.filter(order => order.finalAmount <= parseInt(maxAmount));
      }

      if (accountId) {
        filteredOrders = filteredOrders.filter(order => order.accountId === accountId);
      }

      // Apply sorting
      filteredOrders.sort((a, b) => {
        const aValue = a[sort];
        const bValue = b[sort];
        
        if (order === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedOrders = filteredOrders.slice(startIndex, startIndex + limit);

      res.json({
        orders: paginatedOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredOrders.length,
          pages: Math.ceil(filteredOrders.length / limit)
        },
        filters: {
          status,
          startDate,
          endDate,
          minAmount,
          maxAmount,
          accountId,
          sort,
          order
        }
      });
    } catch (error) {
      logger.error('Get orders error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching orders'
      });
    }
  }

  // Get order by ID
  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.userId;

      // Simulate order data
      const order = {
        id: orderId,
        orderId: 'SPE2024030001',
        userId,
        accountId: 'acc_001',
        orderDate: moment().subtract(2, 'days').toISOString(),
        status: 'completed',
        totalAmount: 250000,
        shippingFee: 15000,
        discount: 25000,
        finalAmount: 240000,
        paymentMethod: 'Credit Card',
        shippingAddress: {
          name: 'John Doe',
          phone: '+6281234567890',
          address: 'Jl. Sudirman No. 123',
          city: 'Jakarta',
          postalCode: '12345'
        },
        items: [
          {
            productId: 'prod_001',
            name: 'Smartphone Case',
            price: 150000,
            quantity: 1,
            variant: 'Black',
            image: 'https://example.com/image1.jpg',
            shopName: 'Tech Store'
          },
          {
            productId: 'prod_002',
            name: 'Screen Protector',
            price: 100000,
            quantity: 1,
            variant: 'Clear',
            image: 'https://example.com/image2.jpg',
            shopName: 'Tech Store'
          }
        ],
        tracking: {
          courier: 'JNE',
          trackingNumber: 'JNE123456789',
          status: 'delivered',
          history: [
            {
              date: moment().subtract(2, 'days').toISOString(),
              status: 'Order placed',
              location: 'Jakarta'
            },
            {
              date: moment().subtract(1, 'day').toISOString(),
              status: 'Package shipped',
              location: 'Jakarta Distribution Center'
            },
            {
              date: moment().toISOString(),
              status: 'Package delivered',
              location: 'Jakarta'
            }
          ]
        },
        timeline: [
          {
            date: moment().subtract(2, 'days').toISOString(),
            event: 'Order placed',
            description: 'Your order has been confirmed'
          },
          {
            date: moment().subtract(1, 'day').toISOString(),
            event: 'Payment confirmed',
            description: 'Payment has been processed successfully'
          },
          {
            date: moment().subtract(1, 'day').add(2, 'hours').toISOString(),
            event: 'Order shipped',
            description: 'Your order has been shipped'
          },
          {
            date: moment().toISOString(),
            event: 'Order delivered',
            description: 'Your order has been delivered successfully'
          }
        ]
      };

      res.json({ order });
    } catch (error) {
      logger.error('Get order by ID error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching order'
      });
    }
  }

  // Get order analytics
  async getOrderAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      const userId = req.user.userId;

      // Simulate analytics data
      const analytics = {
        summary: {
          totalOrders: 156,
          totalAmount: 15600000,
          averageOrderValue: 100000,
          completedOrders: 148,
          cancelledOrders: 8
        },
        trends: [
          {
            date: moment().subtract(6, 'days').format('YYYY-MM-DD'),
            orders: 5,
            amount: 750000
          },
          {
            date: moment().subtract(5, 'days').format('YYYY-MM-DD'),
            orders: 8,
            amount: 1200000
          },
          {
            date: moment().subtract(4, 'days').format('YYYY-MM-DD'),
            orders: 3,
            amount: 450000
          },
          {
            date: moment().subtract(3, 'days').format('YYYY-MM-DD'),
            orders: 12,
            amount: 1800000
          },
          {
            date: moment().subtract(2, 'days').format('YYYY-MM-DD'),
            orders: 6,
            amount: 900000
          },
          {
            date: moment().subtract(1, 'day').format('YYYY-MM-DD'),
            orders: 9,
            amount: 1350000
          },
          {
            date: moment().format('YYYY-MM-DD'),
            orders: 4,
            amount: 600000
          }
        ],
        statusDistribution: [
          { status: 'completed', count: 148, percentage: 94.9 },
          { status: 'cancelled', count: 8, percentage: 5.1 }
        ],
        paymentMethods: [
          { method: 'Credit Card', count: 89, percentage: 57.1 },
          { method: 'Bank Transfer', count: 45, percentage: 28.8 },
          { method: 'E-Wallet', count: 22, percentage: 14.1 }
        ],
        topCategories: [
          { category: 'Electronics', orders: 45, amount: 6750000 },
          { category: 'Fashion', orders: 38, amount: 3800000 },
          { category: 'Home & Living', orders: 25, amount: 2500000 }
        ]
      };

      res.json({
        analytics,
        filters: { startDate, endDate, groupBy }
      });
    } catch (error) {
      logger.error('Get order analytics error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching order analytics'
      });
    }
  }

  // Export orders
  async exportOrders(req, res) {
    try {
      const { format = 'json', startDate, endDate, status } = req.query;
      const userId = req.user.userId;

      // Get orders data (simulation)
      const orders = [
        {
          orderId: 'SPE2024030001',
          orderDate: moment().subtract(2, 'days').format('YYYY-MM-DD'),
          status: 'completed',
          totalAmount: 250000,
          finalAmount: 240000,
          paymentMethod: 'Credit Card'
        },
        {
          orderId: 'SPE2024030002',
          orderDate: moment().subtract(5, 'days').format('YYYY-MM-DD'),
          status: 'shipped',
          totalAmount: 450000,
          finalAmount: 470000,
          paymentMethod: 'Bank Transfer'
        }
      ];

      if (format === 'csv') {
        const csv = this.convertToCSV(orders);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=orders-export.csv');
        return res.send(csv);
      }

      res.json({
        data: orders,
        count: orders.length,
        exportedAt: new Date().toISOString(),
        filters: { format, startDate, endDate, status }
      });
    } catch (error) {
      logger.error('Export orders error:', error);
      res.status(500).json({
        error: 'Internal server error while exporting orders'
      });
    }
  }

  // Helper method to convert data to CSV
  convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }
}

module.exports = new OrderController();
