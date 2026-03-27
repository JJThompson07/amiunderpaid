import { US_TERRITORY_BAND_MAP, JobBand } from '../bands/usa';

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
  band: JobBand;
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
  {
    id: 201,
    gov_name: 'Alabama',
    name: 'Alabama',
    band: US_TERRITORY_BAND_MAP[201] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 202,
    gov_name: 'Alaska',
    name: 'Alaska',
    band: US_TERRITORY_BAND_MAP[202] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 203,
    gov_name: 'Arizona',
    name: 'Arizona',
    band: US_TERRITORY_BAND_MAP[203] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 204,
    gov_name: 'Arkansas',
    name: 'Arkansas',
    band: US_TERRITORY_BAND_MAP[204] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 205,
    gov_name: 'California',
    name: 'California',
    band: US_TERRITORY_BAND_MAP[205] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 206,
    gov_name: 'Colorado',
    name: 'Colorado',
    band: US_TERRITORY_BAND_MAP[206] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 207,
    gov_name: 'Connecticut',
    name: 'Connecticut',
    band: US_TERRITORY_BAND_MAP[207] || JobBand.BAND_4_MODERATE,
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 208,
    gov_name: 'Delaware',
    name: 'Delaware',
    band: US_TERRITORY_BAND_MAP[208] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 209,
    gov_name: 'District of Columbia',
    name: 'District of Columbia',
    band: US_TERRITORY_BAND_MAP[209] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 210,
    gov_name: 'Florida',
    name: 'Florida',
    band: US_TERRITORY_BAND_MAP[210] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 211,
    gov_name: 'Georgia',
    name: 'Georgia',
    band: US_TERRITORY_BAND_MAP[211] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 212,
    gov_name: 'Guam',
    name: 'Guam',
    band: US_TERRITORY_BAND_MAP[212] || JobBand.BAND_4_MODERATE,
    region: { id: 194, name: 'Territories' }
  },
  {
    id: 213,
    gov_name: 'Hawaii',
    name: 'Hawaii',
    band: US_TERRITORY_BAND_MAP[213] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 214,
    gov_name: 'Idaho',
    name: 'Idaho',
    band: US_TERRITORY_BAND_MAP[214] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 215,
    gov_name: 'Illinois',
    name: 'Illinois',
    band: US_TERRITORY_BAND_MAP[215] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 216,
    gov_name: 'Indiana',
    name: 'Indiana',
    band: US_TERRITORY_BAND_MAP[216] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 217,
    gov_name: 'Iowa',
    name: 'Iowa',
    band: US_TERRITORY_BAND_MAP[217] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 218,
    gov_name: 'Kansas',
    name: 'Kansas',
    band: US_TERRITORY_BAND_MAP[218] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 219,
    gov_name: 'Kentucky',
    name: 'Kentucky',
    band: US_TERRITORY_BAND_MAP[219] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 220,
    gov_name: 'Louisiana',
    name: 'Louisiana',
    band: US_TERRITORY_BAND_MAP[220] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 221,
    gov_name: 'Maine',
    name: 'Maine',
    band: US_TERRITORY_BAND_MAP[221] || JobBand.BAND_4_MODERATE,
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 222,
    gov_name: 'Maryland',
    name: 'Maryland',
    band: US_TERRITORY_BAND_MAP[222] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 223,
    gov_name: 'Massachusetts',
    name: 'Massachusetts',
    band: US_TERRITORY_BAND_MAP[223] || JobBand.BAND_4_MODERATE,
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 224,
    gov_name: 'Michigan',
    name: 'Michigan',
    band: US_TERRITORY_BAND_MAP[224] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 225,
    gov_name: 'Minnesota',
    name: 'Minnesota',
    band: US_TERRITORY_BAND_MAP[225] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 226,
    gov_name: 'Mississippi',
    name: 'Mississippi',
    band: US_TERRITORY_BAND_MAP[226] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 227,
    gov_name: 'Missouri',
    name: 'Missouri',
    band: US_TERRITORY_BAND_MAP[227] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 228,
    gov_name: 'Montana',
    name: 'Montana',
    band: US_TERRITORY_BAND_MAP[228] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 229,
    gov_name: 'Nebraska',
    name: 'Nebraska',
    band: US_TERRITORY_BAND_MAP[229] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 230,
    gov_name: 'Nevada',
    name: 'Nevada',
    band: US_TERRITORY_BAND_MAP[230] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 231,
    gov_name: 'New Hampshire',
    name: 'New Hampshire',
    band: US_TERRITORY_BAND_MAP[231] || JobBand.BAND_4_MODERATE,
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 232,
    gov_name: 'New Jersey',
    name: 'New Jersey',
    band: US_TERRITORY_BAND_MAP[232] || JobBand.BAND_4_MODERATE,
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 233,
    gov_name: 'New Mexico',
    name: 'New Mexico',
    band: US_TERRITORY_BAND_MAP[233] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 234,
    gov_name: 'New York',
    name: 'New York',
    band: US_TERRITORY_BAND_MAP[234] || JobBand.BAND_4_MODERATE,
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 235,
    gov_name: 'North Carolina',
    name: 'North Carolina',
    band: US_TERRITORY_BAND_MAP[235] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 236,
    gov_name: 'North Dakota',
    name: 'North Dakota',
    band: US_TERRITORY_BAND_MAP[236] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 237,
    gov_name: 'Ohio',
    name: 'Ohio',
    band: US_TERRITORY_BAND_MAP[237] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 238,
    gov_name: 'Oklahoma',
    name: 'Oklahoma',
    band: US_TERRITORY_BAND_MAP[238] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 239,
    gov_name: 'Oregon',
    name: 'Oregon',
    band: US_TERRITORY_BAND_MAP[239] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 240,
    gov_name: 'Pennsylvania',
    name: 'Pennsylvania',
    band: US_TERRITORY_BAND_MAP[240] || JobBand.BAND_4_MODERATE,
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 241,
    gov_name: 'Puerto Rico',
    name: 'Puerto Rico',
    band: US_TERRITORY_BAND_MAP[241] || JobBand.BAND_4_MODERATE,
    region: { id: 194, name: 'Territories' }
  },
  {
    id: 242,
    gov_name: 'Rhode Island',
    name: 'Rhode Island',
    band: US_TERRITORY_BAND_MAP[242] || JobBand.BAND_4_MODERATE,
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 243,
    gov_name: 'South Carolina',
    name: 'South Carolina',
    band: US_TERRITORY_BAND_MAP[243] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 244,
    gov_name: 'South Dakota',
    name: 'South Dakota',
    band: US_TERRITORY_BAND_MAP[244] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 245,
    gov_name: 'Tennessee',
    name: 'Tennessee',
    band: US_TERRITORY_BAND_MAP[245] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 246,
    gov_name: 'Texas',
    name: 'Texas',
    band: US_TERRITORY_BAND_MAP[246] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 247,
    gov_name: 'Utah',
    name: 'Utah',
    band: US_TERRITORY_BAND_MAP[247] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 248,
    gov_name: 'Vermont',
    name: 'Vermont',
    band: US_TERRITORY_BAND_MAP[248] || JobBand.BAND_4_MODERATE,
    region: { id: 190, name: 'Northeast' }
  },
  {
    id: 249,
    gov_name: 'Virgin Islands',
    name: 'Virgin Islands',
    band: US_TERRITORY_BAND_MAP[249] || JobBand.BAND_4_MODERATE,
    region: { id: 194, name: 'Territories' }
  },
  {
    id: 250,
    gov_name: 'Virginia',
    name: 'Virginia',
    band: US_TERRITORY_BAND_MAP[250] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 251,
    gov_name: 'Washington',
    name: 'Washington',
    band: US_TERRITORY_BAND_MAP[251] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  },
  {
    id: 252,
    gov_name: 'West Virginia',
    name: 'West Virginia',
    band: US_TERRITORY_BAND_MAP[252] || JobBand.BAND_4_MODERATE,
    region: { id: 192, name: 'South' }
  },
  {
    id: 253,
    gov_name: 'Wisconsin',
    name: 'Wisconsin',
    band: US_TERRITORY_BAND_MAP[253] || JobBand.BAND_4_MODERATE,
    region: { id: 191, name: 'Midwest' }
  },
  {
    id: 254,
    gov_name: 'Wyoming',
    name: 'Wyoming',
    band: US_TERRITORY_BAND_MAP[254] || JobBand.BAND_4_MODERATE,
    region: { id: 193, name: 'West' }
  }
];

export const NON_CONTIGUOUS_TERRITORIES_USA = [
  { id: 2, gov_name: 'Alaska', name: 'Alaska' },
  { id: 12, gov_name: 'Guam', name: 'Guam' },
  { id: 13, gov_name: 'Hawaii', name: 'Hawaii' },
  { id: 41, gov_name: 'Puerto Rico', name: 'Puerto Rico' },
  { id: 42, gov_name: 'Virgin Islands', name: 'Virgin Islands' }
];
