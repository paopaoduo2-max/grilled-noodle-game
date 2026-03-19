/**
 * UI 资源配置
 * 所有可替换的UI资源路径都在这里配置
 * 后期只需修改这个文件即可替换所有UI资源
 */

// ==================== 主菜单资源 ====================
export const MainMenuAssets = {
    // 背景配置（支持渐变、静态图、动态图）
    background: {
        // 静态背景图路径（放在 resources 文件夹下）
        static: 'UI/MainMenu/BG/bg_mainmenu_split',
        
        // 动态背景帧序列（用于帧动画）
        frames: [
            'UI/Backgrounds/main_bg_01',
            'UI/Backgrounds/main_bg_02',
            'UI/Backgrounds/main_bg_03',
            'UI/Backgrounds/main_bg_04',
        ],
        
        // 动画帧率
        frameRate: 8,
        
        // 是否使用动态背景
        useAnimation: false,
        
        // 渐变主题：'warm'(暖色) | 'cool'(冷色) | 'sunset'(日落) | 'forest'(森林)
        gradientTheme: 'warm',
    },
    
    // 标题图片（可选，如果有艺术字标题）
    title: {
        image: 'UI/MainMenu/title_logo',
        useImage: false,  // false = 使用文字标题
    },
    
    // 按钮背景
    buttons: {
        primary: 'UI/Buttons/btn_primary',      // 主按钮（开始游戏）
        secondary: 'UI/Buttons/btn_secondary',  // 次按钮（继续游戏）
        normal: 'UI/Buttons/btn_normal',        // 普通按钮
        icon: 'UI/Buttons/btn_icon',            // 图标按钮
    },
    
    // 装饰元素
    decorations: {
        topBorder: 'UI/Decorations/border_top',
        bottomBorder: 'UI/Decorations/border_bottom',
        logo: 'UI/Decorations/game_logo',
    },
};

// ==================== 商店界面资源 ====================
export const ShopAssets = {
    background: {
        static: 'UI/Backgrounds/shop_bg',
        useAnimation: false,
    },
    
    // 商品卡片
    itemCard: 'UI/Shop/item_card',
    itemCardSelected: 'UI/Shop/item_card_selected',
    
    // 购物车
    cartPanel: 'UI/Shop/cart_panel',
    cartButton: 'UI/Shop/cart_button',
    
    // 分类标签
    categoryTab: 'UI/Shop/category_tab',
    categoryTabActive: 'UI/Shop/category_tab_active',
};

// ==================== 加工界面资源 ====================
export const ProcessingAssets = {
    background: {
        static: 'UI/Backgrounds/processing_bg',
        useAnimation: false,
    },
    
    // 砧板
    choppingBoard: 'UI/Processing/chopping_board',
    
    // 刀具
    knife: 'UI/Processing/knife',
    
    // 进度条
    progressBar: 'UI/Processing/progress_bar',
    progressBarFill: 'UI/Processing/progress_bar_fill',
};

// ==================== 烹饪界面资源 ====================
export const CookingAssets = {
    background: {
        static: 'UI/Backgrounds/cooking_bg',
        useAnimation: false,
    },
    
    // 烤盘
    grill: 'UI/Cooking/grill',
    
    // 订单面板
    orderPanel: 'UI/Cooking/order_panel',
    orderCard: 'UI/Cooking/order_card',
    
    // 食材托盘
    ingredientTray: 'UI/Cooking/ingredient_tray',
};

// ==================== 结算界面资源 ====================
export const ResultAssets = {
    background: {
        static: 'UI/Backgrounds/result_bg',
        useAnimation: false,
    },
    
    // 结算面板
    resultPanel: 'UI/Result/result_panel',
    
    // 星星
    starEmpty: 'UI/Result/star_empty',
    starFull: 'UI/Result/star_full',
    
    // 按钮
    nextButton: 'UI/Result/btn_next',
    retryButton: 'UI/Result/btn_retry',
};

// ==================== 通用资源 ====================
export const CommonAssets = {
    // 面板背景
    panelBg: 'UI/Common/panel_bg',
    panelBgDark: 'UI/Common/panel_bg_dark',
    
    // 按钮
    buttonClose: 'UI/Common/btn_close',
    buttonBack: 'UI/Common/btn_back',
    
    // 图标
    iconCoin: 'UI/Icons/icon_coin',
    iconStar: 'UI/Icons/icon_star',
    iconHeart: 'UI/Icons/icon_heart',
    iconTimer: 'UI/Icons/icon_timer',
    iconSettings: 'UI/Icons/icon_settings',
    
    // 分隔线
    divider: 'UI/Common/divider',
    
    // 遮罩
    overlay: 'UI/Common/overlay',
};

/**
 * 资源替换说明：
 * 
 * 1. 所有图片资源放在 assets/resources/UI/ 目录下
 * 2. 图片格式建议使用 PNG（支持透明）
 * 3. 背景图建议尺寸：1280x720 或 1920x1080
 * 4. 按钮建议使用 9-slice 切图以支持不同尺寸
 * 5. 动态背景：将帧序列图片放入对应文件夹，修改 frames 数组
 * 
 * 替换步骤：
 * 1. 将新图片放入对应文件夹
 * 2. 修改此配置文件中的路径
 * 3. 重新运行游戏即可生效
 */
