/**
 * Nepal geographic reference data.
 *
 * Source: the seven provinces and 77 districts of Nepal as published by the
 * Ministry of Federal Affairs and General Administration (MoFAGA) and the
 * National Statistics Office (CBS) district list. Names follow the spellings
 * used in the 2021 census publications.
 *
 * IMPORTANT: `latitude`/`longitude` are APPROXIMATE district-headquarters
 * coordinates, used only to rank donors by straight-line distance. They are not
 * population centroids and must not be used for navigation. Replace them with
 * authoritative centroid data (Survey Department shapefiles) before launch.
 * See docs/product/assumptions-and-decisions.md (ADR-004).
 */

export type ProvinceSeed = {
  code: string;
  nameEn: string;
  nameNe: string;
  sortOrder: number;
};

export type DistrictSeed = {
  code: string;
  nameEn: string;
  nameNe: string;
  provinceCode: string;
  latitude: number;
  longitude: number;
};

export const PROVINCES: ProvinceSeed[] = [
  { code: "P1", nameEn: "Koshi", nameNe: "कोशी", sortOrder: 1 },
  { code: "P2", nameEn: "Madhesh", nameNe: "मधेश", sortOrder: 2 },
  { code: "P3", nameEn: "Bagmati", nameNe: "बागमती", sortOrder: 3 },
  { code: "P4", nameEn: "Gandaki", nameNe: "गण्डकी", sortOrder: 4 },
  { code: "P5", nameEn: "Lumbini", nameNe: "लुम्बिनी", sortOrder: 5 },
  { code: "P6", nameEn: "Karnali", nameNe: "कर्णाली", sortOrder: 6 },
  { code: "P7", nameEn: "Sudurpashchim", nameNe: "सुदूरपश्चिम", sortOrder: 7 },
];

export const DISTRICTS: DistrictSeed[] = [
  // Koshi (14)
  { code: "BHO", nameEn: "Bhojpur", nameNe: "भोजपुर", provinceCode: "P1", latitude: 27.1715, longitude: 87.0461 },
  { code: "DNK", nameEn: "Dhankuta", nameNe: "धनकुटा", provinceCode: "P1", latitude: 26.9833, longitude: 87.3333 },
  { code: "ILM", nameEn: "Ilam", nameNe: "इलाम", provinceCode: "P1", latitude: 26.9094, longitude: 87.9282 },
  { code: "JHP", nameEn: "Jhapa", nameNe: "झापा", provinceCode: "P1", latitude: 26.5436, longitude: 88.0944 },
  { code: "KHT", nameEn: "Khotang", nameNe: "खोटाङ", provinceCode: "P1", latitude: 27.2, longitude: 86.7833 },
  { code: "MOR", nameEn: "Morang", nameNe: "मोरङ", provinceCode: "P1", latitude: 26.4525, longitude: 87.2718 },
  { code: "OKH", nameEn: "Okhaldhunga", nameNe: "ओखलढुङ्गा", provinceCode: "P1", latitude: 27.3167, longitude: 86.5 },
  { code: "PAN", nameEn: "Panchthar", nameNe: "पाँचथर", provinceCode: "P1", latitude: 27.15, longitude: 87.75 },
  { code: "SNK", nameEn: "Sankhuwasabha", nameNe: "सङ्खुवासभा", provinceCode: "P1", latitude: 27.3667, longitude: 87.2 },
  { code: "SOL", nameEn: "Solukhumbu", nameNe: "सोलुखुम्बु", provinceCode: "P1", latitude: 27.5, longitude: 86.5833 },
  { code: "SUN", nameEn: "Sunsari", nameNe: "सुनसरी", provinceCode: "P1", latitude: 26.6067, longitude: 87.1478 },
  { code: "TAP", nameEn: "Taplejung", nameNe: "ताप्लेजुङ", provinceCode: "P1", latitude: 27.35, longitude: 87.6667 },
  { code: "TER", nameEn: "Terhathum", nameNe: "तेह्रथुम", provinceCode: "P1", latitude: 27.1333, longitude: 87.5 },
  { code: "UDA", nameEn: "Udayapur", nameNe: "उदयपुर", provinceCode: "P1", latitude: 26.9167, longitude: 86.5 },

  // Madhesh (8)
  { code: "BAR", nameEn: "Bara", nameNe: "बारा", provinceCode: "P2", latitude: 27.0333, longitude: 85.0 },
  { code: "DHA", nameEn: "Dhanusha", nameNe: "धनुषा", provinceCode: "P2", latitude: 26.7288, longitude: 85.925 },
  { code: "MAH", nameEn: "Mahottari", nameNe: "महोत्तरी", provinceCode: "P2", latitude: 26.65, longitude: 85.8 },
  { code: "PAR", nameEn: "Parsa", nameNe: "पर्सा", provinceCode: "P2", latitude: 27.0104, longitude: 84.877 },
  { code: "RAU", nameEn: "Rautahat", nameNe: "रौतहट", provinceCode: "P2", latitude: 26.7667, longitude: 85.2667 },
  { code: "SAP", nameEn: "Saptari", nameNe: "सप्तरी", provinceCode: "P2", latitude: 26.5333, longitude: 86.75 },
  { code: "SAR", nameEn: "Sarlahi", nameNe: "सर्लाही", provinceCode: "P2", latitude: 26.8667, longitude: 85.5667 },
  { code: "SIR", nameEn: "Siraha", nameNe: "सिरहा", provinceCode: "P2", latitude: 26.65, longitude: 86.2 },

  // Bagmati (13)
  { code: "BHA", nameEn: "Bhaktapur", nameNe: "भक्तपुर", provinceCode: "P3", latitude: 27.671, longitude: 85.4298 },
  { code: "CHI", nameEn: "Chitwan", nameNe: "चितवन", provinceCode: "P3", latitude: 27.6833, longitude: 84.4333 },
  { code: "DHD", nameEn: "Dhading", nameNe: "धादिङ", provinceCode: "P3", latitude: 27.8667, longitude: 84.9 },
  { code: "DOL", nameEn: "Dolakha", nameNe: "दोलखा", provinceCode: "P3", latitude: 27.6667, longitude: 86.05 },
  { code: "KTM", nameEn: "Kathmandu", nameNe: "काठमाडौँ", provinceCode: "P3", latitude: 27.7172, longitude: 85.324 },
  { code: "KAV", nameEn: "Kavrepalanchok", nameNe: "काभ्रेपलाञ्चोक", provinceCode: "P3", latitude: 27.6167, longitude: 85.55 },
  { code: "LAL", nameEn: "Lalitpur", nameNe: "ललितपुर", provinceCode: "P3", latitude: 27.6588, longitude: 85.3247 },
  { code: "MAK", nameEn: "Makwanpur", nameNe: "मकवानपुर", provinceCode: "P3", latitude: 27.4287, longitude: 85.0322 },
  { code: "NUW", nameEn: "Nuwakot", nameNe: "नुवाकोट", provinceCode: "P3", latitude: 27.9167, longitude: 85.1667 },
  { code: "RAM", nameEn: "Ramechhap", nameNe: "रामेछाप", provinceCode: "P3", latitude: 27.3333, longitude: 86.0833 },
  { code: "RAS", nameEn: "Rasuwa", nameNe: "रसुवा", provinceCode: "P3", latitude: 28.1167, longitude: 85.3 },
  { code: "SIN", nameEn: "Sindhuli", nameNe: "सिन्धुली", provinceCode: "P3", latitude: 27.25, longitude: 85.9667 },
  { code: "SND", nameEn: "Sindhupalchok", nameNe: "सिन्धुपाल्चोक", provinceCode: "P3", latitude: 27.7667, longitude: 85.7 },

  // Gandaki (11)
  { code: "BAG", nameEn: "Baglung", nameNe: "बागलुङ", provinceCode: "P4", latitude: 28.2667, longitude: 83.5833 },
  { code: "GOR", nameEn: "Gorkha", nameNe: "गोरखा", provinceCode: "P4", latitude: 28.0, longitude: 84.6333 },
  { code: "KAS", nameEn: "Kaski", nameNe: "कास्की", provinceCode: "P4", latitude: 28.2096, longitude: 83.9856 },
  { code: "LAM", nameEn: "Lamjung", nameNe: "लमजुङ", provinceCode: "P4", latitude: 28.2333, longitude: 84.3833 },
  { code: "MAN", nameEn: "Manang", nameNe: "मनाङ", provinceCode: "P4", latitude: 28.55, longitude: 84.2333 },
  { code: "MUS", nameEn: "Mustang", nameNe: "मुस्ताङ", provinceCode: "P4", latitude: 28.7833, longitude: 83.7333 },
  { code: "MYA", nameEn: "Myagdi", nameNe: "म्याग्दी", provinceCode: "P4", latitude: 28.35, longitude: 83.5667 },
  { code: "NAW", nameEn: "Nawalpur", nameNe: "नवलपुर", provinceCode: "P4", latitude: 27.65, longitude: 84.1167 },
  { code: "PRB", nameEn: "Parbat", nameNe: "पर्वत", provinceCode: "P4", latitude: 28.2333, longitude: 83.6833 },
  { code: "SYA", nameEn: "Syangja", nameNe: "स्याङ्जा", provinceCode: "P4", latitude: 28.0667, longitude: 83.8667 },
  { code: "TAN", nameEn: "Tanahun", nameNe: "तनहुँ", provinceCode: "P4", latitude: 27.9667, longitude: 84.2833 },

  // Lumbini (12)
  { code: "ARG", nameEn: "Arghakhanchi", nameNe: "अर्घाखाँची", provinceCode: "P5", latitude: 27.9833, longitude: 83.1833 },
  { code: "BAN", nameEn: "Banke", nameNe: "बाँके", provinceCode: "P5", latitude: 28.05, longitude: 81.6167 },
  { code: "BRD", nameEn: "Bardiya", nameNe: "बर्दिया", provinceCode: "P5", latitude: 28.05, longitude: 81.3333 },
  { code: "DAN", nameEn: "Dang", nameNe: "दाङ", provinceCode: "P5", latitude: 28.0333, longitude: 82.4833 },
  { code: "GUL", nameEn: "Gulmi", nameNe: "गुल्मी", provinceCode: "P5", latitude: 28.0667, longitude: 83.25 },
  { code: "KAP", nameEn: "Kapilvastu", nameNe: "कपिलवस्तु", provinceCode: "P5", latitude: 27.5833, longitude: 83.05 },
  { code: "PRS", nameEn: "Parasi", nameNe: "परासी", provinceCode: "P5", latitude: 27.5333, longitude: 83.6667 },
  { code: "PAL", nameEn: "Palpa", nameNe: "पाल्पा", provinceCode: "P5", latitude: 27.8667, longitude: 83.55 },
  { code: "PYU", nameEn: "Pyuthan", nameNe: "प्यूठान", provinceCode: "P5", latitude: 28.1, longitude: 82.8667 },
  { code: "ROL", nameEn: "Rolpa", nameNe: "रोल्पा", provinceCode: "P5", latitude: 28.3667, longitude: 82.4833 },
  { code: "RKE", nameEn: "Rukum East", nameNe: "पूर्वी रुकुम", provinceCode: "P5", latitude: 28.6333, longitude: 82.4667 },
  { code: "RUP", nameEn: "Rupandehi", nameNe: "रूपन्देही", provinceCode: "P5", latitude: 27.7, longitude: 83.45 },

  // Karnali (10)
  { code: "DAI", nameEn: "Dailekh", nameNe: "दैलेख", provinceCode: "P6", latitude: 28.85, longitude: 81.7167 },
  { code: "DLP", nameEn: "Dolpa", nameNe: "डोल्पा", provinceCode: "P6", latitude: 28.9333, longitude: 82.8833 },
  { code: "HUM", nameEn: "Humla", nameNe: "हुम्ला", provinceCode: "P6", latitude: 29.9667, longitude: 81.8333 },
  { code: "JAJ", nameEn: "Jajarkot", nameNe: "जाजरकोट", provinceCode: "P6", latitude: 28.7, longitude: 82.1833 },
  { code: "JUM", nameEn: "Jumla", nameNe: "जुम्ला", provinceCode: "P6", latitude: 29.2833, longitude: 82.1833 },
  { code: "KAL", nameEn: "Kalikot", nameNe: "कालीकोट", provinceCode: "P6", latitude: 29.1333, longitude: 81.6167 },
  { code: "MUG", nameEn: "Mugu", nameNe: "मुगु", provinceCode: "P6", latitude: 29.55, longitude: 82.1667 },
  { code: "RKW", nameEn: "Rukum West", nameNe: "पश्चिमी रुकुम", provinceCode: "P6", latitude: 28.6167, longitude: 82.4 },
  { code: "SAL", nameEn: "Salyan", nameNe: "सल्यान", provinceCode: "P6", latitude: 28.3833, longitude: 82.1667 },
  { code: "SUR", nameEn: "Surkhet", nameNe: "सुर्खेत", provinceCode: "P6", latitude: 28.6, longitude: 81.6333 },

  // Sudurpashchim (9)
  { code: "ACH", nameEn: "Achham", nameNe: "अछाम", provinceCode: "P7", latitude: 29.05, longitude: 81.25 },
  { code: "BAI", nameEn: "Baitadi", nameNe: "बैतडी", provinceCode: "P7", latitude: 29.5333, longitude: 80.5 },
  { code: "BAJ", nameEn: "Bajhang", nameNe: "बझाङ", provinceCode: "P7", latitude: 29.55, longitude: 81.2 },
  { code: "BJU", nameEn: "Bajura", nameNe: "बाजुरा", provinceCode: "P7", latitude: 29.4333, longitude: 81.35 },
  { code: "DAD", nameEn: "Dadeldhura", nameNe: "डडेल्धुरा", provinceCode: "P7", latitude: 29.3, longitude: 80.5833 },
  { code: "DAR", nameEn: "Darchula", nameNe: "दार्चुला", provinceCode: "P7", latitude: 29.85, longitude: 80.5333 },
  { code: "DOT", nameEn: "Doti", nameNe: "डोटी", provinceCode: "P7", latitude: 29.2667, longitude: 80.9333 },
  { code: "KAI", nameEn: "Kailali", nameNe: "कैलाली", provinceCode: "P7", latitude: 28.7, longitude: 80.6 },
  { code: "KAN", nameEn: "Kanchanpur", nameNe: "कञ्चनपुर", provinceCode: "P7", latitude: 28.9667, longitude: 80.1833 },
];

export const DISTRICT_BY_CODE = new Map(DISTRICTS.map((d) => [d.code, d]));
export const PROVINCE_BY_CODE = new Map(PROVINCES.map((p) => [p.code, p]));

export function districtsOfProvince(provinceCode: string): DistrictSeed[] {
  return DISTRICTS.filter((d) => d.provinceCode === provinceCode);
}

export function isDistrictInProvince(districtCode: string, provinceCode: string): boolean {
  return DISTRICT_BY_CODE.get(districtCode)?.provinceCode === provinceCode;
}
