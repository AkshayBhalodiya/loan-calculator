const assert = require('assert');
const { simulateSchema } = require('../src/lib/validation');

function run() {
  // valid input
  const valid = {
    loan: {
      loanAmount: 100000,
      annualRate: 7.5,
      tenureYears: 10,
      startDate: '2024-01-01',
      loanType: 'Home',
      manualEmi: null,
    },
    strategy: {
      monthlyExtra: 1000,
      extraEmiEveryMonths: 0,
      yearlyLumpSum: 0,
    },
  };

  let res = simulateSchema.safeParse(valid);
  assert.strictEqual(res.success, true, 'Valid input should pass validation');

  // invalid input: missing loanAmount and bad email-like fields
  const invalid = {
    loan: {
      loanAmount: -10,
      annualRate: 1000,
      tenureYears: 0,
      startDate: 'not-a-date',
      loanType: 'Unknown',
      manualEmi: -5,
    },
    strategy: {
      monthlyExtra: -1,
      extraEmiEveryMonths: -5,
      yearlyLumpSum: -100,
    },
  };

  res = simulateSchema.safeParse(invalid);
  assert.strictEqual(res.success, false, 'Invalid input should fail validation');
  const issues = res.error.issues;
  assert.ok(Array.isArray(issues) && issues.length > 0, 'Should return field issues');
  // check that at least one known path is reported
  const paths = issues.map((i) => i.path.join('.'));
  assert.ok(paths.includes('loan.loanAmount'), 'Should report loan.loanAmount error');
  assert.ok(paths.includes('loan.startDate'), 'Should report loan.startDate error');

  console.log('simulate schema tests passed');
}

try {
  run();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
