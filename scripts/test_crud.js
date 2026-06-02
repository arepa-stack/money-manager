const http = require('http');

const request = (url, method, body = null) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function testCrud() {
  console.log("=========================================");
  console.log("Starting CRUD Endpoints Validation Tests");
  console.log("=========================================\n");

  const baseUrl = 'http://localhost:3000';
  let testAccountId = null;
  let testCategoryId = null;
  let testTransactionId = null;

  try {
    // 1. Crear Cuenta
    console.log("Testing 1: Creating a test account...");
    const createAccRes = await request(`${baseUrl}/api/accounts`, 'POST', { name: 'Cuenta Temporal Test' });
    console.log(`- Status: ${createAccRes.status}`);
    if (createAccRes.status !== 201) throw new Error(`Failed to create account: ${JSON.stringify(createAccRes.data)}`);
    testAccountId = createAccRes.data.id;
    console.log(`✔ Account created with ID: ${testAccountId}\n`);

    // 2. Editar Cuenta
    console.log("Testing 2: Editing account name...");
    const editAccRes = await request(`${baseUrl}/api/accounts/${testAccountId}`, 'PUT', { name: 'Cuenta Temporal Test Editada' });
    console.log(`- Status: ${editAccRes.status}`);
    if (editAccRes.status !== 200) throw new Error(`Failed to edit account: ${JSON.stringify(editAccRes.data)}`);
    console.log(`✔ Account renamed to: ${editAccRes.data.name}\n`);

    // 3. Crear Categoría
    console.log("Testing 3: Creating a test category...");
    const createCatRes = await request(`${baseUrl}/api/categories`, 'POST', { name: 'Categoría Temporal Test', type: 'EXPENSE' });
    console.log(`- Status: ${createCatRes.status}`);
    if (createCatRes.status !== 201) throw new Error(`Failed to create category: ${JSON.stringify(createCatRes.data)}`);
    testCategoryId = createCatRes.data.id;
    console.log(`✔ Category created with ID: ${testCategoryId}\n`);

    // 4. Crear Transacción Manual
    console.log("Testing 4: Creating a manual transaction...");
    const createTxRes = await request(`${baseUrl}/api/transactions`, 'POST', {
      transactionDate: new Date().toISOString(),
      accountId: testAccountId,
      transactionType: 'EXPENSE',
      amount: 15.50, // 15.50 original float
      currency: 'VES',
      baseAmountUsd: 0.40, // 0.40 USD original float
      categoryId: testCategoryId,
      note: 'Transacción de prueba CRUD API',
      description: 'Prueba de integración manual'
    });
    console.log(`- Status: ${createTxRes.status}`);
    if (createTxRes.status !== 201) throw new Error(`Failed to create transaction: ${JSON.stringify(createTxRes.data)}`);
    testTransactionId = createTxRes.data.id;
    console.log(`✔ Transaction created with ID: ${testTransactionId}`);
    console.log(`  * Stored Amount in cents: ${createTxRes.data.amount} (${createTxRes.data.currency})`);
    console.log(`  * Stored USD in cents: ${createTxRes.data.baseAmountUsd}\n`);

    // 5. Validar Regla de Integridad: Intentar borrar cuenta con transacciones
    console.log("Testing 5: Validating Account Deletion Integrity Rule...");
    const deleteAccFailRes = await request(`${baseUrl}/api/accounts/${testAccountId}`, 'DELETE');
    console.log(`- Status: ${deleteAccFailRes.status} (Expected: 400)`);
    if (deleteAccFailRes.status !== 400) {
      throw new Error(`Integrity rule broken: Account deleted even when having active transactions. Status: ${deleteAccFailRes.status}`);
    }
    console.log("✔ Integrity rule passed: API blocked deletion correctly.\n");

    // 6. Eliminar Transacción
    console.log("Testing 6: Deleting the transaction...");
    const deleteTxRes = await request(`${baseUrl}/api/transactions/${testTransactionId}`, 'DELETE');
    console.log(`- Status: ${deleteTxRes.status}`);
    if (deleteTxRes.status !== 200) throw new Error(`Failed to delete transaction: ${JSON.stringify(deleteTxRes.data)}`);
    console.log("✔ Transaction deleted successfully.\n");

    // 7. Eliminar Cuenta
    console.log("Testing 7: Deleting the account (should pass now)...");
    const deleteAccSuccessRes = await request(`${baseUrl}/api/accounts/${testAccountId}`, 'DELETE');
    console.log(`- Status: ${deleteAccSuccessRes.status}`);
    if (deleteAccSuccessRes.status !== 200) throw new Error(`Failed to delete account: ${JSON.stringify(deleteAccSuccessRes.data)}`);
    console.log("✔ Account deleted successfully.\n");

    // 8. Eliminar Categoría
    console.log("Testing 8: Deleting the category...");
    const deleteCatRes = await request(`${baseUrl}/api/categories/${testCategoryId}`, 'DELETE');
    console.log(`- Status: ${deleteCatRes.status}`);
    if (deleteCatRes.status !== 200) throw new Error(`Failed to delete category: ${JSON.stringify(deleteCatRes.data)}`);
    console.log("✔ Category deleted successfully.\n");

    console.log("=========================================");
    console.log("✔ ALL CRUD INTEGRATION TESTS PASSED!");
    console.log("=========================================");

  } catch (err) {
    console.error("❌ CRUD VALIDATION FAILED:", err.message);
    
    // Cleanup if necessary
    if (testTransactionId) await request(`${baseUrl}/api/transactions/${testTransactionId}`, 'DELETE').catch(() => {});
    if (testAccountId) await request(`${baseUrl}/api/accounts/${testAccountId}`, 'DELETE').catch(() => {});
    if (testCategoryId) await request(`${baseUrl}/api/categories/${testCategoryId}`, 'DELETE').catch(() => {});
    
    process.exit(1);
  }
}

testCrud();
