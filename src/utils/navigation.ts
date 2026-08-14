export const getYandexMapsUrl = (address: string): string => {
  return `https://yandex.ru/maps/?text=${encodeURIComponent(address)}&rtt=auto`;
};

export const get2GisUrl = (address: string): string => {
  return `https://2gis.ru/search/${encodeURIComponent(address)}`;
};
