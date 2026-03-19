export type LocationId = 'street' | 'gbd' | 'school';

export interface LocationConfig {
    id: LocationId;
    name: string;
    description: string;
    unlockCost: number;
    revenueMultiplier: number;
    themeColor: { r: number; g: number; b: number };
}

export const LOCATION_CONFIGS: LocationConfig[] = [
    {
        id: 'street',
        name: '起步街区',
        description: '基础客流，适合稳定起步。',
        unlockCost: 0,
        revenueMultiplier: 1.0,
        themeColor: { r: 246, g: 200, b: 123 }
    },
    {
        id: 'gbd',
        name: 'GBD商务区',
        description: '团餐与商单较多，收益更高。',
        unlockCost: 3000,
        revenueMultiplier: 1.25,
        themeColor: { r: 118, g: 184, b: 240 }
    },
    {
        id: 'school',
        name: '学校区',
        description: '学生客群多，事件节奏更快。',
        unlockCost: 8000,
        revenueMultiplier: 1.15,
        themeColor: { r: 143, g: 220, b: 165 }
    }
];

export function getLocationConfig(locationId: LocationId): LocationConfig | null {
    return LOCATION_CONFIGS.find((item) => item.id === locationId) || null;
}

