/**
 * 🎭 事件角色素材配置表
 * 定义所有事件中出现的角色及其素材路径
 * 后续统一替换素材时修改此文件中的路径即可
 */

/**
 * 角色素材配置接口
 */
export interface CharacterAssetConfig {
    id: string;              // 角色唯一ID
    name: string;            // 角色名称
    emoji: string;           // 临时使用的emoji（无素材时显示）
    spritePath: string;      // 精灵图片路径（后续替换）
    description: string;     // 角色描述
    eventIds: string[];      // 关联的事件ID列表
}

/**
 * 事件角色素材表
 */
export const EVENT_CHARACTER_ASSETS: CharacterAssetConfig[] = [
    // ========================================
    // 幼儿园相关
    // ========================================
    {
        id: 'kindergarten_teacher',
        name: '幼儿园老师',
        emoji: '👩‍🏫',
        spritePath: 'textures/characters/kindergarten_teacher',
        description: '负责接收幼儿园订单的老师',
        eventIds: ['kindergarten_order', 'kindergarten_party']
    },
    {
        id: 'kindergarten_kid',
        name: '小朋友',
        emoji: '👧',
        spritePath: 'textures/characters/kindergarten_kid',
        description: '幼儿园的小朋友',
        eventIds: ['kindergarten_order']
    },
    
    // ========================================
    // 外卖/配送相关
    // ========================================
    {
        id: 'delivery_rider',
        name: '外卖小哥',
        emoji: '🛵',
        spritePath: 'textures/characters/delivery_rider',
        description: '负责配送外卖的骑手',
        eventIds: ['delivery_rush', 'delivery_order']
    },
    
    // ========================================
    // 商务/公司相关
    // ========================================
    {
        id: 'office_worker',
        name: '公司职员',
        emoji: '👔',
        spritePath: 'textures/characters/office_worker',
        description: '附近公司的上班族',
        eventIds: ['company_order', 'lunch_meeting']
    },
    {
        id: 'business_manager',
        name: '公司经理',
        emoji: '🧑‍💼',
        spritePath: 'textures/characters/business_manager',
        description: '公司部门经理',
        eventIds: ['vip_order', 'business_lunch']
    },
    
    // ========================================
    // 社区/居民相关
    // ========================================
    {
        id: 'elderly_neighbor',
        name: '老邻居',
        emoji: '👴',
        spritePath: 'textures/characters/elderly_neighbor',
        description: '附近的老年居民',
        eventIds: ['neighbor_help', 'community_event']
    },
    {
        id: 'young_mother',
        name: '年轻妈妈',
        emoji: '👩‍👧',
        spritePath: 'textures/characters/young_mother',
        description: '带孩子的年轻妈妈',
        eventIds: ['family_order', 'birthday_party']
    },
    
    // ========================================
    // 特殊角色
    // ========================================
    {
        id: 'food_critic',
        name: '美食评论家',
        emoji: '🎩',
        spritePath: 'textures/characters/food_critic',
        description: '有影响力的美食博主',
        eventIds: ['critic_visit', 'review_event']
    },
    {
        id: 'health_inspector',
        name: '卫生检查员',
        emoji: '📋',
        spritePath: 'textures/characters/health_inspector',
        description: '食品卫生监督员',
        eventIds: ['health_check', 'inspection']
    },
    {
        id: 'supplier',
        name: '食材供应商',
        emoji: '🚚',
        spritePath: 'textures/characters/supplier',
        description: '送货的供应商',
        eventIds: ['supply_issue', 'special_ingredient']
    },
    
    // ========================================
    // 学生相关
    // ========================================
    {
        id: 'college_student',
        name: '大学生',
        emoji: '🎓',
        spritePath: 'textures/characters/college_student',
        description: '附近大学的学生',
        eventIds: ['student_group', 'study_order']
    },
    
    // ========================================
    // 节日活动相关
    // ========================================
    {
        id: 'festival_organizer',
        name: '活动组织者',
        emoji: '🎪',
        spritePath: 'textures/characters/festival_organizer',
        description: '社区活动的组织者',
        eventIds: ['festival_order', 'community_festival']
    }
];

/**
 * 根据角色ID获取角色配置
 */
export function getCharacterById(id: string): CharacterAssetConfig | null {
    return EVENT_CHARACTER_ASSETS.find(c => c.id === id) || null;
}

/**
 * 根据事件ID获取相关角色列表
 */
export function getCharactersByEventId(eventId: string): CharacterAssetConfig[] {
    return EVENT_CHARACTER_ASSETS.filter(c => c.eventIds.indexOf(eventId) !== -1);
}

/**
 * 获取角色显示内容（优先使用图片，无图片时使用emoji）
 */
export function getCharacterDisplay(id: string): { type: 'sprite' | 'emoji', content: string } {
    const character = getCharacterById(id);
    if (!character) {
        return { type: 'emoji', content: '❓' };
    }
    
    // 目前先返回emoji，后续有素材后可以改为返回sprite路径
    // TODO: 检查素材是否存在，存在则返回sprite
    return { type: 'emoji', content: character.emoji };
}

/**
 * 📋 需要准备的素材清单（用于美术制作参考）
 * 
 * | 序号 | 角色ID               | 角色名称     | 建议尺寸   | 备注                    |
 * |------|---------------------|-------------|-----------|------------------------|
 * | 1    | kindergarten_teacher | 幼儿园老师   | 200x300px | 友善、专业形象          |
 * | 2    | kindergarten_kid     | 小朋友       | 150x250px | 可爱、活泼              |
 * | 3    | delivery_rider       | 外卖小哥     | 200x300px | 穿制服、骑车/站立       |
 * | 4    | office_worker        | 公司职员     | 200x300px | 商务休闲装              |
 * | 5    | business_manager     | 公司经理     | 200x300px | 正装、专业形象          |
 * | 6    | elderly_neighbor     | 老邻居       | 200x300px | 慈祥、亲切              |
 * | 7    | young_mother         | 年轻妈妈     | 200x300px | 温柔、带孩子            |
 * | 8    | food_critic          | 美食评论家   | 200x300px | 戴帽子/眼镜、有品味     |
 * | 9    | health_inspector     | 卫生检查员   | 200x300px | 穿制服、拿记录板        |
 * | 10   | supplier             | 食材供应商   | 200x300px | 工作服、搬货形象        |
 * | 11   | college_student      | 大学生       | 200x300px | 休闲、背包              |
 * | 12   | festival_organizer   | 活动组织者   | 200x300px | 活力、组织者气质        |
 * 
 * 素材要求：
 * - 格式：PNG（透明背景）
 * - 风格：卡通/Q版，与游戏整体风格一致
 * - 表情：建议每个角色准备2-3种表情（默认、开心、生气）
 * - 命名：{角色ID}_default.png, {角色ID}_happy.png, {角色ID}_angry.png
 */
