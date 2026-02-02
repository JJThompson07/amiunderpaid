export interface SalaryRecord {
  title: string;
  location: string;
  year: number;
  salary: number;
  country: string;
}

export const ukSalaries: SalaryRecord[] = [
  // --- Engineering ---
  { title: 'Software Engineer', location: 'London', year: 2025, salary: 65000, country: 'UK' },
  { title: 'Software Engineer', location: 'London', year: 2026, salary: 68500, country: 'UK' },
  {
    title: 'Senior Software Engineer',
    location: 'London',
    year: 2025,
    salary: 95000,
    country: 'UK',
  },
  {
    title: 'Senior Software Engineer',
    location: 'London',
    year: 2026,
    salary: 99000,
    country: 'UK',
  },
  {
    title: 'Lead Software Engineer',
    location: 'London',
    year: 2025,
    salary: 110000,
    country: 'UK',
  },
  {
    title: 'Lead Software Engineer',
    location: 'London',
    year: 2026,
    salary: 115000,
    country: 'UK',
  },
  {
    title: 'Junior Software Engineer',
    location: 'London',
    year: 2025,
    salary: 40000,
    country: 'UK',
  },
  {
    title: 'Junior Software Engineer',
    location: 'London',
    year: 2026,
    salary: 42000,
    country: 'UK',
  },
  { title: 'DevOps Engineer', location: 'London', year: 2025, salary: 75000, country: 'UK' },
  { title: 'DevOps Engineer', location: 'London', year: 2026, salary: 78000, country: 'UK' },

  // --- Product ---
  { title: 'Product Manager', location: 'London', year: 2025, salary: 70000, country: 'UK' },
  { title: 'Product Manager', location: 'London', year: 2026, salary: 74000, country: 'UK' },
  { title: 'Senior Product Manager', location: 'London', year: 2025, salary: 90000, country: 'UK' },
  { title: 'Senior Product Manager', location: 'London', year: 2026, salary: 95000, country: 'UK' },
  { title: 'Head of Product', location: 'London', year: 2025, salary: 130000, country: 'UK' },
  { title: 'Head of Product', location: 'London', year: 2026, salary: 138000, country: 'UK' },

  // --- Design ---
  { title: 'Product Designer', location: 'London', year: 2025, salary: 60000, country: 'UK' },
  { title: 'Product Designer', location: 'London', year: 2026, salary: 63000, country: 'UK' },
  {
    title: 'Senior Product Designer',
    location: 'London',
    year: 2025,
    salary: 85000,
    country: 'UK',
  },
  {
    title: 'Senior Product Designer',
    location: 'London',
    year: 2026,
    salary: 89000,
    country: 'UK',
  },
  { title: 'UX Researcher', location: 'London', year: 2025, salary: 55000, country: 'UK' },
  { title: 'UX Researcher', location: 'London', year: 2026, salary: 58000, country: 'UK' },

  // --- Data ---
  { title: 'Data Scientist', location: 'London', year: 2025, salary: 65000, country: 'UK' },
  { title: 'Data Scientist', location: 'London', year: 2026, salary: 69000, country: 'UK' },
  { title: 'Data Analyst', location: 'London', year: 2025, salary: 45000, country: 'UK' },
  { title: 'Data Analyst', location: 'London', year: 2026, salary: 47500, country: 'UK' },

  // --- Marketing / Sales ---
  { title: 'Marketing Manager', location: 'London', year: 2025, salary: 55000, country: 'UK' },
  { title: 'Marketing Manager', location: 'London', year: 2026, salary: 58000, country: 'UK' },
  { title: 'Account Executive', location: 'London', year: 2025, salary: 50000, country: 'UK' },
  { title: 'Account Executive', location: 'London', year: 2026, salary: 52000, country: 'UK' },

  // --- UK National Defaults (Generic fallbacks) ---
  { title: 'Professional', location: 'UK', year: 2025, salary: 35000, country: 'UK' },
  { title: 'Professional', location: 'UK', year: 2026, salary: 36500, country: 'UK' },
  { title: 'Professional', location: 'London', year: 2025, salary: 44000, country: 'UK' },
  { title: 'Professional', location: 'London', year: 2026, salary: 46000, country: 'UK' },
];
