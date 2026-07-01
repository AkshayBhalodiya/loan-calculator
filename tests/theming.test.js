const assert = require('assert');

// Mock browser global environment for tests
global.window = {};
global.document = {
  documentElement: {
    classList: {
      activeClasses: new Set(),
      remove(...names) {
        names.forEach(name => this.activeClasses.delete(name));
      },
      add(name) {
        this.activeClasses.add(name);
      },
      contains(name) {
        return this.activeClasses.has(name);
      }
    },
    style: {
      colorScheme: ''
    }
  }
};

// Mock matchMedia
let isSystemDark = false;
global.window.matchMedia = (query) => {
  return {
    matches: query.includes('dark') ? isSystemDark : !isSystemDark,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
};

async function run() {
  const mod = await import('../src/components/site-header.tsx');
  const applyTheme = mod.applyTheme || mod.default?.applyTheme;
  
  assert.ok(typeof applyTheme === 'function', 'applyTheme should be exported as a function');

  const classList = global.document.documentElement.classList;
  const style = global.document.documentElement.style;

  // 1. Light Theme
  applyTheme('light');
  assert.ok(classList.contains('light'));
  assert.ok(!classList.contains('dark'));
  assert.ok(!classList.contains('midnight'));
  assert.strictEqual(style.colorScheme, 'light');

  // 2. Dark Theme
  applyTheme('dark');
  assert.ok(classList.contains('dark'));
  assert.ok(!classList.contains('light'));
  assert.ok(!classList.contains('midnight'));
  assert.strictEqual(style.colorScheme, 'dark');

  // 3. Midnight Theme
  applyTheme('midnight');
  assert.ok(classList.contains('midnight'));
  assert.ok(!classList.contains('light'));
  assert.ok(!classList.contains('dark'));
  assert.strictEqual(style.colorScheme, 'dark');

  // 4. System Preference: Light
  isSystemDark = false;
  applyTheme('system');
  assert.ok(classList.contains('light'));
  assert.ok(!classList.contains('dark'));
  assert.ok(!classList.contains('midnight'));
  assert.strictEqual(style.colorScheme, 'light');

  // 5. System Preference: Dark
  isSystemDark = true;
  applyTheme('system');
  assert.ok(classList.contains('dark'));
  assert.ok(!classList.contains('light'));
  assert.ok(!classList.contains('midnight'));
  assert.strictEqual(style.colorScheme, 'dark');

  console.log('custom theme switcher unit tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
