export interface USARegion {
  id: number;
  name: string;
}
export interface USALocation {
  id: number;
  gov_name: string;
  name: string;
}

export interface USATerritory {
  id: number;
  gov_name: string;
  name: string;
  region: USARegion;
}

export const USA_LOCATIONS: USALocation[] = [
  { id: 1, gov_name: 'Alabama', name: 'Alabama' },
  { id: 2, gov_name: 'Alaska', name: 'Alaska' },
  { id: 3, gov_name: 'Arizona', name: 'Arizona' },
  { id: 4, gov_name: 'Arkansas', name: 'Arkansas' },
  { id: 5, gov_name: 'California', name: 'California' },
  { id: 6, gov_name: 'Colorado', name: 'Colorado' },
  { id: 7, gov_name: 'Connecticut', name: 'Connecticut' },
  { id: 8, gov_name: 'Delaware', name: 'Delaware' },
  { id: 9, gov_name: 'District of Columbia', name: 'District of Columbia' },
  { id: 10, gov_name: 'Florida', name: 'Florida' },
  { id: 11, gov_name: 'Georgia', name: 'Georgia' },
  { id: 12, gov_name: 'Guam', name: 'Guam' },
  { id: 13, gov_name: 'Hawaii', name: 'Hawaii' },
  { id: 14, gov_name: 'Idaho', name: 'Idaho' },
  { id: 15, gov_name: 'Illinois', name: 'Illinois' },
  { id: 16, gov_name: 'Indiana', name: 'Indiana' },
  { id: 17, gov_name: 'Iowa', name: 'Iowa' },
  { id: 18, gov_name: 'Kansas', name: 'Kansas' },
  { id: 19, gov_name: 'Kentucky', name: 'Kentucky' },
  { id: 20, gov_name: 'Louisiana', name: 'Louisiana' },
  { id: 21, gov_name: 'Maine', name: 'Maine' },
  { id: 22, gov_name: 'Maryland', name: 'Maryland' },
  { id: 23, gov_name: 'Massachusetts', name: 'Massachusetts' },
  { id: 24, gov_name: 'Michigan', name: 'Michigan' },
  { id: 25, gov_name: 'Minnesota', name: 'Minnesota' },
  { id: 26, gov_name: 'Mississippi', name: 'Mississippi' },
  { id: 27, gov_name: 'Missouri', name: 'Missouri' },
  { id: 28, gov_name: 'Montana', name: 'Montana' },
  { id: 29, gov_name: 'Nebraska', name: 'Nebraska' },
  { id: 30, gov_name: 'Nevada', name: 'Nevada' },
  { id: 31, gov_name: 'New Hampshire', name: 'New Hampshire' },
  { id: 32, gov_name: 'New Jersey', name: 'New Jersey' },
  { id: 33, gov_name: 'New Mexico', name: 'New Mexico' },
  { id: 34, gov_name: 'New York', name: 'New York' },
  { id: 35, gov_name: 'North Carolina', name: 'North Carolina' },
  { id: 36, gov_name: 'North Dakota', name: 'North Dakota' },
  { id: 37, gov_name: 'Ohio', name: 'Ohio' },
  { id: 38, gov_name: 'Oklahoma', name: 'Oklahoma' },
  { id: 39, gov_name: 'Oregon', name: 'Oregon' },
  { id: 40, gov_name: 'Pennsylvania', name: 'Pennsylvania' },
  { id: 41, gov_name: 'Puerto Rico', name: 'Puerto Rico' },
  { id: 42, gov_name: 'Rhode Island', name: 'Rhode Island' },
  { id: 43, gov_name: 'South Carolina', name: 'South Carolina' },
  { id: 44, gov_name: 'South Dakota', name: 'South Dakota' },
  { id: 45, gov_name: 'Tennessee', name: 'Tennessee' },
  { id: 46, gov_name: 'Texas', name: 'Texas' },
  { id: 47, gov_name: 'Utah', name: 'Utah' },
  { id: 48, gov_name: 'Vermont', name: 'Vermont' },
  { id: 49, gov_name: 'Virgin Islands', name: 'Virgin Islands' },
  { id: 50, gov_name: 'Virginia', name: 'Virginia' },
  { id: 51, gov_name: 'Washington', name: 'Washington' },
  { id: 52, gov_name: 'West Virginia', name: 'West Virginia' },
  { id: 53, gov_name: 'Wisconsin', name: 'Wisconsin' },
  { id: 54, gov_name: 'Wyoming', name: 'Wyoming' }
];

export const USA_REGIONS: USARegion[] = [
  { id: 190, name: 'Northeast' },
  { id: 191, name: 'Midwest' },
  { id: 192, name: 'South' },
  { id: 193, name: 'West' },
  { id: 194, name: 'Territories' }
];

export const RECRUITER_TERRITORIES_USA: USATerritory[] = [
  { id: 201, gov_name: 'Alabama', name: 'Alabama', region: { id: 192, name: 'South' } },
  { id: 202, gov_name: 'Alaska', name: 'Alaska', region: { id: 193, name: 'West' } },
  { id: 203, gov_name: 'Arizona', name: 'Arizona', region: { id: 193, name: 'West' } },
  { id: 204, gov_name: 'Arkansas', name: 'Arkansas', region: { id: 192, name: 'South' } },
  { id: 205, gov_name: 'California', name: 'California', region: { id: 193, name: 'West' } },
  { id: 206, gov_name: 'Colorado', name: 'Colorado', region: { id: 193, name: 'West' } },
  { id: 207, gov_name: 'Connecticut', name: 'Connecticut', region: { id: 190, name: 'Northeast' } },
  { id: 208, gov_name: 'Delaware', name: 'Delaware', region: { id: 192, name: 'South' } },
  {
    id: 209,
    gov_name: 'District of Columbia',
    name: 'District of Columbia',
    region: { id: 192, name: 'South' }
  },
  { id: 210, gov_name: 'Florida', name: 'Florida', region: { id: 192, name: 'South' } },
  { id: 211, gov_name: 'Georgia', name: 'Georgia', region: { id: 192, name: 'South' } },
  { id: 212, gov_name: 'Guam', name: 'Guam', region: { id: 194, name: 'Territories' } },
  { id: 213, gov_name: 'Hawaii', name: 'Hawaii', region: { id: 193, name: 'West' } },
  { id: 214, gov_name: 'Idaho', name: 'Idaho', region: { id: 193, name: 'West' } },
  { id: 215, gov_name: 'Illinois', name: 'Illinois', region: { id: 191, name: 'Midwest' } },
  { id: 216, gov_name: 'Indiana', name: 'Indiana', region: { id: 191, name: 'Midwest' } },
  { id: 217, gov_name: 'Iowa', name: 'Iowa', region: { id: 191, name: 'Midwest' } },
  { id: 218, gov_name: 'Kansas', name: 'Kansas', region: { id: 191, name: 'Midwest' } },
  { id: 219, gov_name: 'Kentucky', name: 'Kentucky', region: { id: 192, name: 'South' } },
  { id: 220, gov_name: 'Louisiana', name: 'Louisiana', region: { id: 192, name: 'South' } },
  { id: 221, gov_name: 'Maine', name: 'Maine', region: { id: 190, name: 'Northeast' } },
  { id: 222, gov_name: 'Maryland', name: 'Maryland', region: { id: 192, name: 'South' } },
  {
    id: 223,
    gov_name: 'Massachusetts',
    name: 'Massachusetts',
    region: { id: 190, name: 'Northeast' }
  },
  { id: 224, gov_name: 'Michigan', name: 'Michigan', region: { id: 191, name: 'Midwest' } },
  { id: 225, gov_name: 'Minnesota', name: 'Minnesota', region: { id: 191, name: 'Midwest' } },
  { id: 226, gov_name: 'Mississippi', name: 'Mississippi', region: { id: 192, name: 'South' } },
  { id: 227, gov_name: 'Missouri', name: 'Missouri', region: { id: 191, name: 'Midwest' } },
  { id: 228, gov_name: 'Montana', name: 'Montana', region: { id: 193, name: 'West' } },
  { id: 229, gov_name: 'Nebraska', name: 'Nebraska', region: { id: 191, name: 'Midwest' } },
  { id: 230, gov_name: 'Nevada', name: 'Nevada', region: { id: 193, name: 'West' } },
  {
    id: 231,
    gov_name: 'New Hampshire',
    name: 'New Hampshire',
    region: { id: 190, name: 'Northeast' }
  },
  { id: 232, gov_name: 'New Jersey', name: 'New Jersey', region: { id: 190, name: 'Northeast' } },
  { id: 233, gov_name: 'New Mexico', name: 'New Mexico', region: { id: 193, name: 'West' } },
  { id: 234, gov_name: 'New York', name: 'New York', region: { id: 190, name: 'Northeast' } },
  {
    id: 235,
    gov_name: 'North Carolina',
    name: 'North Carolina',
    region: { id: 192, name: 'South' }
  },
  { id: 236, gov_name: 'North Dakota', name: 'North Dakota', region: { id: 191, name: 'Midwest' } },
  { id: 237, gov_name: 'Ohio', name: 'Ohio', region: { id: 191, name: 'Midwest' } },
  { id: 238, gov_name: 'Oklahoma', name: 'Oklahoma', region: { id: 192, name: 'South' } },
  { id: 239, gov_name: 'Oregon', name: 'Oregon', region: { id: 193, name: 'West' } },
  {
    id: 240,
    gov_name: 'Pennsylvania',
    name: 'Pennsylvania',
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 241,
    gov_name: 'Puerto Rico',
    name: 'Puerto Rico',
    region: { id: 194, name: 'Territories' }
  },
  {
    id: 242,
    gov_name: 'Rhode Island',
    name: 'Rhode Island',
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 243,
    gov_name: 'South Carolina',
    name: 'South Carolina',
    region: { id: 192, name: 'South' }
  },
  { id: 244, gov_name: 'South Dakota', name: 'South Dakota', region: { id: 191, name: 'Midwest' } },
  { id: 245, gov_name: 'Tennessee', name: 'Tennessee', region: { id: 192, name: 'South' } },
  { id: 246, gov_name: 'Texas', name: 'Texas', region: { id: 192, name: 'South' } },
  { id: 247, gov_name: 'Utah', name: 'Utah', region: { id: 193, name: 'West' } },
  { id: 248, gov_name: 'Vermont', name: 'Vermont', region: { id: 190, name: 'Northeast' } },
  {
    id: 249,
    gov_name: 'Virgin Islands',
    name: 'Virgin Islands',
    region: { id: 194, name: 'Territories' }
  },
  { id: 250, gov_name: 'Virginia', name: 'Virginia', region: { id: 192, name: 'South' } },
  { id: 251, gov_name: 'Washington', name: 'Washington', region: { id: 193, name: 'West' } },
  { id: 252, gov_name: 'West Virginia', name: 'West Virginia', region: { id: 192, name: 'South' } },
  { id: 253, gov_name: 'Wisconsin', name: 'Wisconsin', region: { id: 191, name: 'Midwest' } },
  { id: 254, gov_name: 'Wyoming', name: 'Wyoming', region: { id: 193, name: 'West' } }
];

export const NON_CONTIGUOUS_TERRITORIES_USA = [
  { id: 2, gov_name: 'Alaska', name: 'Alaska' },
  { id: 12, gov_name: 'Guam', name: 'Guam' },
  { id: 13, gov_name: 'Hawaii', name: 'Hawaii' },
  { id: 41, gov_name: 'Puerto Rico', name: 'Puerto Rico' },
  { id: 42, gov_name: 'Virgin Islands', name: 'Virgin Islands' }
];
