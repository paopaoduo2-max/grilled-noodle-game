/**
 * 游戏UI资源配置
 * 备菜阶段和制作阶段的所有可替换资源
 */

// ==================== 备菜阶段资源 ====================
export const ProcessingAssets = {
    // 背景
    background: 'UI/Processing/bg_processing',
    
    // 砧板
    choppingBoard: {
        idle: 'UI/Processing/chopping_board',
        active: 'UI/Processing/chopping_board_active',
    },
    
    // 刀具动画序列
    knife: {
        idle: 'UI/Processing/knife_idle',
        // 切菜动画帧（从上到下）
        chopFrames: [
            'UI/Processing/knife_chop_01',
            'UI/Processing/knife_chop_02',
            'UI/Processing/knife_chop_03',
            'UI/Processing/knife_chop_04',
        ],
        frameRate: 12,
    },
    
    // 食材状态图片
    ingredients: {
        onion: {
            whole: 'UI/Processing/onion_whole',
            half: 'UI/Processing/onion_half',
            diced: 'UI/Processing/onion_diced',
            minced: 'UI/Processing/onion_minced',
        },
        cilantro: {
            whole: 'UI/Processing/cilantro_whole',
            half: 'UI/Processing/cilantro_half',
            diced: 'UI/Processing/cilantro_diced',
            minced: 'UI/Processing/cilantro_minced',
        },
    },
    
    // 进度条
    progressBar: {
        background: 'UI/Processing/progress_bg',
        fill: 'UI/Processing/progress_fill',
    },
    
    // 完成特效
    completeEffect: [
        'UI/Processing/complete_01',
        'UI/Processing/complete_02',
        'UI/Processing/complete_03',
    ],
};

// ==================== 制作阶段资源 ====================
export const CookingAssets = {
    // 背景
    background: 'UI/Cooking/bg_cooking',
    
    // 工作区域
    workAreas: {
        // 烤盘区域
        grill: {
            background: 'UI/Cooking/grill_bg',
            plate: 'UI/Cooking/grill_plate',
            flame: [
                'UI/Cooking/flame_01',
                'UI/Cooking/flame_02',
                'UI/Cooking/flame_03',
            ],
            flameRate: 8,
        },
        
        // 食材托盘区域
        ingredientTray: {
            background: 'UI/Cooking/tray_bg',
            slot: 'UI/Cooking/tray_slot',
        },
        
        // 调料区域
        condimentArea: {
            background: 'UI/Cooking/condiment_bg',
            slot: 'UI/Cooking/condiment_slot',
        },
        
        // 打包区域
        packingArea: {
            background: 'UI/Cooking/packing_bg',
            box: 'UI/Cooking/packing_box',
        },
        
        // 出餐区域
        servingArea: {
            background: 'UI/Cooking/serving_bg',
            counter: 'UI/Cooking/serving_counter',
        },
    },
    
    // 食材图片
    ingredients: {
        dough: {
            raw: 'UI/Cooking/dough_raw',
            cooking: 'UI/Cooking/dough_cooking',
            cooked: 'UI/Cooking/dough_cooked',
            burnt: 'UI/Cooking/dough_burnt',
        },
        egg: 'UI/Cooking/egg',
        sausage: 'UI/Cooking/sausage',
        onion: 'UI/Cooking/onion_chopped',
        cilantro: 'UI/Cooking/cilantro_chopped',
    },
    
    // 调料图片
    condiments: {
        sauce: 'UI/Cooking/sauce_bottle',
        chili: 'UI/Cooking/chili_jar',
        sugar: 'UI/Cooking/sugar_jar',
        vinegar: 'UI/Cooking/vinegar_bottle',
        oil: 'UI/Cooking/oil_can',
    },
    
    // 动作动画
    animations: {
        // 拿起食材
        pickup: [
            'UI/Cooking/hand_pickup_01',
            'UI/Cooking/hand_pickup_02',
            'UI/Cooking/hand_pickup_03',
        ],
        
        // 放下食材
        putdown: [
            'UI/Cooking/hand_putdown_01',
            'UI/Cooking/hand_putdown_02',
            'UI/Cooking/hand_putdown_03',
        ],
        
        // 翻面动画
        flip: [
            'UI/Cooking/flip_01',
            'UI/Cooking/flip_02',
            'UI/Cooking/flip_03',
            'UI/Cooking/flip_04',
        ],
        
        // 刷酱动画
        brushSauce: [
            'UI/Cooking/brush_01',
            'UI/Cooking/brush_02',
            'UI/Cooking/brush_03',
        ],
        
        // 卷起动画
        roll: [
            'UI/Cooking/roll_01',
            'UI/Cooking/roll_02',
            'UI/Cooking/roll_03',
            'UI/Cooking/roll_04',
        ],
        
        // 切块动画
        cut: [
            'UI/Cooking/cut_01',
            'UI/Cooking/cut_02',
            'UI/Cooking/cut_03',
        ],
        
        // 打包动画
        pack: [
            'UI/Cooking/pack_01',
            'UI/Cooking/pack_02',
            'UI/Cooking/pack_03',
        ],
        
        frameRate: 10,
    },
    
    // UI元素
    ui: {
        orderPanel: 'UI/Cooking/order_panel',
        orderCard: 'UI/Cooking/order_card',
        timerBg: 'UI/Cooking/timer_bg',
        moneyIcon: 'UI/Cooking/money_icon',
    },
};

// ==================== 工作区域布局配置 ====================
export const WorkAreaLayout = {
    // 烤盘区域（中央偏上）
    grill: {
        x: 0,
        y: 50,
        width: 500,
        height: 300,
        slots: 3,  // 最多3个面饼
        slotSpacing: 150,
    },
    
    // 食材托盘（左侧）
    ingredientTray: {
        x: -350,
        y: -100,
        width: 200,
        height: 400,
        columns: 2,
        rows: 3,
    },
    
    // 调料区域（右侧上方）
    condimentArea: {
        x: 350,
        y: 100,
        width: 180,
        height: 250,
        columns: 2,
        rows: 3,
    },
    
    // 打包区域（右侧下方）
    packingArea: {
        x: 350,
        y: -150,
        width: 180,
        height: 150,
    },
    
    // 出餐区域（底部）
    servingArea: {
        x: 0,
        y: -280,
        width: 400,
        height: 100,
    },
    
    // 订单面板（顶部）
    orderPanel: {
        x: 0,
        y: 300,
        width: 600,
        height: 120,
    },
};

/**
 * 资源替换说明：
 * 
 * 1. 所有图片放在 assets/resources/UI/ 目录下
 * 2. 动画序列按编号命名，如 knife_chop_01, knife_chop_02...
 * 3. 建议图片尺寸：
 *    - 背景: 1280x720
 *    - 食材: 64x64 或 128x128
 *    - 动画帧: 保持一致尺寸
 * 4. 格式: PNG（支持透明）
 */
