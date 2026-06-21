export type DeliveryZone = 1 | 2 | 3 | 4

interface WilayaInfo {
  name: string
  zone: DeliveryZone
}

// Zone 1: Capital region — cheapest & fastest
// Zone 2: Northern cities (major hubs)
// Zone 3: Centre / interior towns
// Zone 4: Southern / remote wilayas

export const WILAYA_DATA: Record<string, WilayaInfo> = {
  'Alger':           { name: 'Alger',           zone: 1 },
  'Blida':           { name: 'Blida',            zone: 1 },
  'Boumerdès':       { name: 'Boumerdès',        zone: 1 },
  'Tipaza':          { name: 'Tipaza',           zone: 1 },
  'Oran':            { name: 'Oran',             zone: 2 },
  'Annaba':          { name: 'Annaba',           zone: 2 },
  'Constantine':     { name: 'Constantine',      zone: 2 },
  'Sétif':           { name: 'Sétif',            zone: 2 },
  'Tizi Ouzou':      { name: 'Tizi Ouzou',       zone: 2 },
  'Béjaïa':          { name: 'Béjaïa',           zone: 2 },
  'Batna':           { name: 'Batna',            zone: 2 },
  'Tlemcen':         { name: 'Tlemcen',          zone: 2 },
  'Skikda':          { name: 'Skikda',           zone: 2 },
  'Guelma':          { name: 'Guelma',           zone: 2 },
  'Médéa':           { name: 'Médéa',            zone: 2 },
  'Mostaganem':      { name: 'Mostaganem',       zone: 2 },
  'Chlef':           { name: 'Chlef',            zone: 2 },
  'Bouira':          { name: 'Bouira',           zone: 2 },
  'Ain Defla':       { name: 'Aïn Defla',        zone: 2 },
  'Aïn Defla':       { name: 'Aïn Defla',        zone: 2 },
  'Jijel':           { name: 'Jijel',            zone: 2 },
  'Mila':            { name: 'Mila',             zone: 2 },
  'Bordj Bou Arreridj': { name: 'Bordj Bou Arreridj', zone: 2 },
  'Souk Ahras':      { name: 'Souk Ahras',       zone: 2 },
  'El Tarf':         { name: 'El Tarf',          zone: 2 },
  'Tissemsilt':      { name: 'Tissemsilt',       zone: 3 },
  'Msila':           { name: 'Msila',            zone: 3 },
  'Mascara':         { name: 'Mascara',          zone: 3 },
  'Saïda':           { name: 'Saïda',            zone: 3 },
  'Sidi Bel Abbès':  { name: 'Sidi Bel Abbès',   zone: 3 },
  'Relizane':        { name: 'Relizane',         zone: 3 },
  'Aïn Témouchent':  { name: 'Aïn Témouchent',   zone: 3 },
  'Tiaret':          { name: 'Tiaret',           zone: 3 },
  'Djelfa':          { name: 'Djelfa',           zone: 3 },
  'Khenchela':       { name: 'Khenchela',        zone: 3 },
  'Oum El Bouaghi':  { name: 'Oum El Bouaghi',   zone: 3 },
  'Tébessa':         { name: 'Tébessa',          zone: 3 },
  'Naâma':           { name: 'Naâma',            zone: 3 },
  'El Bayadh':       { name: 'El Bayadh',        zone: 3 },
  'Biskra':          { name: 'Biskra',           zone: 3 },
  'Laghouat':        { name: 'Laghouat',         zone: 3 },
  'Ghardaïa':        { name: 'Ghardaïa',         zone: 4 },
  'Ouargla':         { name: 'Ouargla',          zone: 4 },
  'El Oued':         { name: 'El Oued',          zone: 4 },
  'Béchar':          { name: 'Béchar',           zone: 4 },
  'Tamanrasset':     { name: 'Tamanrasset',      zone: 4 },
  'Illizi':          { name: 'Illizi',           zone: 4 },
  'Tindouf':         { name: 'Tindouf',          zone: 4 },
  'Adrar':           { name: 'Adrar',            zone: 4 },
  'In Salah':        { name: 'In Salah',         zone: 4 },
  'In Guezzam':      { name: 'In Guezzam',       zone: 4 },
  'Djanet':          { name: 'Djanet',           zone: 4 },
  'Touggourt':       { name: 'Touggourt',        zone: 4 },
  'El Meghaier':     { name: 'El Meghaier',      zone: 4 },
  'El Meniaa':       { name: 'El Meniaa',        zone: 4 },
  'Timimoun':        { name: 'Timimoun',         zone: 4 },
  'Bordj Badji Mokhtar': { name: 'Bordj Badji Mokhtar', zone: 4 },
  'Ouled Djellal':   { name: 'Ouled Djellal',    zone: 4 },
  'Béni Abbès':      { name: 'Béni Abbès',       zone: 4 },
}

interface ZoneConfig {
  cost: number         // DZD
  freeFrom: number     // order total for free shipping
  days: string
  label: { en: string; fr: string; ar: string }
}

export const ZONE_CONFIG: Record<DeliveryZone, ZoneConfig> = {
  1: { cost: 350,  freeFrom: 3000,  days: '1–2',  label: { en: '1–2 business days',    fr: '1–2 jours ouvrables',        ar: '1–2 أيام عمل' } },
  2: { cost: 450,  freeFrom: 4000,  days: '2–3',  label: { en: '2–3 business days',    fr: '2–3 jours ouvrables',        ar: '2–3 أيام عمل' } },
  3: { cost: 600,  freeFrom: 5000,  days: '3–5',  label: { en: '3–5 business days',    fr: '3–5 jours ouvrables',        ar: '3–5 أيام عمل' } },
  4: { cost: 850,  freeFrom: 7000,  days: '5–7',  label: { en: '5–7 business days',    fr: '5–7 jours ouvrables',        ar: '5–7 أيام عمل' } },
}

export const FREE_SHIPPING_DEFAULT = 5000

export function getDeliveryInfo(wilaya: string, orderTotal: number, lang: 'en' | 'fr' | 'ar' = 'fr') {
  const info = WILAYA_DATA[wilaya]
  const zone = info?.zone ?? 3
  const cfg = ZONE_CONFIG[zone]
  const isFree = orderTotal >= cfg.freeFrom
  return {
    zone,
    cost: isFree ? 0 : cfg.cost,
    isFree,
    days: cfg.label[lang],
    freeFrom: cfg.freeFrom,
  }
}

export const ALL_WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem','Msila','Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arreridj','Boumerdès','El Tarf','Tindouf','Tissemsilt',
  'El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma',
  'Aïn Témouchent','Ghardaïa','Relizane','Timimoun','Bordj Badji Mokhtar',
  'Ouled Djellal','Béni Abbès','In Salah','In Guezzam','Touggourt',
  'Djanet','El Meghaier','El Meniaa',
]
