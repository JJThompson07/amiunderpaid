import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

const apiKey = process.env.REED_API_KEY;

if (!apiKey) {
  console.error('REED_API_KEY environment variable is not set.');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');

async function testSpeed(resultsToTake: number) {
  const url = `https://www.reed.co.uk/api/1.0/search?keywords=developer&locationName=london&resultsToTake=${resultsToTake}`;
  
  const start = performance.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: authHeader
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const end = performance.now();
    
    const timeInMs = Math.round(end - start);
    console.log(`resultsToTake: ${resultsToTake.toString().padStart(4, ' ')} | Time: ${timeInMs}ms | Returned: ${data.results.length} | Total Market Jobs: ${data.totalResults}`);
  } catch (error) {
    const end = performance.now();
    const timeInMs = Math.round(end - start);
    console.error(`resultsToTake: ${resultsToTake.toString().padStart(4, ' ')} | Time: ${timeInMs}ms | Error: ${error}`);
  }
}

async function main() {
  console.log('Testing Reed API speeds...\n');
  const sizes = [100, 250, 500, 1000];
  
  for (const size of sizes) {
    await testSpeed(size);
    // Add a small delay between requests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

main();
