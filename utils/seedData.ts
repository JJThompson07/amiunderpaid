export interface SalaryRecord {
  title: string;
  location: string;
  year: number;
  salary: number;
  country: string;
}

/**
 * SOURCE DATA SUMMARY (2025/2026 PROJECTIONS):
 * * UK DATA: Based on ONS ASHE (Annual Survey of Hours and Earnings) 2024.
 * Applied 4.2% projected increase for 2025/26 market alignment.
 * * USA DATA: Based on BLS OEWS (Occupational Employment and Wage Statistics) May 2023.
 * Applied 6.5% projected increase for 2025/26 cost-of-living/market alignment.
 */

export const ukSalaries: SalaryRecord[] = [
  // --- TECHNOLOGY & DIGITAL (UK) ---
  { title: 'Software Engineer', location: 'London', year: 2025, salary: 74500, country: 'UK' },
  { title: 'Software Engineer', location: 'UK', year: 2025, salary: 56800, country: 'UK' },
  { title: 'Frontend Developer', location: 'London', year: 2025, salary: 68000, country: 'UK' },
  { title: 'Frontend Developer', location: 'UK', year: 2025, salary: 52500, country: 'UK' },
  { title: 'Backend Developer', location: 'UK', year: 2025, salary: 61000, country: 'UK' },
  { title: 'Data Scientist', location: 'London', year: 2025, salary: 78200, country: 'UK' },
  { title: 'Data Scientist', location: 'UK', year: 2025, salary: 62400, country: 'UK' },
  { title: 'Product Manager', location: 'London', year: 2025, salary: 81500, country: 'UK' },
  { title: 'Product Manager', location: 'UK', year: 2025, salary: 58900, country: 'UK' },
  { title: 'DevOps Engineer', location: 'London', year: 2025, salary: 89000, country: 'UK' },
  { title: 'UX Designer', location: 'London', year: 2025, salary: 64200, country: 'UK' },
  { title: 'Cyber Security Analyst', location: 'UK', year: 2025, salary: 67500, country: 'UK' },
  { title: 'CTO', location: 'London', year: 2025, salary: 148000, country: 'UK' },

  // --- HEALTHCARE & SOCIAL CARE (UK) ---
  { title: 'Nurse', location: 'UK', year: 2025, salary: 40200, country: 'UK' },
  { title: 'Nurse', location: 'London', year: 2025, salary: 46800, country: 'UK' },
  { title: 'Doctor', location: 'UK', year: 2025, salary: 84500, country: 'UK' },
  { title: 'Pharmacist', location: 'UK', year: 2025, salary: 49100, country: 'UK' },
  { title: 'Physiotherapist', location: 'UK', year: 2025, salary: 38800, country: 'UK' },
  { title: 'Care Assistant', location: 'UK', year: 2025, salary: 25400, country: 'UK' },

  // --- BUSINESS, FINANCE & LEGAL (UK) ---
  { title: 'Accountant', location: 'London', year: 2025, salary: 59200, country: 'UK' },
  { title: 'Accountant', location: 'UK', year: 2025, salary: 47600, country: 'UK' },
  { title: 'Financial Analyst', location: 'London', year: 2025, salary: 65000, country: 'UK' },
  { title: 'HR Manager', location: 'UK', year: 2025, salary: 54300, country: 'UK' },
  { title: 'Solicitor', location: 'London', year: 2025, salary: 92400, country: 'UK' },
  { title: 'Marketing Manager', location: 'UK', year: 2025, salary: 51200, country: 'UK' },

  // --- EDUCATION (UK) ---
  { title: 'Teacher', location: 'UK', year: 2025, salary: 43500, country: 'UK' },
  { title: 'Teacher', location: 'London', year: 2025, salary: 49000, country: 'UK' },
  { title: 'University Lecturer', location: 'UK', year: 2025, salary: 55200, country: 'UK' },

  // --- TRADES & CONSTRUCTION (UK) ---
  { title: 'Electrician', location: 'UK', year: 2025, salary: 42100, country: 'UK' },
  { title: 'Plumber', location: 'UK', year: 2025, salary: 40800, country: 'UK' },
  { title: 'Carpenter', location: 'UK', year: 2025, salary: 37400, country: 'UK' },
  { title: 'Site Manager', location: 'UK', year: 2025, salary: 58500, country: 'UK' },

  // --- USA BENCHMARKS (BLS DATA) ---
  // Tech (USA)
  {
    title: 'Software Engineer',
    location: 'San Francisco',
    year: 2025,
    salary: 182000,
    country: 'USA',
  },
  { title: 'Software Engineer', location: 'New York', year: 2025, salary: 161000, country: 'USA' },
  { title: 'Software Engineer', location: 'USA', year: 2025, salary: 136000, country: 'USA' },
  { title: 'Frontend Developer', location: 'USA', year: 2025, salary: 122000, country: 'USA' },
  { title: 'Backend Developer', location: 'USA', year: 2025, salary: 138000, country: 'USA' },
  { title: 'Data Scientist', location: 'USA', year: 2025, salary: 154000, country: 'USA' },
  { title: 'Product Manager', location: 'USA', year: 2025, salary: 151000, country: 'USA' },
  { title: 'DevOps Engineer', location: 'USA', year: 2025, salary: 148000, country: 'USA' },

  // Healthcare (USA)
  { title: 'Registered Nurse', location: 'California', year: 2025, salary: 141000, country: 'USA' },
  { title: 'Registered Nurse', location: 'USA', year: 2025, salary: 94200, country: 'USA' },
  { title: 'Physician', location: 'USA', year: 2025, salary: 248000, country: 'USA' },
  { title: 'Dentist', location: 'USA', year: 2025, salary: 189000, country: 'USA' },

  // Business & Finance (USA)
  { title: 'Accountant', location: 'USA', year: 2025, salary: 89600, country: 'USA' },
  { title: 'Financial Analyst', location: 'New York', year: 2025, salary: 118000, country: 'USA' },
  { title: 'HR Manager', location: 'USA', year: 2025, salary: 144000, country: 'USA' },
  { title: 'Attorney', location: 'USA', year: 2025, salary: 168000, country: 'USA' },

  // Education & Trades (USA)
  { title: 'Teacher', location: 'USA', year: 2025, salary: 72400, country: 'USA' },
  { title: 'Electrician', location: 'USA', year: 2025, salary: 70500, country: 'USA' },
  { title: 'Plumber', location: 'USA', year: 2025, salary: 68200, country: 'USA' },

  // --- GENERIC FALLBACKS ---
  { title: 'Professional', location: 'UK', year: 2025, salary: 39200, country: 'UK' },
  { title: 'Professional', location: 'London', year: 2025, salary: 49500, country: 'UK' },
  { title: 'Professional', location: 'USA', year: 2025, salary: 67200, country: 'USA' },
];
