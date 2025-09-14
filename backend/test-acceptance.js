// Acceptance Test Suite for KYC/AML System
// Tests all P0 requirements and acceptance criteria

const testCases = [
  {
    name: "OFAC Sanctions Test",
    description: "Test known OFAC-listed name → RED with evidence",
    payload: {
      caseId: "test-ofac-001",
      fullLegalName: "Osama bin Laden", // Known OFAC listed
      dateOfBirth: "1957-03-10",
      taxResidencyCountry: "SA",
      tin: "123456789",
      email: "test@example.com",
      clientType: "individual",
      ipAddress: "192.168.1.1"
    },
    expectedStatus: "RED",
    expectedCheck: "US OFAC Sanctions"
  },
  
  {
    name: "French PEP Test",
    description: "Test current French elected official → PEP AMBER/GREEN",
    payload: {
      caseId: "test-pep-001", 
      fullLegalName: "Emmanuel Macron", // Current French President
      dateOfBirth: "1977-12-21",
      taxResidencyCountry: "FR",
      tin: "123456789",
      email: "test@example.com",
      clientType: "individual",
      pepStatus: "yes",
      ipAddress: "192.168.1.1"
    },
    expectedStatus: "AMBER",
    expectedCheck: "PEP Screening"
  },
  
  {
    name: "Valid SIREN Test",
    description: "Test valid French SIREN → GREEN",
    payload: {
      caseId: "test-siren-001",
      fullLegalName: "Test Company SAS",
      dateOfBirth: "2020-01-01",
      taxResidencyCountry: "FR", 
      tin: "123456789",
      email: "test@example.com",
      clientType: "entity",
      registrationNumber: "123456789", // Valid SIREN format
      ipAddress: "192.168.1.1"
    },
    expectedStatus: "GREEN",
    expectedCheck: "Entity Registry"
  },
  
  {
    name: "Invalid VAT Test",
    description: "Test fake VAT → RED with pattern note",
    payload: {
      caseId: "test-vat-001",
      fullLegalName: "Test Company Ltd",
      dateOfBirth: "2020-01-01", 
      taxResidencyCountry: "DE",
      tin: "123456789",
      email: "test@example.com",
      clientType: "entity",
      vatNumber: "DE123456789", // Invalid VAT
      ipAddress: "192.168.1.1"
    },
    expectedStatus: "RED",
    expectedCheck: "VAT Validation"
  },
  
  {
    name: "French IP Test",
    description: "Test submission from French IP → GREEN",
    payload: {
      caseId: "test-ip-001",
      fullLegalName: "Test User",
      dateOfBirth: "1990-01-01",
      taxResidencyCountry: "FR",
      tin: "123456789", 
      email: "test@example.com",
      clientType: "individual",
      ipAddress: "2.2.2.2" // French IP
    },
    expectedStatus: "GREEN",
    expectedCheck: "IP Geolocation"
  },
  
  {
    name: "Datacenter IP Test", 
    description: "Test from datacenter IP → AMBER with ASN note",
    payload: {
      caseId: "test-dc-001",
      fullLegalName: "Test User",
      dateOfBirth: "1990-01-01",
      taxResidencyCountry: "US",
      tin: "123456789",
      email: "test@example.com", 
      clientType: "individual",
      ipAddress: "8.8.8.8" // Google DNS (datacenter)
    },
    expectedStatus: "AMBER",
    expectedCheck: "IP Geolocation"
  },
  
  {
    name: "Valid IBAN Test",
    description: "Test valid IBAN → GREEN",
    payload: {
      caseId: "test-iban-001",
      fullLegalName: "Test User",
      dateOfBirth: "1990-01-01",
      taxResidencyCountry: "FR",
      tin: "123456789",
      email: "test@example.com",
      clientType: "individual", 
      iban: "FR1420041010050500013M02606", // Valid French IBAN
      ipAddress: "192.168.1.1"
    },
    expectedStatus: "GREEN",
    expectedCheck: "IBAN Validation"
  },
  
  {
    name: "Invalid IBAN Test",
    description: "Test invalid IBAN → RED",
    payload: {
      caseId: "test-iban-002", 
      fullLegalName: "Test User",
      dateOfBirth: "1990-01-01",
      taxResidencyCountry: "FR",
      tin: "123456789",
      email: "test@example.com",
      clientType: "individual",
      iban: "FR1420041010050500013M02607", // Invalid checksum
      ipAddress: "192.168.1.1"
    },
    expectedStatus: "RED",
    expectedCheck: "IBAN Validation"
  },
  
  {
    name: "OFAC Crypto Wallet Test",
    description: "Test OFAC-listed crypto wallet → RED",
    payload: {
      caseId: "test-crypto-001",
      fullLegalName: "Test User",
      dateOfBirth: "1990-01-01", 
      taxResidencyCountry: "US",
      tin: "123456789",
      email: "test@example.com",
      clientType: "individual",
      wallets: ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"], // Known OFAC crypto address
      ipAddress: "192.168.1.1"
    },
    expectedStatus: "RED",
    expectedCheck: "OFAC Crypto Address"
  }
];

async function runAcceptanceTests() {
  console.log("🧪 Running KYC/AML System Acceptance Tests\n");
  
  const API_BASE = "https://uy9omnj0u7.execute-api.eu-west-3.amazonaws.com/prod";
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`   ${testCase.description}`);
    
    try {
      // Submit the test case
      const submitResponse = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.payload)
      });
      
      if (!submitResponse.ok) {
        throw new Error(`Submit failed: ${submitResponse.status}`);
      }
      
      const submitResult = await submitResult.json();
      console.log(`   ✅ Submission successful: ${submitResult.caseId}`);
      
      // Wait a moment for screening to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check screening results
      const screeningResponse = await fetch(`${API_BASE}/screening`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.payload)
      });
      
      if (!screeningResponse.ok) {
        throw new Error(`Screening failed: ${screeningResponse.status}`);
      }
      
      const screeningResult = await screeningResponse.json();
      
      // Verify expected status
      if (screeningResult.overallStatus === testCase.expectedStatus) {
        console.log(`   ✅ Status correct: ${screeningResult.overallStatus}`);
        passed++;
      } else {
        console.log(`   ❌ Status incorrect: expected ${testCase.expectedStatus}, got ${screeningResult.overallStatus}`);
        failed++;
      }
      
      // Verify expected check exists
      const hasExpectedCheck = screeningResult.results?.some(r => 
        r.check.includes(testCase.expectedCheck)
      );
      
      if (hasExpectedCheck) {
        console.log(`   ✅ Expected check found: ${testCase.expectedCheck}`);
      } else {
        console.log(`   ❌ Expected check missing: ${testCase.expectedCheck}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log(`\n🎉 All acceptance tests passed! System is compliant.`);
  } else {
    console.log(`\n⚠️  ${failed} tests failed. System needs fixes before go-live.`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAcceptanceTests().catch(console.error);
}

module.exports = { runAcceptanceTests, testCases };
