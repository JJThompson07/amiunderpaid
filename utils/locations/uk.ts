export interface ONSLocation {
  id: number;
  name: string;
  gov_name: string;
}

export interface ONSMatch {
  id: number;
  name: string;
}

export interface Territory {
  id: number;
  name: string;
  country: string;
  ons_matches: ONSMatch[];
}

export const ONS_LOCATIONS: ONSLocation[] = [
  { id: 1, gov_name: 'England', name: 'England' },
  { id: 1, gov_name: 'United Kingdom', name: 'United Kingdom' },
  { id: 2, gov_name: 'Great Britain', name: 'Great Britain' },
  { id: 3, gov_name: 'England and Wales', name: 'England and Wales' },
  { id: 4, gov_name: 'England', name: 'England' },
  { id: 5, gov_name: 'North East', name: 'North East' },
  { id: 6, gov_name: 'Darlington UA', name: 'Darlington' },
  { id: 7, gov_name: 'Hartlepool UA', name: 'Hartlepool' },
  { id: 8, gov_name: 'Middlesbrough UA', name: 'Middlesbrough' },
  { id: 9, gov_name: 'Redcar and Cleveland UA', name: 'Redcar and Cleveland' },
  { id: 10, gov_name: 'Stockton-on-Tees UA', name: 'Stockton-on-Tees' },
  { id: 11, gov_name: 'County Durham UA', name: 'County Durham' },
  { id: 12, gov_name: 'Northumberland UA', name: 'Northumberland' },
  { id: 13, gov_name: 'Tyne and Wear Met County', name: 'Tyne and Wear' },
  { id: 14, gov_name: 'Gateshead', name: 'Gateshead' },
  { id: 15, gov_name: 'Newcastle upon Tyne', name: 'Newcastle upon Tyne' },
  { id: 16, gov_name: 'North Tyneside', name: 'North Tyneside' },
  { id: 17, gov_name: 'South Tyneside', name: 'South Tyneside' },
  { id: 18, gov_name: 'Sunderland', name: 'Sunderland' },
  { id: 19, gov_name: 'North West', name: 'North West' },
  { id: 20, gov_name: 'Blackburn with Darwen UA', name: 'Blackburn with Darwen' },
  { id: 21, gov_name: 'Blackpool UA', name: 'Blackpool' },
  { id: 22, gov_name: 'Halton UA', name: 'Halton' },
  { id: 23, gov_name: 'Warrington UA', name: 'Warrington' },
  { id: 24, gov_name: 'Cheshire East UA', name: 'Cheshire East' },
  { id: 25, gov_name: 'Cheshire West and Chester UA', name: 'Cheshire West and Chester' },
  { id: 26, gov_name: 'Cumberland UA', name: 'Cumberland' },
  { id: 27, gov_name: 'Westmorland and Furness UA', name: 'Westmorland and Furness' },
  { id: 28, gov_name: 'Greater Manchester Met County', name: 'Greater Manchester' },
  { id: 29, gov_name: 'Bolton', name: 'Bolton' },
  { id: 30, gov_name: 'Bury', name: 'Bury' },
  { id: 31, gov_name: 'Manchester', name: 'Manchester' },
  { id: 32, gov_name: 'Oldham', name: 'Oldham' },
  { id: 33, gov_name: 'Rochdale', name: 'Rochdale' },
  { id: 34, gov_name: 'Salford', name: 'Salford' },
  { id: 35, gov_name: 'Stockport', name: 'Stockport' },
  { id: 36, gov_name: 'Tameside', name: 'Tameside' },
  { id: 37, gov_name: 'Trafford', name: 'Trafford' },
  { id: 38, gov_name: 'Wigan', name: 'Wigan' },
  { id: 39, gov_name: 'Lancashire', name: 'Lancashire' },
  { id: 40, gov_name: 'Burnley', name: 'Burnley' },
  { id: 41, gov_name: 'Chorley', name: 'Chorley' },
  { id: 42, gov_name: 'Fylde', name: 'Fylde' },
  { id: 43, gov_name: 'Hyndburn', name: 'Hyndburn' },
  { id: 44, gov_name: 'Lancaster', name: 'Lancaster' },
  { id: 45, gov_name: 'Pendle', name: 'Pendle' },
  { id: 46, gov_name: 'Preston', name: 'Preston' },
  { id: 47, gov_name: 'Ribble Valley', name: 'Ribble Valley' },
  { id: 48, gov_name: 'Rossendale', name: 'Rossendale' },
  { id: 49, gov_name: 'South Ribble', name: 'South Ribble' },
  { id: 50, gov_name: 'West Lancashire', name: 'West Lancashire' },
  { id: 51, gov_name: 'Wyre', name: 'Wyre' },
  { id: 52, gov_name: 'Merseyside Met County', name: 'Merseyside' },
  { id: 53, gov_name: 'Knowsley', name: 'Knowsley' },
  { id: 54, gov_name: 'Liverpool', name: 'Liverpool' },
  { id: 55, gov_name: 'St. Helens', name: 'St. Helens' },
  { id: 56, gov_name: 'Sefton', name: 'Sefton' },
  { id: 57, gov_name: 'Wirral', name: 'Wirral' },
  { id: 58, gov_name: 'Yorkshire and The Humber', name: 'Yorkshire and The Humber' },
  { id: 59, gov_name: 'East Riding of Yorkshire UA', name: 'East Riding of Yorkshire' },
  { id: 60, gov_name: 'Kingston upon Hull UA', name: 'Kingston upon Hull' },
  { id: 61, gov_name: 'North East Lincolnshire UA', name: 'North East Lincolnshire' },
  { id: 62, gov_name: 'North Lincolnshire UA', name: 'North Lincolnshire' },
  { id: 63, gov_name: 'York UA', name: 'York' },
  { id: 64, gov_name: 'North Yorkshire UA', name: 'North Yorkshire' },
  { id: 65, gov_name: 'South Yorkshire Met County', name: 'South Yorkshire' },
  { id: 66, gov_name: 'Barnsley', name: 'Barnsley' },
  { id: 67, gov_name: 'Doncaster', name: 'Doncaster' },
  { id: 68, gov_name: 'Rotherham', name: 'Rotherham' },
  { id: 69, gov_name: 'Sheffield', name: 'Sheffield' },
  { id: 70, gov_name: 'West Yorkshire Met County', name: 'West Yorkshire' },
  { id: 71, gov_name: 'Bradford', name: 'Bradford' },
  { id: 72, gov_name: 'Calderdale', name: 'Calderdale' },
  { id: 73, gov_name: 'Kirklees', name: 'Kirklees' },
  { id: 74, gov_name: 'Leeds', name: 'Leeds' },
  { id: 75, gov_name: 'Wakefield', name: 'Wakefield' },
  { id: 76, gov_name: 'East Midlands', name: 'East Midlands' },
  { id: 77, gov_name: 'Derby UA', name: 'Derby' },
  { id: 78, gov_name: 'Leicester UA', name: 'Leicester' },
  { id: 79, gov_name: 'North Northamptonshire UA', name: 'North Northamptonshire' },
  { id: 80, gov_name: 'Nottingham UA', name: 'Nottingham' },
  { id: 81, gov_name: 'Rutland UA', name: 'Rutland' },
  { id: 82, gov_name: 'West Northamptonshire UA', name: 'West Northamptonshire' },
  { id: 83, gov_name: 'Derbyshire', name: 'Derbyshire' },
  { id: 84, gov_name: 'Amber Valley', name: 'Amber Valley' },
  { id: 85, gov_name: 'Bolsover', name: 'Bolsover' },
  { id: 86, gov_name: 'Chesterfield', name: 'Chesterfield' },
  { id: 87, gov_name: 'Derbyshire Dales', name: 'Derbyshire Dales' },
  { id: 88, gov_name: 'Erewash', name: 'Erewash' },
  { id: 89, gov_name: 'High Peak', name: 'High Peak' },
  { id: 90, gov_name: 'North East Derbyshire', name: 'North East Derbyshire' },
  { id: 91, gov_name: 'South Derbyshire', name: 'South Derbyshire' },
  { id: 92, gov_name: 'Leicestershire', name: 'Leicestershire' },
  { id: 93, gov_name: 'Blaby', name: 'Blaby' },
  { id: 94, gov_name: 'Charnwood', name: 'Charnwood' },
  { id: 95, gov_name: 'Harborough', name: 'Harborough' },
  { id: 96, gov_name: 'Hinckley and Bosworth', name: 'Hinckley and Bosworth' },
  { id: 97, gov_name: 'Melton', name: 'Melton' },
  { id: 98, gov_name: 'North West Leicestershire', name: 'North West Leicestershire' },
  { id: 99, gov_name: 'Oadby and Wigston', name: 'Oadby and Wigston' },
  { id: 100, gov_name: 'Lincolnshire', name: 'Lincolnshire' },
  { id: 101, gov_name: 'Boston', name: 'Boston' },
  { id: 102, gov_name: 'East Lindsey', name: 'East Lindsey' },
  { id: 103, gov_name: 'Lincoln', name: 'Lincoln' },
  { id: 104, gov_name: 'North Kesteven', name: 'North Kesteven' },
  { id: 105, gov_name: 'South Holland', name: 'South Holland' },
  { id: 106, gov_name: 'South Kesteven', name: 'South Kesteven' },
  { id: 107, gov_name: 'West Lindsey', name: 'West Lindsey' },
  { id: 108, gov_name: 'Nottinghamshire', name: 'Nottinghamshire' },
  { id: 109, gov_name: 'Ashfield', name: 'Ashfield' },
  { id: 110, gov_name: 'Bassetlaw', name: 'Bassetlaw' },
  { id: 111, gov_name: 'Broxtowe', name: 'Broxtowe' },
  { id: 112, gov_name: 'Gedling', name: 'Gedling' },
  { id: 113, gov_name: 'Mansfield', name: 'Mansfield' },
  { id: 114, gov_name: 'Newark and Sherwood', name: 'Newark and Sherwood' },
  { id: 115, gov_name: 'Rushcliffe', name: 'Rushcliffe' },
  { id: 116, gov_name: 'West Midlands', name: 'West Midlands' },
  { id: 117, gov_name: 'Herefordshire UA', name: 'Herefordshire' },
  { id: 118, gov_name: 'Stoke-on-Trent UA', name: 'Stoke-on-Trent' },
  { id: 119, gov_name: 'Telford and Wrekin UA', name: 'Telford and Wrekin' },
  { id: 120, gov_name: 'Shropshire UA', name: 'Shropshire' },
  { id: 121, gov_name: 'Staffordshire', name: 'Staffordshire' },
  { id: 122, gov_name: 'Cannock Chase', name: 'Cannock Chase' },
  { id: 123, gov_name: 'East Staffordshire', name: 'East Staffordshire' },
  { id: 124, gov_name: 'Lichfield', name: 'Lichfield' },
  { id: 125, gov_name: 'Newcastle-under-Lyme', name: 'Newcastle-under-Lyme' },
  { id: 126, gov_name: 'South Staffordshire', name: 'South Staffordshire' },
  { id: 127, gov_name: 'Stafford', name: 'Stafford' },
  { id: 128, gov_name: 'Staffordshire Moorlands', name: 'Staffordshire Moorlands' },
  { id: 129, gov_name: 'Tamworth', name: 'Tamworth' },
  { id: 130, gov_name: 'Warwickshire', name: 'Warwickshire' },
  { id: 131, gov_name: 'North Warwickshire', name: 'North Warwickshire' },
  { id: 132, gov_name: 'Nuneaton and Bedworth', name: 'Nuneaton and Bedworth' },
  { id: 133, gov_name: 'Rugby', name: 'Rugby' },
  { id: 134, gov_name: 'Stratford-on-Avon', name: 'Stratford-on-Avon' },
  { id: 135, gov_name: 'Warwick', name: 'Warwick' },
  { id: 136, gov_name: 'West Midlands Met County', name: 'West Midlands' },
  { id: 137, gov_name: 'Birmingham', name: 'Birmingham' },
  { id: 138, gov_name: 'Coventry', name: 'Coventry' },
  { id: 139, gov_name: 'Dudley', name: 'Dudley' },
  { id: 140, gov_name: 'Sandwell', name: 'Sandwell' },
  { id: 141, gov_name: 'Solihull', name: 'Solihull' },
  { id: 142, gov_name: 'Walsall', name: 'Walsall' },
  { id: 143, gov_name: 'Wolverhampton', name: 'Wolverhampton' },
  { id: 144, gov_name: 'Worcestershire', name: 'Worcestershire' },
  { id: 145, gov_name: 'Bromsgrove', name: 'Bromsgrove' },
  { id: 146, gov_name: 'Malvern Hills', name: 'Malvern Hills' },
  { id: 147, gov_name: 'Redditch', name: 'Redditch' },
  { id: 148, gov_name: 'Worcester', name: 'Worcester' },
  { id: 149, gov_name: 'Wychavon', name: 'Wychavon' },
  { id: 150, gov_name: 'Wyre Forest', name: 'Wyre Forest' },
  { id: 151, gov_name: 'East', name: 'East' },
  { id: 152, gov_name: 'Bedford UA', name: 'Bedford' },
  { id: 153, gov_name: 'Central Bedfordshire UA', name: 'Central Bedfordshire' },
  { id: 154, gov_name: 'Luton UA', name: 'Luton' },
  { id: 155, gov_name: 'Peterborough UA', name: 'Peterborough' },
  { id: 156, gov_name: 'Southend-on-Sea UA', name: 'Southend-on-Sea' },
  { id: 157, gov_name: 'Thurrock UA', name: 'Thurrock' },
  { id: 158, gov_name: 'Cambridgeshire', name: 'Cambridgeshire' },
  { id: 159, gov_name: 'Cambridge', name: 'Cambridge' },
  { id: 160, gov_name: 'East Cambridgeshire', name: 'East Cambridgeshire' },
  { id: 161, gov_name: 'Fenland', name: 'Fenland' },
  { id: 162, gov_name: 'Huntingdonshire', name: 'Huntingdonshire' },
  { id: 163, gov_name: 'South Cambridgeshire', name: 'South Cambridgeshire' },
  { id: 164, gov_name: 'Essex', name: 'Essex' },
  { id: 165, gov_name: 'Basildon', name: 'Basildon' },
  { id: 166, gov_name: 'Braintree', name: 'Braintree' },
  { id: 167, gov_name: 'Brentwood', name: 'Brentwood' },
  { id: 168, gov_name: 'Castle Point', name: 'Castle Point' },
  { id: 169, gov_name: 'Chelmsford', name: 'Chelmsford' },
  { id: 170, gov_name: 'Colchester', name: 'Colchester' },
  { id: 171, gov_name: 'Epping Forest', name: 'Epping Forest' },
  { id: 172, gov_name: 'Harlow', name: 'Harlow' },
  { id: 173, gov_name: 'Maldon', name: 'Maldon' },
  { id: 174, gov_name: 'Rochford', name: 'Rochford' },
  { id: 175, gov_name: 'Tendring', name: 'Tendring' },
  { id: 176, gov_name: 'Uttlesford', name: 'Uttlesford' },
  { id: 177, gov_name: 'Hertfordshire', name: 'Hertfordshire' },
  { id: 178, gov_name: 'Broxbourne', name: 'Broxbourne' },
  { id: 179, gov_name: 'Dacorum', name: 'Dacorum' },
  { id: 180, gov_name: 'East Hertfordshire', name: 'East Hertfordshire' },
  { id: 181, gov_name: 'Hertsmere', name: 'Hertsmere' },
  { id: 182, gov_name: 'North Hertfordshire', name: 'North Hertfordshire' },
  { id: 183, gov_name: 'St Albans', name: 'St Albans' },
  { id: 184, gov_name: 'Stevenage', name: 'Stevenage' },
  { id: 185, gov_name: 'Three Rivers', name: 'Three Rivers' },
  { id: 186, gov_name: 'Watford', name: 'Watford' },
  { id: 187, gov_name: 'Welwyn Hatfield', name: 'Welwyn Hatfield' },
  { id: 188, gov_name: 'Norfolk', name: 'Norfolk' },
  { id: 189, gov_name: 'Breckland', name: 'Breckland' },
  { id: 190, gov_name: 'Broadland', name: 'Broadland' },
  { id: 191, gov_name: 'Great Yarmouth', name: 'Great Yarmouth' },
  { id: 192, gov_name: "King's Lynn and West Norfolk", name: "King's Lynn and West Norfolk" },
  { id: 193, gov_name: 'North Norfolk', name: 'North Norfolk' },
  { id: 194, gov_name: 'Norwich', name: 'Norwich' },
  { id: 195, gov_name: 'South Norfolk', name: 'South Norfolk' },
  { id: 196, gov_name: 'Suffolk', name: 'Suffolk' },
  { id: 197, gov_name: 'Babergh', name: 'Babergh' },
  { id: 198, gov_name: 'Ipswich', name: 'Ipswich' },
  { id: 199, gov_name: 'Mid Suffolk', name: 'Mid Suffolk' },
  { id: 200, gov_name: 'East Suffolk', name: 'East Suffolk' },
  { id: 201, gov_name: 'West Suffolk', name: 'West Suffolk' },
  { id: 202, gov_name: 'London', name: 'London' },
  { id: 203, gov_name: 'Inner London', name: 'Inner London' },
  { id: 204, gov_name: 'Camden', name: 'Camden' },
  { id: 205, gov_name: 'City of London', name: 'City of London' },
  { id: 206, gov_name: 'Hackney', name: 'Hackney' },
  { id: 207, gov_name: 'Hammersmith and Fulham', name: 'Hammersmith and Fulham' },
  { id: 208, gov_name: 'Haringey', name: 'Haringey' },
  { id: 209, gov_name: 'Islington', name: 'Islington' },
  { id: 210, gov_name: 'Kensington and Chelsea', name: 'Kensington and Chelsea' },
  { id: 211, gov_name: 'Lambeth', name: 'Lambeth' },
  { id: 212, gov_name: 'Lewisham', name: 'Lewisham' },
  { id: 213, gov_name: 'Newham', name: 'Newham' },
  { id: 214, gov_name: 'Southwark', name: 'Southwark' },
  { id: 215, gov_name: 'Tower Hamlets', name: 'Tower Hamlets' },
  { id: 216, gov_name: 'Wandsworth', name: 'Wandsworth' },
  { id: 217, gov_name: 'Westminster', name: 'Westminster' },
  { id: 218, gov_name: 'Outer London', name: 'Outer London' },
  { id: 219, gov_name: 'Barking and Dagenham', name: 'Barking and Dagenham' },
  { id: 220, gov_name: 'Barnet', name: 'Barnet' },
  { id: 221, gov_name: 'Bexley', name: 'Bexley' },
  { id: 222, gov_name: 'Brent', name: 'Brent' },
  { id: 223, gov_name: 'Bromley', name: 'Bromley' },
  { id: 224, gov_name: 'Croydon', name: 'Croydon' },
  { id: 225, gov_name: 'Ealing', name: 'Ealing' },
  { id: 226, gov_name: 'Enfield', name: 'Enfield' },
  { id: 227, gov_name: 'Greenwich', name: 'Greenwich' },
  { id: 228, gov_name: 'Harrow', name: 'Harrow' },
  { id: 229, gov_name: 'Havering', name: 'Havering' },
  { id: 230, gov_name: 'Hillingdon', name: 'Hillingdon' },
  { id: 231, gov_name: 'Hounslow', name: 'Hounslow' },
  { id: 232, gov_name: 'Kingston upon Thames', name: 'Kingston upon Thames' },
  { id: 233, gov_name: 'Merton', name: 'Merton' },
  { id: 234, gov_name: 'Redbridge', name: 'Redbridge' },
  { id: 235, gov_name: 'Richmond upon Thames', name: 'Richmond upon Thames' },
  { id: 236, gov_name: 'Sutton', name: 'Sutton' },
  { id: 237, gov_name: 'Waltham Forest', name: 'Waltham Forest' },
  { id: 238, gov_name: 'South East', name: 'South East' },
  { id: 239, gov_name: 'Bracknell Forest UA', name: 'Bracknell Forest' },
  { id: 240, gov_name: 'Brighton and Hove UA', name: 'Brighton and Hove' },
  { id: 241, gov_name: 'Buckinghamshire UA', name: 'Buckinghamshire' },
  { id: 242, gov_name: 'Isle of Wight UA', name: 'Isle of Wight' },
  { id: 243, gov_name: 'Medway UA', name: 'Medway' },
  { id: 244, gov_name: 'Milton Keynes UA', name: 'Milton Keynes' },
  { id: 245, gov_name: 'Portsmouth UA', name: 'Portsmouth' },
  { id: 246, gov_name: 'Reading UA', name: 'Reading' },
  { id: 247, gov_name: 'Slough UA', name: 'Slough' },
  { id: 248, gov_name: 'Southampton UA', name: 'Southampton' },
  { id: 249, gov_name: 'West Berkshire UA', name: 'West Berkshire' },
  { id: 250, gov_name: 'Windsor and Maidenhead UA', name: 'Windsor and Maidenhead' },
  { id: 251, gov_name: 'Wokingham UA', name: 'Wokingham' },
  { id: 252, gov_name: 'East Sussex', name: 'East Sussex' },
  { id: 253, gov_name: 'Eastbourne', name: 'Eastbourne' },
  { id: 254, gov_name: 'Hastings', name: 'Hastings' },
  { id: 255, gov_name: 'Lewes', name: 'Lewes' },
  { id: 256, gov_name: 'Rother', name: 'Rother' },
  { id: 257, gov_name: 'Wealden', name: 'Wealden' },
  { id: 258, gov_name: 'Hampshire', name: 'Hampshire' },
  { id: 259, gov_name: 'Basingstoke and Deane', name: 'Basingstoke and Deane' },
  { id: 260, gov_name: 'East Hampshire', name: 'East Hampshire' },
  { id: 261, gov_name: 'Eastleigh', name: 'Eastleigh' },
  { id: 262, gov_name: 'Fareham', name: 'Fareham' },
  { id: 263, gov_name: 'Gosport', name: 'Gosport' },
  { id: 264, gov_name: 'Hart', name: 'Hart' },
  { id: 265, gov_name: 'Havant', name: 'Havant' },
  { id: 266, gov_name: 'New Forest', name: 'New Forest' },
  { id: 267, gov_name: 'Rushmoor', name: 'Rushmoor' },
  { id: 268, gov_name: 'Test Valley', name: 'Test Valley' },
  { id: 269, gov_name: 'Winchester', name: 'Winchester' },
  { id: 270, gov_name: 'Kent', name: 'Kent' },
  { id: 271, gov_name: 'Ashford', name: 'Ashford' },
  { id: 272, gov_name: 'Canterbury', name: 'Canterbury' },
  { id: 273, gov_name: 'Dartford', name: 'Dartford' },
  { id: 274, gov_name: 'Dover', name: 'Dover' },
  { id: 275, gov_name: 'Gravesham', name: 'Gravesham' },
  { id: 276, gov_name: 'Maidstone', name: 'Maidstone' },
  { id: 277, gov_name: 'Sevenoaks', name: 'Sevenoaks' },
  { id: 278, gov_name: 'Folkestone and Hythe', name: 'Folkestone and Hythe' },
  { id: 279, gov_name: 'Swale', name: 'Swale' },
  { id: 280, gov_name: 'Thanet', name: 'Thanet' },
  { id: 281, gov_name: 'Tonbridge and Malling', name: 'Tonbridge and Malling' },
  { id: 282, gov_name: 'Tunbridge Wells', name: 'Tunbridge Wells' },
  { id: 283, gov_name: 'Oxfordshire', name: 'Oxfordshire' },
  { id: 284, gov_name: 'Cherwell', name: 'Cherwell' },
  { id: 285, gov_name: 'Oxford', name: 'Oxford' },
  { id: 286, gov_name: 'South Oxfordshire', name: 'South Oxfordshire' },
  { id: 287, gov_name: 'Vale of White Horse', name: 'Vale of White Horse' },
  { id: 288, gov_name: 'West Oxfordshire', name: 'West Oxfordshire' },
  { id: 289, gov_name: 'Surrey', name: 'Surrey' },
  { id: 290, gov_name: 'Elmbridge', name: 'Elmbridge' },
  { id: 291, gov_name: 'Epsom and Ewell', name: 'Epsom and Ewell' },
  { id: 292, gov_name: 'Guildford', name: 'Guildford' },
  { id: 293, gov_name: 'Mole Valley', name: 'Mole Valley' },
  { id: 294, gov_name: 'Reigate and Banstead', name: 'Reigate and Banstead' },
  { id: 295, gov_name: 'Runnymede', name: 'Runnymede' },
  { id: 296, gov_name: 'Spelthorne', name: 'Spelthorne' },
  { id: 297, gov_name: 'Surrey Heath', name: 'Surrey Heath' },
  { id: 298, gov_name: 'Tandridge', name: 'Tandridge' },
  { id: 299, gov_name: 'Waverley', name: 'Waverley' },
  { id: 300, gov_name: 'Woking', name: 'Woking' },
  { id: 301, gov_name: 'West Sussex', name: 'West Sussex' },
  { id: 302, gov_name: 'Adur', name: 'Adur' },
  { id: 303, gov_name: 'Arun', name: 'Arun' },
  { id: 304, gov_name: 'Chichester', name: 'Chichester' },
  { id: 305, gov_name: 'Crawley', name: 'Crawley' },
  { id: 306, gov_name: 'Horsham', name: 'Horsham' },
  { id: 307, gov_name: 'Mid Sussex', name: 'Mid Sussex' },
  { id: 308, gov_name: 'Worthing', name: 'Worthing' },
  { id: 309, gov_name: 'South West', name: 'South West' },
  { id: 310, gov_name: 'Bath and North East Somerset UA', name: 'Bath and North East Somerset' },
  {
    id: 311,
    gov_name: 'Bournemouth, Christchurch and Poole UA',
    name: 'Bournemouth, Christchurch and Poole'
  },
  { id: 312, gov_name: 'Bristol, City of UA', name: 'Bristol' },
  { id: 313, gov_name: 'Dorset UA', name: 'Dorset' },
  { id: 314, gov_name: 'North Somerset UA', name: 'North Somerset' },
  { id: 315, gov_name: 'Plymouth UA', name: 'Plymouth' },
  { id: 316, gov_name: 'South Gloucestershire UA', name: 'South Gloucestershire' },
  { id: 317, gov_name: 'Swindon UA', name: 'Swindon' },
  { id: 318, gov_name: 'Torbay UA', name: 'Torbay' },
  { id: 319, gov_name: 'Cornwall UA', name: 'Cornwall' },
  { id: 320, gov_name: 'Isles of Scilly', name: 'Isles of Scilly' },
  { id: 321, gov_name: 'Wiltshire UA', name: 'Wiltshire' },
  { id: 322, gov_name: 'Devon', name: 'Devon' },
  { id: 323, gov_name: 'East Devon', name: 'East Devon' },
  { id: 324, gov_name: 'Exeter', name: 'Exeter' },
  { id: 325, gov_name: 'Mid Devon', name: 'Mid Devon' },
  { id: 326, gov_name: 'North Devon', name: 'North Devon' },
  { id: 327, gov_name: 'South Hams', name: 'South Hams' },
  { id: 328, gov_name: 'Teignbridge', name: 'Teignbridge' },
  { id: 329, gov_name: 'Torridge', name: 'Torridge' },
  { id: 330, gov_name: 'West Devon', name: 'West Devon' },
  { id: 331, gov_name: 'Gloucestershire', name: 'Gloucestershire' },
  { id: 332, gov_name: 'Cheltenham', name: 'Cheltenham' },
  { id: 333, gov_name: 'Cotswold', name: 'Cotswold' },
  { id: 334, gov_name: 'Forest of Dean', name: 'Forest of Dean' },
  { id: 335, gov_name: 'Gloucester', name: 'Gloucester' },
  { id: 336, gov_name: 'Stroud', name: 'Stroud' },
  { id: 337, gov_name: 'Tewkesbury', name: 'Tewkesbury' },
  { id: 338, gov_name: 'Somerset UA', name: 'Somerset' },
  { id: 339, gov_name: 'Wales', name: 'Wales' },
  { id: 340, gov_name: 'Isle of Anglesey / Ynys Môn', name: 'Isle of Anglesey' },
  { id: 341, gov_name: 'Gwynedd / Gwynedd', name: 'Gwynedd' },
  { id: 342, gov_name: 'Conwy / Conwy', name: 'Conwy' },
  { id: 343, gov_name: 'Denbighshire / Sir Ddinbych', name: 'Denbighshire' },
  { id: 344, gov_name: 'Flintshire / Sir y Fflint', name: 'Flintshire' },
  { id: 345, gov_name: 'Wrexham / Wrecsam', name: 'Wrexham' },
  { id: 346, gov_name: 'Powys / Powys', name: 'Powys' },
  { id: 347, gov_name: 'Ceredigion / Ceredigion', name: 'Ceredigion' },
  { id: 348, gov_name: 'Pembrokeshire / Sir Benfro', name: 'Pembrokeshire' },
  { id: 349, gov_name: 'Carmarthenshire / Sir Gaerfyrddin', name: 'Carmarthenshire' },
  { id: 350, gov_name: 'Swansea / Abertawe', name: 'Swansea' },
  { id: 351, gov_name: 'Neath Port Talbot / Castell-nedd Port Talbot', name: 'Neath Port Talbot' },
  { id: 352, gov_name: 'Bridgend / Pen-y-bont ar Ogwr', name: 'Bridgend' },
  { id: 353, gov_name: 'Vale of Glamorgan / Bro Morgannwg', name: 'Vale of Glamorgan' },
  { id: 354, gov_name: 'Cardiff / Caerdydd', name: 'Cardiff' },
  { id: 355, gov_name: 'Rhondda Cynon Taf / Rhondda Cynon Taf', name: 'Rhondda Cynon Taf' },
  { id: 356, gov_name: 'Merthyr Tydfil / Merthyr Tudful', name: 'Merthyr Tydfil' },
  { id: 357, gov_name: 'Caerphilly / Caerffili', name: 'Caerphilly' },
  { id: 358, gov_name: 'Blaenau Gwent / Blaenau Gwent', name: 'Blaenau Gwent' },
  { id: 359, gov_name: 'Torfaen / Torfaen', name: 'Torfaen' },
  { id: 360, gov_name: 'Monmouthshire / Sir Fynwy', name: 'Monmouthshire' },
  { id: 361, gov_name: 'Newport / Casnewydd', name: 'Newport' },
  { id: 362, gov_name: 'Scotland', name: 'Scotland' },
  { id: 363, gov_name: 'Aberdeen City', name: 'Aberdeen' },
  { id: 364, gov_name: 'Aberdeenshire', name: 'Aberdeenshire' },
  { id: 365, gov_name: 'Angus', name: 'Angus' },
  { id: 366, gov_name: 'Argyll and Bute', name: 'Argyll and Bute' },
  { id: 367, gov_name: 'Clackmannanshire', name: 'Clackmannanshire' },
  { id: 368, gov_name: 'Dumfries and Galloway', name: 'Dumfries and Galloway' },
  { id: 369, gov_name: 'Dundee City', name: 'Dundee' },
  { id: 370, gov_name: 'East Ayrshire', name: 'East Ayrshire' },
  { id: 371, gov_name: 'East Dunbartonshire', name: 'East Dunbartonshire' },
  { id: 372, gov_name: 'East Lothian', name: 'East Lothian' },
  { id: 373, gov_name: 'East Renfrewshire', name: 'East Renfrewshire' },
  { id: 374, gov_name: 'City of Edinburgh', name: 'Edinburgh' },
  { id: 375, gov_name: 'Falkirk', name: 'Falkirk' },
  { id: 376, gov_name: 'Fife', name: 'Fife' },
  { id: 377, gov_name: 'Glasgow City', name: 'Glasgow' },
  { id: 378, gov_name: 'Highland', name: 'Highland' },
  { id: 379, gov_name: 'Inverclyde', name: 'Inverclyde' },
  { id: 380, gov_name: 'Midlothian', name: 'Midlothian' },
  { id: 381, gov_name: 'Moray', name: 'Moray' },
  { id: 382, gov_name: 'Na h-Eileanan Siar', name: 'Na h-Eileanan Siar' },
  { id: 383, gov_name: 'North Ayrshire', name: 'North Ayrshire' },
  { id: 384, gov_name: 'North Lanarkshire', name: 'North Lanarkshire' },
  { id: 385, gov_name: 'Orkney Islands', name: 'Orkney Islands' },
  { id: 386, gov_name: 'Perth and Kinross', name: 'Perth and Kinross' },
  { id: 387, gov_name: 'Renfrewshire', name: 'Renfrewshire' },
  { id: 388, gov_name: 'Scottish Borders', name: 'Scottish Borders' },
  { id: 389, gov_name: 'Shetland Islands', name: 'Shetland Islands' },
  { id: 390, gov_name: 'South Ayrshire', name: 'South Ayrshire' },
  { id: 391, gov_name: 'South Lanarkshire', name: 'South Lanarkshire' },
  { id: 392, gov_name: 'Stirling', name: 'Stirling' },
  { id: 393, gov_name: 'West Dunbartonshire', name: 'West Dunbartonshire' },
  { id: 394, gov_name: 'West Lothian', name: 'West Lothian' },
  { id: 395, gov_name: 'Northern Ireland', name: 'Northern Ireland' },
  { id: 396, gov_name: 'Not Classified', name: 'Not Classified' }
];

export const RECRUITER_TERRITORIES_UK: Territory[] = [
  {
    id: 1,
    name: 'Bedfordshire',
    country: 'England',
    ons_matches: [
      { id: 152, name: 'Bedford' },
      { id: 153, name: 'Central Bedfordshire' },
      { id: 154, name: 'Luton' }
    ]
  },
  {
    id: 2,
    name: 'Berkshire',
    country: 'England',
    ons_matches: [
      { id: 239, name: 'Bracknell Forest' },
      { id: 246, name: 'Reading' },
      { id: 247, name: 'Slough' },
      { id: 249, name: 'West Berkshire' },
      { id: 250, name: 'Windsor and Maidenhead' },
      { id: 251, name: 'Wokingham' }
    ]
  },
  {
    id: 3,
    name: 'Bristol',
    country: 'England',
    ons_matches: [{ id: 312, name: 'Bristol' }]
  },
  {
    id: 4,
    name: 'Buckinghamshire',
    country: 'England',
    ons_matches: [
      { id: 241, name: 'Buckinghamshire' },
      { id: 244, name: 'Milton Keynes' }
    ]
  },
  {
    id: 5,
    name: 'Cambridgeshire',
    country: 'England',
    ons_matches: [
      { id: 158, name: 'Cambridgeshire' },
      { id: 159, name: 'Cambridge' },
      { id: 160, name: 'East Cambridgeshire' },
      { id: 161, name: 'Fenland' },
      { id: 162, name: 'Huntingdonshire' },
      { id: 163, name: 'South Cambridgeshire' },
      { id: 155, name: 'Peterborough' }
    ]
  },
  {
    id: 6,
    name: 'Cheshire',
    country: 'England',
    ons_matches: [
      { id: 24, name: 'Cheshire East' },
      { id: 25, name: 'Cheshire West and Chester' },
      { id: 22, name: 'Halton' },
      { id: 23, name: 'Warrington' }
    ]
  },
  {
    id: 7,
    name: 'City of London',
    country: 'England',
    ons_matches: [{ id: 205, name: 'City of London' }]
  },
  {
    id: 8,
    name: 'Cornwall',
    country: 'England',
    ons_matches: [
      { id: 319, name: 'Cornwall' },
      { id: 320, name: 'Isles of Scilly' }
    ]
  },
  {
    id: 9,
    name: 'Cumbria',
    country: 'England',
    ons_matches: [
      { id: 26, name: 'Cumberland' },
      { id: 27, name: 'Westmorland and Furness' }
    ]
  },
  {
    id: 10,
    name: 'Derbyshire',
    country: 'England',
    ons_matches: [
      { id: 83, name: 'Derbyshire' },
      { id: 84, name: 'Amber Valley' },
      { id: 85, name: 'Bolsover' },
      { id: 86, name: 'Chesterfield' },
      { id: 87, name: 'Derbyshire Dales' },
      { id: 88, name: 'Erewash' },
      { id: 89, name: 'High Peak' },
      { id: 90, name: 'North East Derbyshire' },
      { id: 91, name: 'South Derbyshire' },
      { id: 77, name: 'Derby' }
    ]
  },
  {
    id: 11,
    name: 'Devon',
    country: 'England',
    ons_matches: [
      { id: 322, name: 'Devon' },
      { id: 323, name: 'East Devon' },
      { id: 324, name: 'Exeter' },
      { id: 325, name: 'Mid Devon' },
      { id: 326, name: 'North Devon' },
      { id: 327, name: 'South Hams' },
      { id: 328, name: 'Teignbridge' },
      { id: 329, name: 'Torridge' },
      { id: 330, name: 'West Devon' },
      { id: 315, name: 'Plymouth' },
      { id: 318, name: 'Torbay' }
    ]
  },
  {
    id: 12,
    name: 'Dorset',
    country: 'England',
    ons_matches: [
      { id: 313, name: 'Dorset' },
      { id: 311, name: 'Bournemouth, Christchurch and Poole' }
    ]
  },
  {
    id: 13,
    name: 'Durham',
    country: 'England',
    ons_matches: [
      { id: 11, name: 'County Durham' },
      { id: 6, name: 'Darlington' },
      { id: 7, name: 'Hartlepool' },
      { id: 10, name: 'Stockton-on-Tees' }
    ]
  },
  {
    id: 14,
    name: 'East Riding of Yorkshire',
    country: 'England',
    ons_matches: [
      { id: 59, name: 'East Riding of Yorkshire' },
      { id: 60, name: 'Kingston upon Hull' }
    ]
  },
  {
    id: 15,
    name: 'East Sussex',
    country: 'England',
    ons_matches: [
      { id: 252, name: 'East Sussex' },
      { id: 253, name: 'Eastbourne' },
      { id: 254, name: 'Hastings' },
      { id: 255, name: 'Lewes' },
      { id: 256, name: 'Rother' },
      { id: 257, name: 'Wealden' },
      { id: 240, name: 'Brighton and Hove' }
    ]
  },
  {
    id: 16,
    name: 'Essex',
    country: 'England',
    ons_matches: [
      { id: 164, name: 'Essex' },
      { id: 165, name: 'Basildon' },
      { id: 166, name: 'Braintree' },
      { id: 167, name: 'Brentwood' },
      { id: 168, name: 'Castle Point' },
      { id: 169, name: 'Chelmsford' },
      { id: 170, name: 'Colchester' },
      { id: 171, name: 'Epping Forest' },
      { id: 172, name: 'Harlow' },
      { id: 173, name: 'Maldon' },
      { id: 174, name: 'Rochford' },
      { id: 175, name: 'Tendring' },
      { id: 176, name: 'Uttlesford' },
      { id: 156, name: 'Southend-on-Sea' },
      { id: 157, name: 'Thurrock' }
    ]
  },
  {
    id: 17,
    name: 'Gloucestershire',
    country: 'England',
    ons_matches: [
      { id: 331, name: 'Gloucestershire' },
      { id: 332, name: 'Cheltenham' },
      { id: 333, name: 'Cotswold' },
      { id: 334, name: 'Forest of Dean' },
      { id: 335, name: 'Gloucester' },
      { id: 336, name: 'Stroud' },
      { id: 337, name: 'Tewkesbury' },
      { id: 316, name: 'South Gloucestershire' }
    ]
  },
  {
    id: 18,
    name: 'Greater London',
    country: 'England',
    ons_matches: [
      { id: 202, name: 'London' },
      { id: 203, name: 'Inner London' },
      { id: 204, name: 'Camden' },
      { id: 206, name: 'Hackney' },
      { id: 207, name: 'Hammersmith and Fulham' },
      { id: 208, name: 'Haringey' },
      { id: 209, name: 'Islington' },
      { id: 210, name: 'Kensington and Chelsea' },
      { id: 211, name: 'Lambeth' },
      { id: 212, name: 'Lewisham' },
      { id: 213, name: 'Newham' },
      { id: 214, name: 'Southwark' },
      { id: 215, name: 'Tower Hamlets' },
      { id: 216, name: 'Wandsworth' },
      { id: 217, name: 'Westminster' },
      { id: 218, name: 'Outer London' },
      { id: 219, name: 'Barking and Dagenham' },
      { id: 220, name: 'Barnet' },
      { id: 221, name: 'Bexley' },
      { id: 222, name: 'Brent' },
      { id: 223, name: 'Bromley' },
      { id: 224, name: 'Croydon' },
      { id: 225, name: 'Ealing' },
      { id: 226, name: 'Enfield' },
      { id: 227, name: 'Greenwich' },
      { id: 228, name: 'Harrow' },
      { id: 229, name: 'Havering' },
      { id: 230, name: 'Hillingdon' },
      { id: 231, name: 'Hounslow' },
      { id: 232, name: 'Kingston upon Thames' },
      { id: 233, name: 'Merton' },
      { id: 234, name: 'Redbridge' },
      { id: 235, name: 'Richmond upon Thames' },
      { id: 236, name: 'Sutton' },
      { id: 237, name: 'Waltham Forest' }
    ]
  },
  {
    id: 19,
    name: 'Greater Manchester',
    country: 'England',
    ons_matches: [
      { id: 28, name: 'Greater Manchester' },
      { id: 29, name: 'Bolton' },
      { id: 30, name: 'Bury' },
      { id: 31, name: 'Manchester' },
      { id: 32, name: 'Oldham' },
      { id: 33, name: 'Rochdale' },
      { id: 34, name: 'Salford' },
      { id: 35, name: 'Stockport' },
      { id: 36, name: 'Tameside' },
      { id: 37, name: 'Trafford' },
      { id: 38, name: 'Wigan' }
    ]
  },
  {
    id: 20,
    name: 'Hampshire',
    country: 'England',
    ons_matches: [
      { id: 258, name: 'Hampshire' },
      { id: 259, name: 'Basingstoke and Deane' },
      { id: 260, name: 'East Hampshire' },
      { id: 261, name: 'Eastleigh' },
      { id: 262, name: 'Fareham' },
      { id: 263, name: 'Gosport' },
      { id: 264, name: 'Hart' },
      { id: 265, name: 'Havant' },
      { id: 266, name: 'New Forest' },
      { id: 267, name: 'Rushmoor' },
      { id: 268, name: 'Test Valley' },
      { id: 269, name: 'Winchester' },
      { id: 245, name: 'Portsmouth' },
      { id: 248, name: 'Southampton' }
    ]
  },
  {
    id: 21,
    name: 'Herefordshire',
    country: 'England',
    ons_matches: [{ id: 117, name: 'Herefordshire' }]
  },
  {
    id: 22,
    name: 'Hertfordshire',
    country: 'England',
    ons_matches: [
      { id: 177, name: 'Hertfordshire' },
      { id: 178, name: 'Broxbourne' },
      { id: 179, name: 'Dacorum' },
      { id: 180, name: 'East Hertfordshire' },
      { id: 181, name: 'Hertsmere' },
      { id: 182, name: 'North Hertfordshire' },
      { id: 183, name: 'St Albans' },
      { id: 184, name: 'Stevenage' },
      { id: 185, name: 'Three Rivers' },
      { id: 186, name: 'Watford' },
      { id: 187, name: 'Welwyn Hatfield' }
    ]
  },
  {
    id: 23,
    name: 'Isle of Wight',
    country: 'England',
    ons_matches: [{ id: 242, name: 'Isle of Wight' }]
  },
  {
    id: 24,
    name: 'Kent',
    country: 'England',
    ons_matches: [
      { id: 270, name: 'Kent' },
      { id: 271, name: 'Ashford' },
      { id: 272, name: 'Canterbury' },
      { id: 273, name: 'Dartford' },
      { id: 274, name: 'Dover' },
      { id: 275, name: 'Gravesham' },
      { id: 276, name: 'Maidstone' },
      { id: 277, name: 'Sevenoaks' },
      { id: 278, name: 'Folkestone and Hythe' },
      { id: 279, name: 'Swale' },
      { id: 280, name: 'Thanet' },
      { id: 281, name: 'Tonbridge and Malling' },
      { id: 282, name: 'Tunbridge Wells' },
      { id: 243, name: 'Medway' }
    ]
  },
  {
    id: 25,
    name: 'Lancashire',
    country: 'England',
    ons_matches: [
      { id: 39, name: 'Lancashire' },
      { id: 40, name: 'Burnley' },
      { id: 41, name: 'Chorley' },
      { id: 42, name: 'Fylde' },
      { id: 43, name: 'Hyndburn' },
      { id: 44, name: 'Lancaster' },
      { id: 45, name: 'Pendle' },
      { id: 46, name: 'Preston' },
      { id: 47, name: 'Ribble Valley' },
      { id: 48, name: 'Rossendale' },
      { id: 49, name: 'South Ribble' },
      { id: 50, name: 'West Lancashire' },
      { id: 51, name: 'Wyre' },
      { id: 20, name: 'Blackburn with Darwen' },
      { id: 21, name: 'Blackpool' }
    ]
  },
  {
    id: 26,
    name: 'Leicestershire',
    country: 'England',
    ons_matches: [
      { id: 92, name: 'Leicestershire' },
      { id: 93, name: 'Blaby' },
      { id: 94, name: 'Charnwood' },
      { id: 95, name: 'Harborough' },
      { id: 96, name: 'Hinckley and Bosworth' },
      { id: 97, name: 'Melton' },
      { id: 98, name: 'North West Leicestershire' },
      { id: 99, name: 'Oadby and Wigston' },
      { id: 78, name: 'Leicester' }
    ]
  },
  {
    id: 27,
    name: 'Lincolnshire',
    country: 'England',
    ons_matches: [
      { id: 100, name: 'Lincolnshire' },
      { id: 101, name: 'Boston' },
      { id: 102, name: 'East Lindsey' },
      { id: 103, name: 'Lincoln' },
      { id: 104, name: 'North Kesteven' },
      { id: 105, name: 'South Holland' },
      { id: 106, name: 'South Kesteven' },
      { id: 107, name: 'West Lindsey' },
      { id: 61, name: 'North East Lincolnshire' },
      { id: 62, name: 'North Lincolnshire' }
    ]
  },
  {
    id: 28,
    name: 'Merseyside',
    country: 'England',
    ons_matches: [
      { id: 52, name: 'Merseyside' },
      { id: 53, name: 'Knowsley' },
      { id: 54, name: 'Liverpool' },
      { id: 55, name: 'St. Helens' },
      { id: 56, name: 'Sefton' },
      { id: 57, name: 'Wirral' }
    ]
  },
  {
    id: 29,
    name: 'Norfolk',
    country: 'England',
    ons_matches: [
      { id: 188, name: 'Norfolk' },
      { id: 189, name: 'Breckland' },
      { id: 190, name: 'Broadland' },
      { id: 191, name: 'Great Yarmouth' },
      { id: 192, name: "King's Lynn and West Norfolk" },
      { id: 193, name: 'North Norfolk' },
      { id: 194, name: 'Norwich' },
      { id: 195, name: 'South Norfolk' }
    ]
  },
  {
    id: 30,
    name: 'North Yorkshire',
    country: 'England',
    ons_matches: [
      { id: 64, name: 'North Yorkshire' },
      { id: 63, name: 'York' },
      { id: 8, name: 'Middlesbrough' },
      { id: 9, name: 'Redcar and Cleveland' }
    ]
  },
  {
    id: 31,
    name: 'Northamptonshire',
    country: 'England',
    ons_matches: [
      { id: 79, name: 'North Northamptonshire' },
      { id: 82, name: 'West Northamptonshire' }
    ]
  },
  {
    id: 32,
    name: 'Northumberland',
    country: 'England',
    ons_matches: [{ id: 12, name: 'Northumberland' }]
  },
  {
    id: 33,
    name: 'Nottinghamshire',
    country: 'England',
    ons_matches: [
      { id: 108, name: 'Nottinghamshire' },
      { id: 109, name: 'Ashfield' },
      { id: 110, name: 'Bassetlaw' },
      { id: 111, name: 'Broxtowe' },
      { id: 112, name: 'Gedling' },
      { id: 113, name: 'Mansfield' },
      { id: 114, name: 'Newark and Sherwood' },
      { id: 115, name: 'Rushcliffe' },
      { id: 80, name: 'Nottingham' }
    ]
  },
  {
    id: 34,
    name: 'Oxfordshire',
    country: 'England',
    ons_matches: [
      { id: 283, name: 'Oxfordshire' },
      { id: 284, name: 'Cherwell' },
      { id: 285, name: 'Oxford' },
      { id: 286, name: 'South Oxfordshire' },
      { id: 287, name: 'Vale of White Horse' },
      { id: 288, name: 'West Oxfordshire' }
    ]
  },
  {
    id: 35,
    name: 'Rutland',
    country: 'England',
    ons_matches: [{ id: 81, name: 'Rutland' }]
  },
  {
    id: 36,
    name: 'Shropshire',
    country: 'England',
    ons_matches: [
      { id: 120, name: 'Shropshire' },
      { id: 119, name: 'Telford and Wrekin' }
    ]
  },
  {
    id: 37,
    name: 'Somerset',
    country: 'England',
    ons_matches: [
      { id: 338, name: 'Somerset' },
      { id: 310, name: 'Bath and North East Somerset' },
      { id: 314, name: 'North Somerset' }
    ]
  },
  {
    id: 38,
    name: 'South Yorkshire',
    country: 'England',
    ons_matches: [
      { id: 65, name: 'South Yorkshire' },
      { id: 66, name: 'Barnsley' },
      { id: 67, name: 'Doncaster' },
      { id: 68, name: 'Rotherham' },
      { id: 69, name: 'Sheffield' }
    ]
  },
  {
    id: 39,
    name: 'Staffordshire',
    country: 'England',
    ons_matches: [
      { id: 121, name: 'Staffordshire' },
      { id: 122, name: 'Cannock Chase' },
      { id: 123, name: 'East Staffordshire' },
      { id: 124, name: 'Lichfield' },
      { id: 125, name: 'Newcastle-under-Lyme' },
      { id: 126, name: 'South Staffordshire' },
      { id: 127, name: 'Stafford' },
      { id: 128, name: 'Staffordshire Moorlands' },
      { id: 129, name: 'Tamworth' },
      { id: 118, name: 'Stoke-on-Trent' }
    ]
  },
  {
    id: 40,
    name: 'Suffolk',
    country: 'England',
    ons_matches: [
      { id: 196, name: 'Suffolk' },
      { id: 197, name: 'Babergh' },
      { id: 198, name: 'Ipswich' },
      { id: 199, name: 'Mid Suffolk' },
      { id: 200, name: 'East Suffolk' },
      { id: 201, name: 'West Suffolk' }
    ]
  },
  {
    id: 41,
    name: 'Surrey',
    country: 'England',
    ons_matches: [
      { id: 289, name: 'Surrey' },
      { id: 290, name: 'Elmbridge' },
      { id: 291, name: 'Epsom and Ewell' },
      { id: 292, name: 'Guildford' },
      { id: 293, name: 'Mole Valley' },
      { id: 294, name: 'Reigate and Banstead' },
      { id: 295, name: 'Runnymede' },
      { id: 296, name: 'Spelthorne' },
      { id: 297, name: 'Surrey Heath' },
      { id: 298, name: 'Tandridge' },
      { id: 299, name: 'Waverley' },
      { id: 300, name: 'Woking' }
    ]
  },
  {
    id: 42,
    name: 'Tyne and Wear',
    country: 'England',
    ons_matches: [
      { id: 13, name: 'Tyne and Wear' },
      { id: 14, name: 'Gateshead' },
      { id: 15, name: 'Newcastle upon Tyne' },
      { id: 16, name: 'North Tyneside' },
      { id: 17, name: 'South Tyneside' },
      { id: 18, name: 'Sunderland' }
    ]
  },
  {
    id: 43,
    name: 'Warwickshire',
    country: 'England',
    ons_matches: [
      { id: 130, name: 'Warwickshire' },
      { id: 131, name: 'North Warwickshire' },
      { id: 132, name: 'Nuneaton and Bedworth' },
      { id: 133, name: 'Rugby' },
      { id: 134, name: 'Stratford-on-Avon' },
      { id: 135, name: 'Warwick' }
    ]
  },
  {
    id: 44,
    name: 'West Midlands',
    country: 'England',
    ons_matches: [
      { id: 136, name: 'West Midlands' },
      { id: 137, name: 'Birmingham' },
      { id: 138, name: 'Coventry' },
      { id: 139, name: 'Dudley' },
      { id: 140, name: 'Sandwell' },
      { id: 141, name: 'Solihull' },
      { id: 142, name: 'Walsall' },
      { id: 143, name: 'Wolverhampton' }
    ]
  },
  {
    id: 45,
    name: 'West Sussex',
    country: 'England',
    ons_matches: [
      { id: 301, name: 'West Sussex' },
      { id: 302, name: 'Adur' },
      { id: 303, name: 'Arun' },
      { id: 304, name: 'Chichester' },
      { id: 305, name: 'Crawley' },
      { id: 306, name: 'Horsham' },
      { id: 307, name: 'Mid Sussex' },
      { id: 308, name: 'Worthing' }
    ]
  },
  {
    id: 46,
    name: 'West Yorkshire',
    country: 'England',
    ons_matches: [
      { id: 70, name: 'West Yorkshire' },
      { id: 71, name: 'Bradford' },
      { id: 72, name: 'Calderdale' },
      { id: 73, name: 'Kirklees' },
      { id: 74, name: 'Leeds' },
      { id: 75, name: 'Wakefield' }
    ]
  },
  {
    id: 47,
    name: 'Wiltshire',
    country: 'England',
    ons_matches: [
      { id: 321, name: 'Wiltshire' },
      { id: 317, name: 'Swindon' }
    ]
  },
  {
    id: 48,
    name: 'Worcestershire',
    country: 'England',
    ons_matches: [
      { id: 144, name: 'Worcestershire' },
      { id: 145, name: 'Bromsgrove' },
      { id: 146, name: 'Malvern Hills' },
      { id: 147, name: 'Redditch' },
      { id: 148, name: 'Worcester' },
      { id: 149, name: 'Wychavon' },
      { id: 150, name: 'Wyre Forest' }
    ]
  },
  {
    id: 49,
    name: 'Isle of Anglesey',
    country: 'Wales',
    ons_matches: [{ id: 340, name: 'Isle of Anglesey' }]
  },
  {
    id: 50,
    name: 'Gwynedd',
    country: 'Wales',
    ons_matches: [{ id: 341, name: 'Gwynedd' }]
  },
  {
    id: 51,
    name: 'Conwy',
    country: 'Wales',
    ons_matches: [{ id: 342, name: 'Conwy' }]
  },
  {
    id: 52,
    name: 'Denbighshire',
    country: 'Wales',
    ons_matches: [{ id: 343, name: 'Denbighshire' }]
  },
  {
    id: 53,
    name: 'Flintshire',
    country: 'Wales',
    ons_matches: [{ id: 344, name: 'Flintshire' }]
  },
  {
    id: 54,
    name: 'Wrexham',
    country: 'Wales',
    ons_matches: [{ id: 345, name: 'Wrexham' }]
  },
  {
    id: 55,
    name: 'Powys',
    country: 'Wales',
    ons_matches: [{ id: 346, name: 'Powys' }]
  },
  {
    id: 56,
    name: 'Ceredigion',
    country: 'Wales',
    ons_matches: [{ id: 347, name: 'Ceredigion' }]
  },
  {
    id: 57,
    name: 'Pembrokeshire',
    country: 'Wales',
    ons_matches: [{ id: 348, name: 'Pembrokeshire' }]
  },
  {
    id: 58,
    name: 'Carmarthenshire',
    country: 'Wales',
    ons_matches: [{ id: 349, name: 'Carmarthenshire' }]
  },
  {
    id: 59,
    name: 'Swansea',
    country: 'Wales',
    ons_matches: [{ id: 350, name: 'Swansea' }]
  },
  {
    id: 60,
    name: 'Neath Port Talbot',
    country: 'Wales',
    ons_matches: [{ id: 351, name: 'Neath Port Talbot' }]
  },
  {
    id: 61,
    name: 'Bridgend',
    country: 'Wales',
    ons_matches: [{ id: 352, name: 'Bridgend' }]
  },
  {
    id: 62,
    name: 'Vale of Glamorgan',
    country: 'Wales',
    ons_matches: [{ id: 353, name: 'Vale of Glamorgan' }]
  },
  {
    id: 63,
    name: 'Cardiff',
    country: 'Wales',
    ons_matches: [{ id: 354, name: 'Cardiff' }]
  },
  {
    id: 64,
    name: 'Rhondda Cynon Taf',
    country: 'Wales',
    ons_matches: [{ id: 355, name: 'Rhondda Cynon Taf' }]
  },
  {
    id: 65,
    name: 'Merthyr Tydfil',
    country: 'Wales',
    ons_matches: [{ id: 356, name: 'Merthyr Tydfil' }]
  },
  {
    id: 66,
    name: 'Caerphilly',
    country: 'Wales',
    ons_matches: [{ id: 357, name: 'Caerphilly' }]
  },
  {
    id: 67,
    name: 'Blaenau Gwent',
    country: 'Wales',
    ons_matches: [{ id: 358, name: 'Blaenau Gwent' }]
  },
  {
    id: 68,
    name: 'Torfaen',
    country: 'Wales',
    ons_matches: [{ id: 359, name: 'Torfaen' }]
  },
  {
    id: 69,
    name: 'Monmouthshire',
    country: 'Wales',
    ons_matches: [{ id: 360, name: 'Monmouthshire' }]
  },
  {
    id: 70,
    name: 'Newport',
    country: 'Wales',
    ons_matches: [{ id: 361, name: 'Newport' }]
  },
  {
    id: 71,
    name: 'Aberdeen',
    country: 'Scotland',
    ons_matches: [{ id: 363, name: 'Aberdeen' }]
  },
  {
    id: 72,
    name: 'Aberdeenshire',
    country: 'Scotland',
    ons_matches: [{ id: 364, name: 'Aberdeenshire' }]
  },
  {
    id: 73,
    name: 'Angus',
    country: 'Scotland',
    ons_matches: [{ id: 365, name: 'Angus' }]
  },
  {
    id: 74,
    name: 'Argyll and Bute',
    country: 'Scotland',
    ons_matches: [{ id: 366, name: 'Argyll and Bute' }]
  },
  {
    id: 75,
    name: 'Clackmannanshire',
    country: 'Scotland',
    ons_matches: [{ id: 367, name: 'Clackmannanshire' }]
  },
  {
    id: 76,
    name: 'Dumfries and Galloway',
    country: 'Scotland',
    ons_matches: [{ id: 368, name: 'Dumfries and Galloway' }]
  },
  {
    id: 77,
    name: 'Dundee',
    country: 'Scotland',
    ons_matches: [{ id: 369, name: 'Dundee' }]
  },
  {
    id: 78,
    name: 'East Ayrshire',
    country: 'Scotland',
    ons_matches: [{ id: 370, name: 'East Ayrshire' }]
  },
  {
    id: 79,
    name: 'East Dunbartonshire',
    country: 'Scotland',
    ons_matches: [{ id: 371, name: 'East Dunbartonshire' }]
  },
  {
    id: 80,
    name: 'East Lothian',
    country: 'Scotland',
    ons_matches: [{ id: 372, name: 'East Lothian' }]
  },
  {
    id: 81,
    name: 'East Renfrewshire',
    country: 'Scotland',
    ons_matches: [{ id: 373, name: 'East Renfrewshire' }]
  },
  {
    id: 82,
    name: 'Edinburgh',
    country: 'Scotland',
    ons_matches: [{ id: 374, name: 'Edinburgh' }]
  },
  {
    id: 83,
    name: 'Falkirk',
    country: 'Scotland',
    ons_matches: [{ id: 375, name: 'Falkirk' }]
  },
  {
    id: 84,
    name: 'Fife',
    country: 'Scotland',
    ons_matches: [{ id: 376, name: 'Fife' }]
  },
  {
    id: 85,
    name: 'Glasgow',
    country: 'Scotland',
    ons_matches: [{ id: 377, name: 'Glasgow' }]
  },
  {
    id: 86,
    name: 'Highland',
    country: 'Scotland',
    ons_matches: [{ id: 378, name: 'Highland' }]
  },
  {
    id: 87,
    name: 'Inverclyde',
    country: 'Scotland',
    ons_matches: [{ id: 379, name: 'Inverclyde' }]
  },
  {
    id: 88,
    name: 'Midlothian',
    country: 'Scotland',
    ons_matches: [{ id: 380, name: 'Midlothian' }]
  },
  {
    id: 89,
    name: 'Moray',
    country: 'Scotland',
    ons_matches: [{ id: 381, name: 'Moray' }]
  },
  {
    id: 90,
    name: 'Na h-Eileanan Siar',
    country: 'Scotland',
    ons_matches: [{ id: 382, name: 'Na h-Eileanan Siar' }]
  },
  {
    id: 91,
    name: 'North Ayrshire',
    country: 'Scotland',
    ons_matches: [{ id: 383, name: 'North Ayrshire' }]
  },
  {
    id: 92,
    name: 'North Lanarkshire',
    country: 'Scotland',
    ons_matches: [{ id: 384, name: 'North Lanarkshire' }]
  },
  {
    id: 93,
    name: 'Orkney Islands',
    country: 'Scotland',
    ons_matches: [{ id: 385, name: 'Orkney Islands' }]
  },
  {
    id: 94,
    name: 'Perth and Kinross',
    country: 'Scotland',
    ons_matches: [{ id: 386, name: 'Perth and Kinross' }]
  },
  {
    id: 95,
    name: 'Renfrewshire',
    country: 'Scotland',
    ons_matches: [{ id: 387, name: 'Renfrewshire' }]
  },
  {
    id: 96,
    name: 'Scottish Borders',
    country: 'Scotland',
    ons_matches: [{ id: 388, name: 'Scottish Borders' }]
  },
  {
    id: 97,
    name: 'Shetland Islands',
    country: 'Scotland',
    ons_matches: [{ id: 389, name: 'Shetland Islands' }]
  },
  {
    id: 98,
    name: 'South Ayrshire',
    country: 'Scotland',
    ons_matches: [{ id: 390, name: 'South Ayrshire' }]
  },
  {
    id: 99,
    name: 'South Lanarkshire',
    country: 'Scotland',
    ons_matches: [{ id: 391, name: 'South Lanarkshire' }]
  },
  {
    id: 100,
    name: 'Stirling',
    country: 'Scotland',
    ons_matches: [{ id: 392, name: 'Stirling' }]
  },
  {
    id: 101,
    name: 'West Dunbartonshire',
    country: 'Scotland',
    ons_matches: [{ id: 393, name: 'West Dunbartonshire' }]
  },
  {
    id: 102,
    name: 'West Lothian',
    country: 'Scotland',
    ons_matches: [{ id: 394, name: 'West Lothian' }]
  },
  {
    id: 103,
    name: 'Antrim',
    country: 'Northern Ireland',
    ons_matches: [{ id: 395, name: 'Northern Ireland' }]
  },
  {
    id: 104,
    name: 'Armagh',
    country: 'Northern Ireland',
    ons_matches: [{ id: 395, name: 'Northern Ireland' }]
  },
  {
    id: 105,
    name: 'Down',
    country: 'Northern Ireland',
    ons_matches: [{ id: 395, name: 'Northern Ireland' }]
  },
  {
    id: 106,
    name: 'Fermanagh',
    country: 'Northern Ireland',
    ons_matches: [{ id: 395, name: 'Northern Ireland' }]
  },
  {
    id: 107,
    name: 'Londonderry',
    country: 'Northern Ireland',
    ons_matches: [{ id: 395, name: 'Northern Ireland' }]
  },
  {
    id: 108,
    name: 'Tyrone',
    country: 'Northern Ireland',
    ons_matches: [{ id: 395, name: 'Northern Ireland' }]
  }
];
