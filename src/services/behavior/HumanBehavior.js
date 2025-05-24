const logger = require('../../utils/logger');

/**
 * Human Behavior Simulation Module
 * Mensimulasikan perilaku manusia untuk menghindari deteksi bot:
 * - Mouse movement simulation dengan bezier curves
 * - Human-like typing dengan variasi delay
 * - Natural scroll patterns
 * - Click timing randomization
 * - Page navigation delays
 * - Reading time simulation
 */
class HumanBehavior {
  constructor(options = {}) {
    this.config = {
      // Typing behavior
      typingSpeed: {
        min: 50,
        max: 150,
        ...options.typingSpeed
      },
      
      // Mouse behavior
      mouseSpeed: {
        min: 100,
        max: 300,
        ...options.mouseSpeed
      },
      
      // Scroll behavior
      scrollSpeed: {
        min: 200,
        max: 800,
        ...options.scrollSpeed
      },
      
      // Reading behavior
      readingSpeed: {
        wordsPerMinute: 200,
        variationPercent: 30,
        ...options.readingSpeed
      },
      
      // Navigation behavior
      navigationDelay: {
        min: 1000,
        max: 3000,
        ...options.navigationDelay
      },
      
      ...options
    };

    logger.scraper('HumanBehavior module initialized');
  }

  /**
   * Generate random delay with human-like distribution
   */
  getRandomDelay(min, max, distribution = 'normal') {
    if (distribution === 'normal') {
      // Use normal distribution for more realistic delays
      const mean = (min + max) / 2;
      const stdDev = (max - min) / 6;
      
      let u = 0, v = 0;
      while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
      while(v === 0) v = Math.random();
      
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      const delay = Math.round(mean + stdDev * z);
      
      return Math.max(min, Math.min(max, delay));
    }
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Simulate human-like mouse movement using bezier curves
   */
  async simulateMouseMovement(page, fromX, fromY, toX, toY, steps = 10) {
    const controlX1 = fromX + (toX - fromX) * 0.25 + (Math.random() - 0.5) * 100;
    const controlY1 = fromY + (toY - fromY) * 0.25 + (Math.random() - 0.5) * 100;
    const controlX2 = fromX + (toX - fromX) * 0.75 + (Math.random() - 0.5) * 100;
    const controlY2 = fromY + (toY - fromY) * 0.75 + (Math.random() - 0.5) * 100;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.pow(1 - t, 3) * fromX + 
                3 * Math.pow(1 - t, 2) * t * controlX1 + 
                3 * (1 - t) * Math.pow(t, 2) * controlX2 + 
                Math.pow(t, 3) * toX;
      const y = Math.pow(1 - t, 3) * fromY + 
                3 * Math.pow(1 - t, 2) * t * controlY1 + 
                3 * (1 - t) * Math.pow(t, 2) * controlY2 + 
                Math.pow(t, 3) * toY;

      await page.mouse.move(x, y);
      await this.wait(this.getRandomDelay(10, 30));
    }
  }

  /**
   * Human-like typing with realistic delays and errors
   */
  async humanType(page, selector, text, options = {}) {
    const {
      clearFirst = true,
      simulateErrors = true,
      errorRate = 0.02
    } = options;

    await page.click(selector);
    await this.wait(this.getRandomDelay(100, 300));

    if (clearFirst) {
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await this.wait(this.getRandomDelay(50, 100));
    }

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Simulate typing errors
      if (simulateErrors && Math.random() < errorRate) {
        // Type wrong character
        const wrongChar = String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
        await page.keyboard.type(wrongChar);
        await this.wait(this.getRandomDelay(100, 300));
        
        // Realize mistake and correct it
        await page.keyboard.press('Backspace');
        await this.wait(this.getRandomDelay(100, 200));
      }

      // Type the correct character
      await page.keyboard.type(char);
      
      // Variable typing speed
      let delay = this.getRandomDelay(
        this.config.typingSpeed.min, 
        this.config.typingSpeed.max
      );
      
      // Slower for uppercase letters and special characters
      if (char.match(/[A-Z]/) || char.match(/[^a-zA-Z0-9\s]/)) {
        delay *= 1.5;
      }
      
      // Faster for common letter combinations
      if (i > 0) {
        const combo = text.substring(i-1, i+1);
        if (['th', 'he', 'in', 'er', 'an', 're'].includes(combo)) {
          delay *= 0.8;
        }
      }

      await this.wait(delay);
    }
  }

  /**
   * Natural scrolling patterns
   */
  async naturalScroll(page, direction = 'down', distance = null, options = {}) {
    const {
      steps = 5,
      pauseProbability = 0.3,
      pauseDuration = { min: 500, max: 2000 }
    } = options;

    if (!distance) {
      distance = this.getRandomDelay(300, 800);
    }

    const stepSize = distance / steps;
    const scrollDirection = direction === 'down' ? 1 : -1;

    for (let i = 0; i < steps; i++) {
      // Random pause during scrolling (simulating reading)
      if (Math.random() < pauseProbability) {
        await this.wait(this.getRandomDelay(pauseDuration.min, pauseDuration.max));
      }

      await page.evaluate((stepSize, scrollDirection) => {
        window.scrollBy(0, stepSize * scrollDirection);
      }, stepSize, scrollDirection);

      await this.wait(this.getRandomDelay(
        this.config.scrollSpeed.min / steps,
        this.config.scrollSpeed.max / steps
      ));
    }
  }

  /**
   * Human-like clicking with pre-hover
   */
  async humanClick(page, selector, options = {}) {
    const {
      hoverDuration = { min: 200, max: 800 },
      clickDelay = { min: 50, max: 150 },
      doubleClick = false
    } = options;

    try {
      // Get element position
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      const box = await element.boundingBox();
      if (!box) {
        throw new Error(`Element not visible: ${selector}`);
      }

      // Calculate click position with slight randomization
      const x = box.x + box.width * (0.3 + Math.random() * 0.4);
      const y = box.y + box.height * (0.3 + Math.random() * 0.4);

      // Move mouse to element with human-like movement
      const currentMouse = await page.evaluate(() => ({ x: 0, y: 0 }));
      await this.simulateMouseMovement(page, currentMouse.x, currentMouse.y, x, y);

      // Hover for a moment
      await this.wait(this.getRandomDelay(hoverDuration.min, hoverDuration.max));

      // Click
      await page.mouse.click(x, y);
      
      if (doubleClick) {
        await this.wait(this.getRandomDelay(50, 150));
        await page.mouse.click(x, y);
      }

      await this.wait(this.getRandomDelay(clickDelay.min, clickDelay.max));

    } catch (error) {
      logger.error(`Human click failed for selector: ${selector}`, error);
      // Fallback to regular click
      await page.click(selector);
    }
  }

  /**
   * Simulate reading time based on content length
   */
  async simulateReadingTime(page, selector = null) {
    try {
      let textLength = 0;
      
      if (selector) {
        textLength = await page.$eval(selector, el => el.textContent.length);
      } else {
        textLength = await page.evaluate(() => document.body.textContent.length);
      }

      const words = Math.ceil(textLength / 5); // Average 5 characters per word
      const baseReadingTime = (words / this.config.readingSpeed.wordsPerMinute) * 60 * 1000;
      
      // Add variation
      const variation = baseReadingTime * (this.config.readingSpeed.variationPercent / 100);
      const readingTime = baseReadingTime + (Math.random() - 0.5) * 2 * variation;
      
      const finalTime = Math.max(1000, Math.min(30000, readingTime)); // Between 1-30 seconds
      
      logger.scraper(`Simulating reading time: ${Math.round(finalTime)}ms for ${words} words`);
      await this.wait(finalTime);
      
    } catch (error) {
      logger.error('Failed to simulate reading time:', error);
      await this.wait(this.getRandomDelay(2000, 5000));
    }
  }

  /**
   * Random page navigation delay
   */
  async navigationDelay() {
    const delay = this.getRandomDelay(
      this.config.navigationDelay.min,
      this.config.navigationDelay.max
    );
    
    logger.scraper(`Navigation delay: ${delay}ms`);
    await this.wait(delay);
  }

  /**
   * Simulate random mouse movements (fidgeting)
   */
  async randomMouseMovements(page, count = 3) {
    const viewport = page.viewport();
    
    for (let i = 0; i < count; i++) {
      const x = Math.random() * viewport.width;
      const y = Math.random() * viewport.height;
      
      await page.mouse.move(x, y);
      await this.wait(this.getRandomDelay(500, 1500));
    }
  }

  /**
   * Basic wait function
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simulate human-like form filling
   */
  async fillForm(page, formData) {
    for (const [selector, value] of Object.entries(formData)) {
      await this.humanClick(page, selector);
      await this.humanType(page, selector, value);
      await this.wait(this.getRandomDelay(500, 1500));
    }
  }
}

module.exports = HumanBehavior;
