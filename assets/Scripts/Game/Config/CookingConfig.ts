/**
 * CookingConfig.ts
 * 烹饪系统配置常量
 * 从 CookingControllerV2.ts 提取的配置数据
 */

import { Color } from 'cc';
import { IngredientType } from '../../Data/GameConfig';

/**
 * 手机面板布局配置
 */
export const PHONE_CONFIG = {
    // 手机背景（9:16比例，1.5倍放大）
    background: {
        width: 405,
        height: 720,
        positionY: 0,
        color: new Color(242, 242, 247, 255)  // iOS浅灰背景色
    },
    // 标题栏
    title: {
        height: 60,
        positionY: 200,  // 调整这个值来移动标题栏
        fontSize: 26,
        color: new Color(52, 152, 219, 255)  // 蓝色
    },
    // 评价容器
    container: {
        width: 360,
        height: 380,
        positionY: -20  // 调整这个值来移动整个评价区域
    },
    // 评价项
    item: {
        startY: 170,        // 调整：第一条评价的Y坐标
        height: 40,         // 调整：每条评价的高度
        spacing: 3,         // 调整：评价之间的间距
        width: 340,         // 评价项背景宽度
        rectOffsetY: -20    // 矩形绘制的Y偏移
    },
    // 评价文字
    text: {
        fontSize: 12,       // 调整：字体大小
        lineHeight: 16,     // 调整：行高
        width: 310,         // 调整：文字区域宽度
        positionX: -20,     // 调整：文字水平位置（负值=左移，正值=右移）
        heightPadding: 6    // 文字高度 = itemHeight - 这个值
    },
    // 关闭按钮
    closeButton: {
        size: 60,
        positionY: -230,
        fontSize: 20,
        color: new Color(231, 76, 60, 255)  // 红色
    }
};

/**
 * 工作区域配置
 */
export const WORK_AREA_CONFIG = {
    // 烹饪区域
    cooking: {
        x: 0,
        y: 100,
        width: 600,
        height: 300
    },
    // 食材区域
    ingredients: {
        x: 0,
        y: -200,
        width: 600,
        height: 150
    }
};

/**
 * 顾客等待时间配置（秒）
 */
export const CUSTOMER_PATIENCE_CONFIG = {
    base: 60,           // 基础等待时间
    perIngredient: 5,   // 每个额外食材增加的时间
    warningThreshold: 0.3,  // 进入警告状态的阈值（剩余30%时间）
    angryThreshold: 0       // 变生气的阈值
};

/**
 * 评分配置
 */
export const SCORE_CONFIG = {
    perfect: 5.0,       // 完美评分
    good: 4.5,          // 好评评分
    bad: 2.0,           // 差评评分
    baseReward: 10,     // 基础奖励
    perfectBonus: 5,    // 完美奖励加成
    badPenalty: -3      // 差评惩罚
};

/**
 * 工具图片 UUID 配置
 */
export const TOOL_IMAGE_UUIDS: { [key: string]: { hold: string, pouring: string } } = {
    'oil': {
        hold: 'd9a3a237-e2da-4740-adc7-8b918e160b5c@f9941',      // btn_oil.png
        pouring: 'd1a573cc-40f0-4d7f-a49f-813784060424@f9941'    // oil_bottle_pouring.png
    },
    'water': {
        hold: '7c8b8cc8-410a-442a-8a13-b520cbdbd17f@f9941',      // btn_water.png
        pouring: '9752dc5c-f8d5-4322-832a-f9918e9117ea@f9941'    // water_bottle_pouring.png
    },
    'vinegar': {
        hold: 'a46317d9-27dc-4103-900f-51c9c8d0284f@f9941',      // btn_vinegar.png
        pouring: '37427050-a9a0-4adc-8a26-b26fa77d1845@f9941'    // vinegar_bottle_pouring.png
    },
    'chili': {
        hold: '1ec2fd38-b892-4a95-b556-ca4baae08a98@f9941',      // btn_chili.png
        pouring: 'ddc9e92c-6c45-4565-b954-3d119d7f3d55@f9941'    // chili_bottle_pouring.png
    },
    'sugar': {
        hold: '37c91c39-962c-4589-a911-a5ae2950a547@f9941',      // btn_sugar.png
        pouring: 'ed6da75a-66d4-4b12-ae9f-a4f9307d992f@f9941'    // sugar_bottle_pouring.png
    }
};

/**
 * 鸡蛋图片 UUID 配置
 */
export const EGG_IMAGE_UUIDS = {
    whole: '459faa08-9a68-480c-880e-a2aa9a7903c4@f9941',    // egg_whole.png - 完整鸡蛋
    cracked: 'ab7b3f2f-9967-4c4f-a832-127035e5ead7@f9941'   // egg_cracked.png - 碎开的鸡蛋
};

/**
 * 洋葱手持图片 UUID 配置
 */
export const ONION_HOLD_UUIDS = [
    '57be6261-358b-48d6-aa33-4a4c06d39baa@f9941',  // onion_hold_1.png - 1份
    '389bb539-8bb6-47c0-bfd8-b65dfb231812@f9941',  // onion_hold_2.png - 2份
    '156cd7b4-8346-4b29-aecb-79c7e5c97c61@f9941'   // onion_hold_3.png - 3份
];

/**
 * 香菜手持图片 UUID 配置
 */
export const CILANTRO_HOLD_UUIDS = [
    '0765f0ea-798c-48de-af23-2fe493ad8a44@f9941',  // cilantro_hold_1.png - 1份
    '808e0fd0-8390-4158-914c-4fcb0ae2698b@f9941',  // cilantro_hold_2.png - 2份
    '42537f1f-172e-4952-bcee-3b00a789d971@f9941'   // cilantro_hold_3.png - 3份
];

/**
 * 可叠加食材的图片UUID映射配置
 * 格式: { type: { maxCount: 最大添加次数, images: [[左1,中1,右1], [左2,中2,右2]] } }
 */
export const STACKABLE_INGREDIENT_CONFIG: Map<IngredientType, { maxCount: number, images: string[][] }> = new Map([
    // 洋葱 - 可添加2次
    [IngredientType.ONION, {
        maxCount: 2,
        images: [
            ['12b0f09a-1aed-4082-ab66-4bda9f9fe897@f9941', 'd6d0f554-8066-4eb8-8b6f-574101e45e00@f9941', '7b4d2124-dadf-4f99-a3a7-b2d787fbac7e@f9941'],  // 第1次（量少）
            ['4381ac32-fcf7-438e-b8bb-372ee7c36c74@f9941', '8166f217-1bfd-4505-9e30-d2fd74f81589@f9941', 'fbdc720f-9b98-4d4a-b593-21418bc524fa@f9941'],  // 第2次（量多）
        ]
    }],
    // 香菜 - 可添加2次
    [IngredientType.CILANTRO, {
        maxCount: 2,
        images: [
            ['00355f1d-a425-4001-8d00-a9017ddb113e@f9941', '0f1fc99f-86fe-48e0-a079-f463ca840b05@f9941', '0b60da07-880c-4bd4-9e41-216f34d4fd63@f9941'],  // 第1次（量少）
            ['85aba6b0-ce2a-464b-a55b-4fb5782241fb@f9941', '65f9e562-d598-449a-9921-b8cda3fb2dcd@f9941', '51ff3fec-181f-45b4-bc6b-220101a7889e@f9941'],  // 第2次（量多）
        ]
    }],
    // 醋 - 可添加1次
    [IngredientType.VINEGAR, {
        maxCount: 1,
        images: [
            ['90ae706f-55ec-430b-8a2e-315e3c44f469@f9941', '6e7d1426-38c5-4466-a174-cf13e16bad38@f9941', '7bd56073-7fda-4eb7-9f40-c7e827584db2@f9941'],
        ]
    }],
    // 糖 - 可添加1次
    [IngredientType.SUGAR, {
        maxCount: 1,
        images: [
            ['b7347d2a-b3bb-4eb4-9f72-7c8455dd4a52@f9941', 'bd77b16d-2fb2-4646-b199-0d157ad900ab@f9941', 'ee403a04-f3f2-48a8-95be-ea9be73be26e@f9941'],
        ]
    }],
    // 辣椒 - 可添加1次
    [IngredientType.CHILI, {
        maxCount: 1,
        images: [
            ['50492adb-2af4-4e5a-b232-0bd4fcf14a1f@f9941', 'a3485a38-c680-4642-9b7a-a7595b9272cb@f9941', '77207da8-340a-49c3-bb36-8fb647b8b0e8@f9941'],
        ]
    }],
    // 烤肠 - 使用同一张原图，通过旋转区分位置
    [IngredientType.SAUSAGE, {
        maxCount: 1,
        images: [
            ['5ff3699e-2417-4f70-96a5-beb36247d699@f9941', '5ff3699e-2417-4f70-96a5-beb36247d699@f9941', '5ff3699e-2417-4f70-96a5-beb36247d699@f9941'],
        ]
    }],
]);

/**
 * 🗑️ 垃圾桶图片UUID
 */
export const TRASH_IMAGE_UUIDS = {
    CLOSED: '7958469d-0a81-4aa0-8136-3b19ac6bb266@f9941',  // trash_closed.png
    OPEN: 'a8c973d4-5942-4765-90cc-36870831412f@f9941'     // trash_open.png
};

/**
 * 🔪 切割图片UUID映射表
 * cutImageUUIDs[posIdx][cutCount-1] = UUID
 */
export const CUT_IMAGE_UUIDS: string[][] = [
    // pos0 (左侧): cut1, cut2, cut3
    ['a7e2694b-b0ac-4e4c-8671-e923724bc2d3@f9941', '3356ad0f-e991-4d0e-9b68-a375170e869d@f9941', '2f00c1f2-7585-407b-8b5d-b22d6771c343@f9941'],
    // pos1 (中间): cut1, cut2, cut3
    ['c669cc2c-1818-41b9-98b7-ee4611106380@f9941', 'fc4c990d-25ea-4f89-aaa1-815cad318f5c@f9941', '3704d45e-3025-4220-8e07-b035f1e552bc@f9941'],
];

/**
 * 🌭 烤肠图片UUID
 */
export const SAUSAGE_IMAGE_UUID = '5ff3699e-2417-4f70-96a5-beb36247d699@f9941';

/**
 * 🔥 无限使用的食材类型（不消耗库存）
 * 这些是基础操作用的食材，每份都要用，不作为消耗品
 */
export const INFINITE_INGREDIENTS: Set<IngredientType> = new Set([
    IngredientType.GRILLED_NOODLE_SAUCE,  // 酱料
    IngredientType.CHILI,                  // 辣椒
    IngredientType.SUGAR,                  // 白糖
    IngredientType.VINEGAR,                // 醋
    IngredientType.OIL,                    // 食用油
    IngredientType.WATER                   // 水
]);

/**
 * 食材基础配置（emoji和名称）
 */
export const INGREDIENT_CONFIG: Map<IngredientType, { type: IngredientType, emoji: string, name: string }> = new Map([
    [IngredientType.DOUGH, { type: IngredientType.DOUGH, emoji: '🍞', name: '面饼' }],
    [IngredientType.EGG, { type: IngredientType.EGG, emoji: '🥚', name: '鸡蛋' }],
    [IngredientType.CILANTRO, { type: IngredientType.CILANTRO, emoji: '🌿', name: '香菜' }],
    [IngredientType.ONION, { type: IngredientType.ONION, emoji: '🧅', name: '洋葱' }],
    [IngredientType.SAUSAGE, { type: IngredientType.SAUSAGE, emoji: '🌭', name: '香肠' }],
    [IngredientType.CHILI, { type: IngredientType.CHILI, emoji: '🌶️', name: '辣椒' }],
    [IngredientType.SUGAR, { type: IngredientType.SUGAR, emoji: '🍬', name: '白糖' }],
    [IngredientType.VINEGAR, { type: IngredientType.VINEGAR, emoji: '🍾', name: '醋' }],
    [IngredientType.GRILLED_NOODLE_SAUCE, { type: IngredientType.GRILLED_NOODLE_SAUCE, emoji: '🥫', name: '烤冷面酱' }],
    [IngredientType.OIL, { type: IngredientType.OIL, emoji: '🫖', name: '油壶' }],
    [IngredientType.WATER, { type: IngredientType.WATER, emoji: '💧', name: '水壶' }],
    [IngredientType.SPATULA, { type: IngredientType.SPATULA, emoji: '🍴', name: '铲子' }],
]);
