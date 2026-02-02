export interface SalaryRecord {
  title: string;
  location: string;
  year: number;
  salary: number;
  country: string;
}

// Data Sources:
// UK: ONS ASHE 2024 (Projected +4%)
// USA: BLS OEWS May 2023 (Projected +7% for 2025/26)

export const ukSalaries: SalaryRecord[] = [
  // --- TECH & ENGINEERING (UK) ---
  { title: 'Software Engineer', location: 'London', year: 2025, salary: 68000, country: 'UK' },
  { title: 'Software Engineer', location: 'UK', year: 2025, salary: 52000, country: 'UK' },
  {
    title: 'Senior Software Engineer',
    location: 'London',
    year: 2025,
    salary: 95000,
    country: 'UK',
  },
  { title: 'Senior Software Engineer', location: 'UK', year: 2025, salary: 78000, country: 'UK' },
  { title: 'DevOps Engineer', location: 'London', year: 2025, salary: 85000, country: 'UK' },
  { title: 'Data Scientist', location: 'London', year: 2025, salary: 72000, country: 'UK' },
  { title: 'Product Manager', location: 'London', year: 2025, salary: 75000, country: 'UK' },
  { title: 'Product Manager', location: 'UK', year: 2025, salary: 60000, country: 'UK' },

  // --- HEALTHCARE (UK - NHS Bands Approx) ---
  { title: 'Nurse', location: 'UK', year: 2025, salary: 37000, country: 'UK' },
  { title: 'Nurse', location: 'London', year: 2025, salary: 42000, country: 'UK' },
  { title: 'General Practitioner', location: 'UK', year: 2025, salary: 75000, country: 'UK' },

  // --- FINANCE & BUSINESS (UK) ---
  { title: 'Accountant', location: 'UK', year: 2025, salary: 45000, country: 'UK' },
  { title: 'Accountant', location: 'London', year: 2025, salary: 55000, country: 'UK' },
  { title: 'Management Consultant', location: 'London', year: 2025, salary: 65000, country: 'UK' },
  { title: 'HR Manager', location: 'UK', year: 2025, salary: 50000, country: 'UK' },

  // --- EDUCATION (UK) ---
  { title: 'Teacher', location: 'UK', year: 2025, salary: 42000, country: 'UK' },
  { title: 'Teacher', location: 'London', year: 2025, salary: 48000, country: 'UK' },

  // --- TRADES & SERVICES (UK) ---
  { title: 'Electrician', location: 'UK', year: 2025, salary: 38000, country: 'UK' },
  { title: 'Plumber', location: 'UK', year: 2025, salary: 36000, country: 'UK' },
  { title: 'Chef', location: 'UK', year: 2025, salary: 28000, country: 'UK' },

  // --- USA BENCHMARKS (BLS Data) ---
  // Tech
  { title: 'Software Engineer', location: 'New York', year: 2025, salary: 145000, country: 'USA' },
  {
    title: 'Software Engineer',
    location: 'San Francisco',
    year: 2025,
    salary: 165000,
    country: 'USA',
  },
  { title: 'Software Engineer', location: 'USA', year: 2025, salary: 125000, country: 'USA' },
  {
    title: 'Senior Software Engineer',
    location: 'USA',
    year: 2025,
    salary: 160000,
    country: 'USA',
  },
  { title: 'Product Manager', location: 'USA', year: 2025, salary: 135000, country: 'USA' },
  { title: 'Data Scientist', location: 'USA', year: 2025, salary: 130000, country: 'USA' },

  // Healthcare US
  { title: 'Registered Nurse', location: 'USA', year: 2025, salary: 89000, country: 'USA' },
  { title: 'Registered Nurse', location: 'California', year: 2025, salary: 130000, country: 'USA' },

  // Business US
  { title: 'Accountant', location: 'USA', year: 2025, salary: 85000, country: 'USA' },
  { title: 'HR Manager', location: 'USA', year: 2025, salary: 136000, country: 'USA' },
  { title: 'Marketing Manager', location: 'USA', year: 2025, salary: 140000, country: 'USA' },

  // Education & Trades US
  { title: 'Teacher', location: 'USA', year: 2025, salary: 68000, country: 'USA' },
  { title: 'Electrician', location: 'USA', year: 2025, salary: 65000, country: 'USA' },
  { title: 'Truck Driver', location: 'USA', year: 2025, salary: 55000, country: 'USA' },

  // Generic Fallbacks
  { title: 'Professional', location: 'UK', year: 2025, salary: 36000, country: 'UK' },
  { title: 'Professional', location: 'London', year: 2025, salary: 45000, country: 'UK' },
  { title: 'Professional', location: 'USA', year: 2025, salary: 62000, country: 'USA' },
];
