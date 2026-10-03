// @vitest-environment node
/**
 * Birth-place search with a region (p7 #35): "Springfield, Vermont" must find
 * Springfield VT, not the five most populous Springfields. Fixture: the
 * Open-Meteo rows for name=Springfield / Richmond, count=20 (2026-10-03).
 */
import { describe, expect, it } from 'vitest';
import { filterByQualifiers, qualifierMatches, splitPlace } from '../../../supabase/functions/astrology-geocode/qualifier';

const ROWS = {
 "springfield": [
  {
   "name": "Springfield",
   "admin1": "Missouri",
   "admin2": "Greene",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Illinois",
   "admin2": "Sangamon",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Massachusetts",
   "admin2": "Hampden",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Ohio",
   "admin2": "Clark",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Tennessee",
   "admin2": "Robertson",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Palmyra",
   "admin1": "Missouri",
   "admin2": "Marion",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Jackson",
   "admin1": "Minnesota",
   "admin2": "Jackson",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Kentucky",
   "admin2": "Washington",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Georgia",
   "admin2": "Effingham County",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Colorado",
   "admin2": "Baca",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Oregon",
   "admin2": "Lane",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Virginia",
   "admin2": "Fairfax",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Pennsylvania",
   "admin2": "Delaware",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Powder Springs",
   "admin1": "Georgia",
   "admin2": "Cobb",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "New Jersey",
   "admin2": "Union",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Vermont",
   "admin2": "Windsor",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Lomira",
   "admin1": "Wisconsin",
   "admin2": "Dodge",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "Minnesota",
   "admin2": "Brown",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Springfield",
   "admin1": "South Dakota",
   "admin2": "Bon Homme County",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "South Whitley",
   "admin1": "Indiana",
   "admin2": "Whitley",
   "country": "United States",
   "country_code": "US"
  }
 ],
 "richmond": [
  {
   "name": "Richmond",
   "admin1": "Virginia",
   "admin2": "City of Richmond",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "British Columbia",
   "admin2": "Metro Vancouver Regional District",
   "country": "Canada",
   "country_code": "CA"
  },
  {
   "name": "Richmond",
   "admin1": "California",
   "admin2": "Contra Costa",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Indiana",
   "admin2": "Wayne",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Kentucky",
   "admin2": "Madison",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Texas",
   "admin2": "Fort Bend",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Missouri",
   "admin2": "Ray",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Tasman District",
   "admin2": "Tasman District",
   "country": "New Zealand",
   "country_code": "NZ"
  },
  {
   "name": "Chateaubelair",
   "admin1": "Saint David Parish",
   "country": "Saint Vincent and the Grenadines",
   "country_code": "VC"
  },
  {
   "name": "Richmond",
   "admin1": "KwaZulu-Natal",
   "admin2": "uMgungundlovu District Municipality",
   "country": "South Africa",
   "country_code": "ZA"
  },
  {
   "name": "Richmond",
   "admin1": "England",
   "admin2": "Greater London",
   "country": "United Kingdom",
   "country_code": "GB"
  },
  {
   "name": "Richmond",
   "admin1": "Michigan",
   "admin2": "Macomb",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Utah",
   "admin2": "Cache",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Illinois",
   "admin2": "McHenry",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Bradford",
   "admin1": "Ohio",
   "admin2": "Miami",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Maine",
   "admin2": "Sagadahoc",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Massachusetts",
   "admin2": "Berkshire",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Minnesota",
   "admin2": "Stearns",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Vermont",
   "admin2": "Chittenden",
   "country": "United States",
   "country_code": "US"
  },
  {
   "name": "Richmond",
   "admin1": "Ohio",
   "admin2": "Jefferson",
   "country": "United States",
   "country_code": "US"
  }
 ]
};

const regions = (rows: Array<{ admin1?: string; country_code?: string }>) => rows.map((r) => `${r.admin1}/${r.country_code}`);

describe('splitPlace', () => {
  it('splits the name from its qualifiers, on ASCII and CJK commas', () => {
    expect(splitPlace('Springfield, Vermont, USA')).toEqual({ name: 'Springfield', qualifiers: ['Vermont', 'USA'] });
    expect(splitPlace('渋谷，東京')).toEqual({ name: '渋谷', qualifiers: ['東京'] });
    expect(splitPlace('Tokyo')).toEqual({ name: 'Tokyo', qualifiers: [] });
  });
});

describe('filterByQualifiers', () => {
  it('Springfield, Vermont → only Vermont', () => {
    const out = filterByQualifiers(ROWS.springfield, ['Vermont']);
    expect(out.length).toBe(1);
    expect(regions(out)).toEqual(['Vermont/US']);
  });
  it('Richmond, Texas → only Texas', () => {
    expect(regions(filterByQualifiers(ROWS.richmond, ['Texas']))).toEqual(['Texas/US']);
  });
  it('US state codes and country names work', () => {
    expect(regions(filterByQualifiers(ROWS.springfield, ['VT']))).toEqual(['Vermont/US']);
    expect(regions(filterByQualifiers(ROWS.richmond, ['TX', 'USA']))).toEqual(['Texas/US']);
    expect(regions(filterByQualifiers(ROWS.richmond, ['UK']))).toEqual(['England/GB']);
    expect(regions(filterByQualifiers(ROWS.richmond, ['New Zealand']))).toEqual(['Tasman District/NZ']);
    expect(regions(filterByQualifiers(ROWS.richmond, ['British Columbia', 'Canada']))).toEqual(['British Columbia/CA']);
  });
  it('a qualifier nothing matches leaves nothing (the caller then asks Nominatim)', () => {
    expect(filterByQualifiers(ROWS.springfield, ['Atlantis'])).toEqual([]);
  });
  it('no qualifier keeps every row', () => {
    expect(filterByQualifiers(ROWS.springfield, []).length).toBe(ROWS.springfield.length);
  });
  it('CJK region names match their longer official form', () => {
    expect(qualifierMatches('東京', { name: '渋谷区', admin1: '東京都', country: '日本', country_code: 'JP' })).toBe(true);
    expect(qualifierMatches('日本', { name: '渋谷区', admin1: '東京都', country: 'Japan', country_code: 'JP' })).toBe(true);
    expect(qualifierMatches('大阪', { name: '渋谷区', admin1: '東京都', country: '日本', country_code: 'JP' })).toBe(false);
  });
});
