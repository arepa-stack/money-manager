const http = require('http');

const getJson = (url) => {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error(`Failed to parse response from ${url}: ${e.message}. Raw data: ${data}`));
        }
      });
    }).on('error', reject);
  });
};

async function runTests() {
  console.log("=========================================");
  console.log("Starting Money Manager Engine API Validation");
  console.log("=========================================\n");
  
  try {
    // 1. Validate /api/accounts/balances
    console.log("Testing 1: Account Balances...");
    const balancesRes = await getJson('http://localhost:3000/api/accounts/balances');
    console.log(`- Status: ${balancesRes.status}`);
    if (balancesRes.status !== 200) throw new Error("Balances API did not return 200");
    if (!Array.isArray(balancesRes.data)) throw new Error("Balances API must return an array");
    
    console.log(`- Accounts found: ${balancesRes.data.length}`);
    balancesRes.data.forEach(acc => {
      console.log(`  * Account: "${acc.accountName}" | Balance: $${acc.balance} USD | Txs: ${acc.transactionCount}`);
    });
    console.log("✔ Account balances check passed.\n");

    // 2. Validate /api/transactions (current month default)
    console.log("Testing 2: Filtered Transactions (Current Month)...");
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const start = `${yyyy}-${mm}-01`;
    const end = `${yyyy}-${mm}-${new Date(yyyy, now.getMonth() + 1, 0).getDate()}`;
    
    const txUrl = `http://localhost:3000/api/transactions?startDate=${start}&endDate=${end}`;
    const txRes = await getJson(txUrl);
    console.log(`- Status: ${txRes.status}`);
    if (txRes.status !== 200) throw new Error("Transactions API did not return 200");
    if (!Array.isArray(txRes.data)) throw new Error("Transactions API must return an array");
    
    console.log(`- Transactions found in range [${start} to ${end}]: ${txRes.data.length}`);
    if (txRes.data.length > 0) {
      console.log("  * Sample Transaction:");
      const sample = txRes.data[0];
      console.log(`    Date: ${sample.transactionDate}`);
      console.log(`    Account: ${sample.account.name}`);
      console.log(`    Category: ${sample.category.name}`);
      console.log(`    Amount: ${sample.amount} ${sample.currency} ($${sample.baseAmountUsd} USD)`);
      console.log(`    Type: ${sample.transactionType}`);
    }
    console.log("✔ Transactions filter check passed.\n");

    // 3. Validate /api/reports/evolution
    console.log("Testing 3: Monthly Cumulative Wealth Evolution...");
    const evolutionRes = await getJson('http://localhost:3000/api/reports/evolution');
    console.log(`- Status: ${evolutionRes.status}`);
    if (evolutionRes.status !== 200) throw new Error("Evolution API did not return 200");
    if (!Array.isArray(evolutionRes.data)) throw new Error("Evolution API must return an array");
    
    console.log(`- Months generated: ${evolutionRes.data.length}`);
    evolutionRes.data.forEach(pt => {
      console.log(`  * Month: ${pt.month} | Cumulative Balance: $${pt.balance} USD`);
    });
    console.log("✔ Monthly wealth evolution check passed.\n");

    console.log("=========================================");
    console.log("✔ ALL API INTEGRITY VALIDATIONS PASSED!");
    console.log("=========================================");
  } catch (err) {
    console.error("❌ VALIDATION FAILED:", err.message);
    process.exit(1);
  }
}

runTests();
