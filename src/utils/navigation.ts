export const buildFullAddress = (address: string, entrance?: string, floor?: string): string => {
  let full = (address || '').trim();
  if (entrance && entrance.trim()) {
    full += `, подъезд ${entrance.trim()}`;
  }
  if (floor && floor.trim()) {
    full += `, этаж ${floor.trim()}`;
  }
  return full;
};

export const getYandexMapsUrl = (address: string, entrance?: string, floor?: string): string => {
  const fullAddress = buildFullAddress(address, entrance, floor);
  return `https://yandex.ru/maps/?text=${encodeURIComponent(fullAddress)}&rtt=auto`;
};

export const get2GisUrl = (address: string, entrance?: string, floor?: string): string => {
  const fullAddress = buildFullAddress(address, entrance, floor);
  return `https://2gis.ru/search/${encodeURIComponent(fullAddress)}`;
};
