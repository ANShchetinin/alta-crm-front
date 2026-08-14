export const buildFullAddress = (address: string, entrance?: string): string => {
  if (entrance && entrance.trim()) {
    return `${address.trim()}, подъезд ${entrance.trim()}`;
  }
  return address.trim();
};

export const getYandexMapsUrl = (address: string, entrance?: string): string => {
  const fullAddress = buildFullAddress(address, entrance);
  return `https://yandex.ru/maps/?text=${encodeURIComponent(fullAddress)}&rtt=auto`;
};

export const get2GisUrl = (address: string, entrance?: string): string => {
  const fullAddress = buildFullAddress(address, entrance);
  return `https://2gis.ru/search/${encodeURIComponent(fullAddress)}`;
};
