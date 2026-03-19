/**
 * UI 配置管理
 * 统一管理所有 UI 资源路径和样式配置
 */
export class UIConfig {
    // ==================== UI 图片资源路径 ====================
    static readonly IMAGES = {
        // 按钮
        BUTTONS: {
            PRIMARY: 'Images/UI/Buttons/btn_primary',
            SECONDARY: 'Images/UI/Buttons/btn_secondary',
            CLOSE: 'Images/UI/Buttons/btn_close',
            BACK: 'Images/UI/Buttons/btn_back',
            START: 'Images/UI/Buttons/btn_start',
            SETTINGS: 'Images/UI/Buttons/btn_settings',
        },
        // 面板
        PANELS: {
            MAIN: 'Images/UI/Panels/panel_main',
            POPUP: 'Images/UI/Panels/panel_popup',
            ORDER: 'Images/UI/Panels/panel_order',
            RESULT: 'Images/UI/Panels/panel_result',
        },
        // 图标
        ICONS: {
            COIN: 'Images/UI/Icons/icon_coin',
            STAR: 'Images/UI/Icons/icon_star',
            TIMER: 'Images/UI/Icons/icon_timer',
            HEART: 'Images/UI/Icons/icon_heart',
            LOCK: 'Images/UI/Icons/icon_lock',
            CHECK: 'Images/UI/Icons/icon_check',
        },
    };

    // ==================== 背景图片 ====================
    static readonly BACKGROUNDS = {
        MAIN_MENU: 'Images/Backgrounds/bg_main_menu',
        KITCHEN: 'Images/Backgrounds/bg_kitchen',
        STREET: 'Images/Backgrounds/bg_street',
        RESULT: 'Images/Backgrounds/bg_result',
    };

    // ==================== 颜色配置 ====================
    static readonly COLORS = {
        // 主题色
        PRIMARY: '#FF6B35',      // 橙色（食物主题）
        SECONDARY: '#4ECDC4',    // 青色
        ACCENT: '#FFE66D',       // 黄色
        
        // 功能色
        SUCCESS: '#2ECC71',      // 成功绿
        WARNING: '#F39C12',      // 警告黄
        DANGER: '#E74C3C',       // 危险红
        INFO: '#3498DB',         // 信息蓝
        
        // 中性色
        TEXT_PRIMARY: '#2C3E50',
        TEXT_SECONDARY: '#7F8C8D',
        BACKGROUND: '#F5F5F5',
        CARD_BG: '#FFFFFF',
        
        // 评分星级颜色
        STAR_GOLD: '#FFD700',
        STAR_EMPTY: '#CCCCCC',
    };

    // ==================== 字体大小 ====================
    static readonly FONT_SIZE = {
        TITLE: 48,
        HEADING: 36,
        SUBHEADING: 28,
        BODY: 24,
        SMALL: 18,
        TINY: 14,
    };

    // ==================== 动画时长（秒） ====================
    static readonly ANIMATION = {
        FAST: 0.15,
        NORMAL: 0.3,
        SLOW: 0.5,
        PANEL_SHOW: 0.25,
        PANEL_HIDE: 0.2,
        BUTTON_PRESS: 0.1,
    };

    // ==================== 层级配置 ====================
    static readonly Z_INDEX = {
        BACKGROUND: 0,
        GAME_OBJECTS: 100,
        UI_NORMAL: 200,
        UI_POPUP: 300,
        UI_TOAST: 400,
        UI_LOADING: 500,
    };
}
