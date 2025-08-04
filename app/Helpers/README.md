# Application Helpers (`/app/Helpers`)

This directory is **reserved for application-specific helper functions** and utilities. Core framework helpers have been moved to `framework/helpers/`.

---

## 📁 **Current Status**

This directory is currently **empty** - all core helpers have been moved to the framework:

- **`Response`** → `framework/helpers/Response.js`
- **`Logger`** → `framework/helpers/Logger.js`  
- **`ApiHelpers`** → `framework/helpers/ApiHelpers.js`
- **`SSEHelpers`** → `framework/helpers/SSEHelpers.js`

## 🔗 **Using Framework Helpers**

Import framework helpers in your application code:

```javascript
// In your controllers or services
const Response = require('../../framework/helpers/Response');
const Logger = require('../../framework/helpers/Logger');

class MyController {
  async index(req, res) {
    try {
      const data = await MyService.getData();
      return Response.success(res, data, 'Data retrieved successfully');
    } catch (error) {
      Logger.error('Failed to retrieve data:', error.message);
      return Response.error(res, 'Failed to retrieve data', error.message, 500);
    }
  }
}
```

## 🚀 **Adding Application-Specific Helpers**

Use this directory for **business-specific utility functions**:

### **Example: Business Helper**
```javascript
// app/Helpers/PricingHelper.js
class PricingHelper {
  static calculateDiscount(price, discountPercent) {
    return price * (1 - discountPercent / 100);
  }

  static formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  static calculateTax(subtotal, taxRate) {
    return subtotal * (taxRate / 100);
  }
}

module.exports = PricingHelper;
```

### **Example: Validation Helper**
```javascript
// app/Helpers/ValidationHelper.js
class ValidationHelper {
  static isValidPhoneNumber(phone) {
    const phoneRegex = /^\+?[\d\s-()]+$/;
    return phoneRegex.test(phone);
  }

  static sanitizeInput(input) {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  static generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

module.exports = ValidationHelper;
```

### **Usage in Your Code**
```javascript
// In your services or controllers
const PricingHelper = require('../../Helpers/PricingHelper');

class OrderService {
  async calculateOrderTotal(items, taxRate, discountPercent = 0) {
    let subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Apply discount
    if (discountPercent > 0) {
      subtotal = PricingHelper.calculateDiscount(subtotal, discountPercent);
    }
    
    // Calculate tax
    const tax = PricingHelper.calculateTax(subtotal, taxRate);
    const total = subtotal + tax;
    
    return {
      subtotal,
      tax,
      total,
      formattedTotal: PricingHelper.formatCurrency(total)
    };
  }
}
```

## 📋 **Guidelines**

### **✅ Use This Directory For**
- Business-specific calculations and utilities
- Application domain helpers
- Custom validation functions
- Data transformation utilities
- Integration helpers for external services

### **❌ Don't Put Here**
- HTTP response formatting (use `framework/helpers/Response`)
- Logging utilities (use `framework/helpers/Logger`)
- Generic utilities that could be framework features

## 🧪 **Testing Helpers**

```javascript
// tests/Unit/Helpers/PricingHelper.test.js
const PricingHelper = require('../../../app/Helpers/PricingHelper');

describe('PricingHelper', () => {
  describe('calculateDiscount', () => {
    test('should calculate 10% discount correctly', () => {
      const price = 100;
      const discount = 10;
      const result = PricingHelper.calculateDiscount(price, discount);
      expect(result).toBe(90);
    });
  });

  describe('formatCurrency', () => {
    test('should format USD currency correctly', () => {
      const amount = 99.99;
      const result = PricingHelper.formatCurrency(amount);
      expect(result).toBe('$99.99');
    });
  });
});
```

Use this directory to build **application-specific utilities** while leveraging the robust framework helpers for common operations! 🚀