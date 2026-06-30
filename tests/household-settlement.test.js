const assert = require('assert');

function calculateSuggestions(balances) {
  const positive = balances.filter((entry) => entry.balance > 0);
  const negative = balances.filter((entry) => entry.balance < 0);
  const suggestions = [];

  while (positive.length > 0 && negative.length > 0) {
    const creditor = positive[0];
    const debtor = negative[0];
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

    suggestions.push({ from: debtor.name, to: creditor.name, amount: Number(amount.toFixed(2)) });
    creditor.balance -= amount;
    debtor.balance += amount;

    if (creditor.balance <= 0.0001) positive.shift();
    if (debtor.balance >= -0.0001) negative.shift();
  }

  return suggestions;
}

async function run() {
  const suggestions = calculateSuggestions([
    { name: 'Alice', balance: 50 },
    { name: 'Bob', balance: -30 },
    { name: 'Cara', balance: -20 },
  ]);

  assert.deepStrictEqual(suggestions, [
    { from: 'Bob', to: 'Alice', amount: 30 },
    { from: 'Cara', to: 'Alice', amount: 20 },
  ]);

  console.log('household settlement tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
