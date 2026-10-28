// 北京各行政区中心点（GCJ-02），用于没有 GPS 时的出发位置兜底
export const DISTRICT_COORDS = {
  '朝阳': { lat: 39.92, lng: 116.46 },
  '海淀': { lat: 39.96, lng: 116.30 },
  '东城': { lat: 39.93, lng: 116.42 },
  '西城': { lat: 39.92, lng: 116.37 },
  '丰台': { lat: 39.86, lng: 116.29 },
  '石景山': { lat: 39.9155, lng: 116.1855 },
  '通州': { lat: 39.91, lng: 116.66 },
  '昌平': { lat: 40.22, lng: 116.23 },
  '顺义': { lat: 40.13, lng: 116.65 },
  '大兴': { lat: 39.73, lng: 116.34 },
  '房山': { lat: 39.75, lng: 116.14 },
  '门头沟': { lat: 39.94, lng: 116.10 },
  '密云': { lat: 40.38, lng: 116.84 },
  '怀柔': { lat: 40.32, lng: 116.63 },
  '平谷': { lat: 40.14, lng: 117.12 },
  '延庆': { lat: 40.46, lng: 115.97 }
}

export function getDistrictCoords(district) {
  return DISTRICT_COORDS[district] || DISTRICT_COORDS['朝阳']
}
