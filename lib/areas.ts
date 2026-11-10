// Launch areas with approximate centre points (used when a client picks an area instead of GPS).
export type Area = { name: string; lat: number; lng: number };

export const CITIES: Record<string, Area[]> = {
  Lagos: [
    { name: "Ajah", lat: 6.4672, lng: 3.5711 },
    { name: "Lekki", lat: 6.4478, lng: 3.4723 },
    { name: "Victoria Island", lat: 6.4281, lng: 3.4219 },
    { name: "Ikoyi", lat: 6.4541, lng: 3.4346 },
    { name: "Yaba", lat: 6.5095, lng: 3.3711 },
    { name: "Surulere", lat: 6.5009, lng: 3.3581 },
    { name: "Ikeja", lat: 6.6018, lng: 3.3515 },
    { name: "Gbagada", lat: 6.5531, lng: 3.3874 },
    { name: "Magodo", lat: 6.62, lng: 3.386 },
  ],
  Abuja: [
    { name: "Lugbe", lat: 8.975, lng: 7.38 },
    { name: "Garki", lat: 9.03, lng: 7.489 },
    { name: "Wuse 2", lat: 9.079, lng: 7.47 },
    { name: "Maitama", lat: 9.0882, lng: 7.4934 },
    { name: "Asokoro", lat: 9.043, lng: 7.524 },
    { name: "Jabi", lat: 9.07, lng: 7.423 },
    { name: "Utako", lat: 9.07, lng: 7.44 },
    { name: "Gwarinpa", lat: 9.105, lng: 7.405 },
    { name: "Wuye", lat: 9.056, lng: 7.443 },
  ],
};

export const CITY_NAMES = Object.keys(CITIES);
