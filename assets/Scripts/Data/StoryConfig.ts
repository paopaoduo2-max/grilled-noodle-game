import { LocationId } from './LocationConfig';

export interface StoryNodeConfig {
    id: string;
    title: string;
    locationId: LocationId;
    keyNpcId: string;
    requiredOrders: number;
    type: 'mainline' | 'branch';
}

export const STORY_NODES: StoryNodeConfig[] = [
    {
        id: 'main_street_intro',
        title: '街区开张',
        locationId: 'street',
        keyNpcId: 'street_uncle',
        requiredOrders: 3,
        type: 'mainline'
    },
    {
        id: 'main_gbd_deal',
        title: '商务区首单',
        locationId: 'gbd',
        keyNpcId: 'gbd_manager',
        requiredOrders: 4,
        type: 'mainline'
    },
    {
        id: 'branch_school_club',
        title: '学生社团委托',
        locationId: 'school',
        keyNpcId: 'school_leader',
        requiredOrders: 3,
        type: 'branch'
    }
];

