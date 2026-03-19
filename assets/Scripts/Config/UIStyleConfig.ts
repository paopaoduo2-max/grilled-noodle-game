import { Color, Size, Vec2 } from 'cc';

/**
 * UI 统一风格配置
 * 烤冷面大师 - 温暖美食风格
 * 
 * 设计理念：
 * - 主色调：暖橙色系（代表美食、温暖）
 * - 辅助色：米白色、深棕色
 * - 风格：圆角卡片、柔和阴影、简洁图标
 */

// ==================== 颜色配置 ====================
export const UIColors = {
    // 主题色
    primary: new Color(255, 140, 60, 255),      // 暖橙色 - 主按钮
    primaryDark: new Color(220, 100, 30, 255),  // 深橙色 - 按钮按下
    primaryLight: new Color(255, 180, 120, 255), // 浅橙色 - 高亮
    
    // 辅助色
    secondary: new Color(100, 180, 100, 255),   // 绿色 - 确认/成功
    secondaryDark: new Color(70, 140, 70, 255),
    
    danger: new Color(220, 80, 80, 255),        // 红色 - 警告/取消
    dangerDark: new Color(180, 50, 50, 255),
    
    // 背景色 - 美食主题渐变
    bgDark: new Color(35, 25, 20, 255),         // 深咖啡色背景
    bgMedium: new Color(70, 55, 45, 255),       // 中棕色面板
    bgLight: new Color(250, 240, 230, 255),     // 米白色卡片
    bgOverlay: new Color(0, 0, 0, 180),         // 半透明遮罩
    
    // 渐变背景色
    gradientTop: new Color(255, 200, 150, 255),    // 暖橙渐变顶部
    gradientBottom: new Color(200, 120, 80, 255),  // 深橙渐变底部
    
    // 文字色
    textLight: new Color(255, 255, 255, 255),   // 白色文字
    textDark: new Color(60, 45, 35, 255),       // 深棕文字
    textGold: new Color(255, 200, 50, 255),     // 金色文字（标题）
    textGray: new Color(150, 140, 130, 255),    // 灰色文字（说明）
    
    // 特殊色
    gold: new Color(255, 215, 0, 255),          // 金币
    money: new Color(100, 200, 100, 255),       // 金钱绿
    star: new Color(255, 220, 50, 255),         // 星星黄
};

// ==================== 尺寸配置 ====================
export const UISizes = {
    // 按钮尺寸
    buttonLarge: new Size(280, 70),
    buttonMedium: new Size(200, 55),
    buttonSmall: new Size(140, 45),
    buttonIcon: new Size(60, 60),
    
    // 面板尺寸
    panelLarge: new Size(600, 500),
    panelMedium: new Size(450, 380),
    panelSmall: new Size(320, 260),
    
    // 卡片尺寸
    cardLarge: new Size(180, 200),
    cardMedium: new Size(140, 160),
    cardSmall: new Size(100, 120),
    
    // 圆角
    radiusLarge: 20,
    radiusMedium: 12,
    radiusSmall: 8,
    
    // 间距
    spacingLarge: 24,
    spacingMedium: 16,
    spacingSmall: 8,
};

// ==================== 字体配置 ====================
export const UIFonts = {
    // 字号
    titleLarge: 48,
    titleMedium: 36,
    titleSmall: 28,
    
    bodyLarge: 24,
    bodyMedium: 20,
    bodySmall: 16,
    
    captionLarge: 14,
    captionSmall: 12,
    
    // 行高
    lineHeightNormal: 1.4,
    lineHeightTight: 1.2,
};

// ==================== 动画配置 ====================
export const UIAnimations = {
    // 时长（秒）
    durationFast: 0.15,
    durationNormal: 0.25,
    durationSlow: 0.4,
    
    // 缩放
    scalePress: 0.95,
    scaleHover: 1.05,
    scalePop: 1.1,
};

// ==================== 资源路径配置 ====================
export const UIAssetPaths = {
    // 背景
    backgrounds: {
        main: 'UI/Backgrounds/bg_main',
        shop: 'UI/Backgrounds/bg_shop',
        cooking: 'UI/Backgrounds/bg_cooking',
        processing: 'UI/Backgrounds/bg_processing',
        result: 'UI/Backgrounds/bg_result',
    },
    
    // 按钮
    buttons: {
        primary: 'UI/Buttons/btn_primary',
        secondary: 'UI/Buttons/btn_secondary',
        danger: 'UI/Buttons/btn_danger',
        icon: 'UI/Buttons/btn_icon',
    },
    
    // 面板
    panels: {
        default: 'UI/Panels/panel_default',
        popup: 'UI/Panels/panel_popup',
        card: 'UI/Panels/panel_card',
    },
    
    // 图标
    icons: {
        settings: 'UI/Icons/icon_settings',
        close: 'UI/Icons/icon_close',
        coin: 'UI/Icons/icon_coin',
        star: 'UI/Icons/icon_star',
        play: 'UI/Icons/icon_play',
        back: 'UI/Icons/icon_back',
    },
    
    // 通用
    common: {
        divider: 'UI/Common/divider',
        shadow: 'UI/Common/shadow',
    },
};

// ==================== 主题预设 ====================
export const UITheme = {
    // 主界面
    mainMenu: {
        titleColor: UIColors.textGold,
        titleSize: UIFonts.titleLarge,
        buttonColor: UIColors.primary,
        bgColor: UIColors.bgDark,
    },
    
    // 商店
    shop: {
        headerColor: UIColors.primary,
        cardBgColor: UIColors.bgLight,
        priceColor: UIColors.money,
    },
    
    // 烹饪
    cooking: {
        timerColor: UIColors.danger,
        progressColor: UIColors.secondary,
        orderBgColor: UIColors.bgMedium,
    },
    
    // 结算
    result: {
        successColor: UIColors.secondary,
        failColor: UIColors.danger,
        starColor: UIColors.star,
    },
};

/**
 * 获取按钮样式
 */
export function getButtonStyle(type: 'primary' | 'secondary' | 'danger' | 'ghost') {
    switch (type) {
        case 'primary':
            return {
                bgColor: UIColors.primary,
                pressColor: UIColors.primaryDark,
                textColor: UIColors.textLight,
            };
        case 'secondary':
            return {
                bgColor: UIColors.secondary,
                pressColor: UIColors.secondaryDark,
                textColor: UIColors.textLight,
            };
        case 'danger':
            return {
                bgColor: UIColors.danger,
                pressColor: UIColors.dangerDark,
                textColor: UIColors.textLight,
            };
        case 'ghost':
            return {
                bgColor: new Color(0, 0, 0, 0),
                pressColor: new Color(255, 255, 255, 30),
                textColor: UIColors.textLight,
            };
    }
}
