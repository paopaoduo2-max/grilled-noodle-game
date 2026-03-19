/**
 * CookingScene UI 资源配置
 * 定义所有需要加载的图片资源路径和规格
 */

import { Color, Size } from 'cc';

/**
 * 资源配置接口
 */
export interface AssetConfig {
    path: string;           // 资源路径 (相对于 resources)
    size: Size;             // 尺寸
    placeholderColor: Color; // 临时占位颜色
    description: string;    // 说明
}

/**
 * CookingScene 所有 UI 资源配置
 */
export const COOKING_UI_ASSETS = {
    
    // ==================== 背景 ====================
    backgrounds: {
        main: {
            path: 'UI/Cooking/Backgrounds/bg_cooking_main',
            size: new Size(1920, 1080),
            placeholderColor: new Color(50, 45, 40, 255),
            description: '制作场景主背景'
        } as AssetConfig
    },
    
    // ==================== 工作区域 ====================
    areas: {
        grill: {
            path: 'UI/Cooking/Areas/area_grill',
            size: new Size(1170, 630),
            placeholderColor: new Color(70, 50, 40, 240),
            description: '烤盘区域背景'
        } as AssetConfig,
        ingredients: {
            path: 'UI/Cooking/Areas/area_ingredients',
            size: new Size(300, 570),
            placeholderColor: new Color(50, 70, 50, 240),
            description: '食材区域背景'
        } as AssetConfig,
        condiments: {
            path: 'UI/Cooking/Areas/area_condiments',
            size: new Size(300, 330),
            placeholderColor: new Color(60, 50, 70, 240),
            description: '调料区域背景'
        } as AssetConfig,
        packing: {
            path: 'UI/Cooking/Areas/area_packing',
            size: new Size(300, 270),
            placeholderColor: new Color(60, 55, 45, 240),
            description: '打包区域背景'
        } as AssetConfig,
        customer: {
            path: 'UI/Cooking/Areas/area_customer',
            size: new Size(900, 180),
            placeholderColor: new Color(50, 50, 60, 240),
            description: '顾客等待区背景'
        } as AssetConfig,
        order: {
            path: 'UI/Cooking/Areas/area_order',
            size: new Size(975, 150),
            placeholderColor: new Color(55, 45, 40, 240),
            description: '订单区域背景'
        } as AssetConfig
    },
    
    // ==================== 烤盘/铁板 ====================
    grill: {
        plate: {
            path: 'UI/Cooking/Grill/grill_plate',
            size: new Size(195, 195),
            placeholderColor: new Color(80, 80, 90, 255),
            description: '烤盘'
        } as AssetConfig,
        slotEmpty: {
            path: 'UI/Cooking/Grill/grill_slot_empty',
            size: new Size(195, 195),
            placeholderColor: new Color(60, 60, 70, 200),
            description: '空烤位'
        } as AssetConfig,
        flame: {
            path: 'UI/Cooking/Grill/grill_flame',
            size: new Size(750, 90),
            placeholderColor: new Color(255, 120, 50, 200),
            description: '火焰效果'
        } as AssetConfig,
        heatGlow: {
            path: 'UI/Cooking/Grill/grill_heat_glow',
            size: new Size(780, 420),
            placeholderColor: new Color(255, 100, 50, 50),
            description: '热力发光'
        } as AssetConfig
    },
    
    // ==================== 食材按钮 ====================
    buttons: {
        dough: {
            path: 'UI/Cooking/Buttons/btn_dough',
            size: new Size(105, 105),
            placeholderColor: new Color(230, 200, 150, 255),
            description: '面饼按钮'
        } as AssetConfig,
        egg: {
            path: 'UI/Cooking/Buttons/btn_egg',
            size: new Size(105, 105),
            placeholderColor: new Color(255, 240, 200, 255),
            description: '鸡蛋按钮'
        } as AssetConfig,
        oil: {
            path: 'UI/Cooking/Buttons/btn_oil',
            size: new Size(105, 105),
            placeholderColor: new Color(200, 180, 100, 255),
            description: '油壶按钮'
        } as AssetConfig,
        sausage: {
            path: 'UI/Cooking/Buttons/btn_sausage',
            size: new Size(105, 105),
            placeholderColor: new Color(200, 80, 80, 255),
            description: '香肠按钮'
        } as AssetConfig,
        onion: {
            path: 'UI/Cooking/Buttons/btn_onion',
            size: new Size(105, 105),
            placeholderColor: new Color(220, 200, 220, 255),
            description: '洋葱按钮'
        } as AssetConfig,
        cilantro: {
            path: 'UI/Cooking/Buttons/btn_cilantro',
            size: new Size(105, 105),
            placeholderColor: new Color(100, 180, 100, 255),
            description: '香菜按钮'
        } as AssetConfig,
        sauce: {
            path: 'UI/Cooking/Buttons/btn_sauce',
            size: new Size(105, 105),
            placeholderColor: new Color(139, 69, 19, 255),
            description: '酱料按钮'
        } as AssetConfig,
        chili: {
            path: 'UI/Cooking/Buttons/btn_chili',
            size: new Size(105, 105),
            placeholderColor: new Color(220, 50, 50, 255),
            description: '辣椒按钮'
        } as AssetConfig,
        sugar: {
            path: 'UI/Cooking/Buttons/btn_sugar',
            size: new Size(105, 105),
            placeholderColor: new Color(255, 255, 255, 255),
            description: '白糖按钮'
        } as AssetConfig,
        vinegar: {
            path: 'UI/Cooking/Buttons/btn_vinegar',
            size: new Size(105, 105),
            placeholderColor: new Color(100, 80, 60, 255),
            description: '醋按钮'
        } as AssetConfig
    },
    
    // ==================== 食物状态 ====================
    food: {
        doughRaw: {
            path: 'UI/Cooking/Food/food_dough_raw',
            size: new Size(150, 150),
            placeholderColor: new Color(230, 200, 150, 255),
            description: '生面饼'
        } as AssetConfig,
        doughOiled: {
            path: 'UI/Cooking/Food/food_dough_oiled',
            size: new Size(150, 150),
            placeholderColor: new Color(240, 210, 160, 255),
            description: '已喷油面饼'
        } as AssetConfig,
        doughEgg: {
            path: 'UI/Cooking/Food/food_dough_egg',
            size: new Size(150, 150),
            placeholderColor: new Color(255, 230, 150, 255),
            description: '加蛋面饼'
        } as AssetConfig,
        doughFlipped: {
            path: 'UI/Cooking/Food/food_dough_flipped',
            size: new Size(150, 150),
            placeholderColor: new Color(200, 160, 100, 255),
            description: '翻面后'
        } as AssetConfig,
        doughRolled: {
            path: 'UI/Cooking/Food/food_dough_rolled',
            size: new Size(150, 150),
            placeholderColor: new Color(180, 140, 90, 255),
            description: '卷起后'
        } as AssetConfig,
        doughCut: {
            path: 'UI/Cooking/Food/food_dough_cut',
            size: new Size(150, 150),
            placeholderColor: new Color(160, 120, 80, 255),
            description: '切块后'
        } as AssetConfig,
        doughDone: {
            path: 'UI/Cooking/Food/food_dough_done',
            size: new Size(150, 150),
            placeholderColor: new Color(200, 150, 100, 255),
            description: '完成品'
        } as AssetConfig,
        doughBurnt: {
            path: 'UI/Cooking/Food/food_dough_burnt',
            size: new Size(150, 150),
            placeholderColor: new Color(50, 40, 30, 255),
            description: '烧焦'
        } as AssetConfig
    },
    
    // ==================== 功能元素 ====================
    elements: {
        trashBin: {
            path: 'UI/Cooking/Elements/trash_bin',
            size: new Size(120, 150),
            placeholderColor: new Color(100, 100, 100, 255),
            description: '垃圾桶'
        } as AssetConfig,
        packingBox: {
            path: 'UI/Cooking/Elements/packing_box',
            size: new Size(120, 120),
            placeholderColor: new Color(180, 150, 100, 255),
            description: '打包盒'
        } as AssetConfig,
        packingBoxFull: {
            path: 'UI/Cooking/Elements/packing_box_full',
            size: new Size(120, 120),
            placeholderColor: new Color(200, 170, 120, 255),
            description: '装满的打包盒'
        } as AssetConfig,
        serveButton: {
            path: 'UI/Cooking/Elements/serve_button',
            size: new Size(180, 75),
            placeholderColor: new Color(100, 180, 100, 255),
            description: '出餐按钮'
        } as AssetConfig,
        phoneIcon: {
            path: 'UI/Cooking/Elements/phone_icon',
            size: new Size(75, 120),
            placeholderColor: new Color(80, 80, 80, 255),
            description: '手机图标'
        } as AssetConfig,
        moneyIcon: {
            path: 'UI/Cooking/Elements/money_icon',
            size: new Size(60, 60),
            placeholderColor: new Color(255, 215, 0, 255),
            description: '金币图标'
        } as AssetConfig
    },
    
    // ==================== UI装饰 ====================
    decorations: {
        borderCorner: {
            path: 'UI/Cooking/Decorations/border_corner',
            size: new Size(30, 30),
            placeholderColor: new Color(255, 200, 100, 255),
            description: '边角装饰'
        } as AssetConfig,
        borderLineH: {
            path: 'UI/Cooking/Decorations/border_line_h',
            size: new Size(150, 6),
            placeholderColor: new Color(255, 200, 100, 255),
            description: '横向边框'
        } as AssetConfig,
        borderLineV: {
            path: 'UI/Cooking/Decorations/border_line_v',
            size: new Size(6, 150),
            placeholderColor: new Color(255, 200, 100, 255),
            description: '竖向边框'
        } as AssetConfig,
        panelBg: {
            path: 'UI/Cooking/Decorations/panel_bg',
            size: new Size(450, 300),
            placeholderColor: new Color(40, 35, 30, 240),
            description: '面板背景'
        } as AssetConfig,
        buttonBg: {
            path: 'UI/Cooking/Decorations/button_bg',
            size: new Size(150, 75),
            placeholderColor: new Color(80, 60, 50, 255),
            description: '按钮背景'
        } as AssetConfig
    }
};

/**
 * 获取所有资源配置的扁平列表
 */
export function getAllAssetConfigs(): AssetConfig[] {
    const configs: AssetConfig[] = [];
    
    function extractConfigs(obj: any) {
        for (const key in obj) {
            const value = obj[key];
            if (value && typeof value === 'object') {
                if ('path' in value && 'size' in value) {
                    configs.push(value as AssetConfig);
                } else {
                    extractConfigs(value);
                }
            }
        }
    }
    
    extractConfigs(COOKING_UI_ASSETS);
    return configs;
}

/**
 * 打印所有资源清单
 */
export function printAssetList(): void {
    console.log('=== CookingScene 资源清单 ===');
    const configs = getAllAssetConfigs();
    configs.forEach((config, index) => {
        console.log(`${index + 1}. ${config.path}`);
        console.log(`   尺寸: ${config.size.width}x${config.size.height}`);
        console.log(`   说明: ${config.description}`);
    });
    console.log(`=== 共 ${configs.length} 个资源 ===`);
}
