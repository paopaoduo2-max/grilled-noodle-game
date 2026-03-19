/**
 * 音频配置管理
 * 统一管理所有音效和背景音乐的路径配置
 */
export class AudioConfig {
    // ==================== 背景音乐 ====================
    static readonly BGM = {
        /** 主菜单背景音乐 */
        MAIN_MENU: 'Audio/BGM/main_menu',
        /** 准备阶段背景音乐 */
        PREPARE: 'Audio/BGM/prepare',
        /** 烹饪阶段背景音乐 */
        COOKING: 'Audio/BGM/cooking',
        /** 结算界面背景音乐 */
        RESULT: 'Audio/BGM/result',
        /** 教程背景音乐 */
        TUTORIAL: 'Audio/BGM/tutorial',
    };

    // ==================== UI音效 ====================
    static readonly SFX_UI = {
        /** 按钮点击 */
        BUTTON_CLICK: 'Audio/SFX/UI/button_click',
        /** 按钮悬停 */
        BUTTON_HOVER: 'Audio/SFX/UI/button_hover',
        /** 面板打开 */
        PANEL_OPEN: 'Audio/SFX/UI/panel_open',
        /** 面板关闭 */
        PANEL_CLOSE: 'Audio/SFX/UI/panel_close',
        /** 购买成功 */
        PURCHASE_SUCCESS: 'Audio/SFX/UI/purchase_success',
        /** 购买失败 */
        PURCHASE_FAIL: 'Audio/SFX/UI/purchase_fail',
        /** 关卡解锁 */
        LEVEL_UNLOCK: 'Audio/SFX/UI/level_unlock',
    };

    // ==================== 烹饪音效 ====================
    static readonly SFX_COOKING = {
        /** 放置食材 */
        PLACE_INGREDIENT: 'Audio/SFX/Cooking/place_ingredient',
        /** 打鸡蛋 */
        CRACK_EGG: 'Audio/SFX/Cooking/crack_egg',
        /** 煎炸声 */
        SIZZLE: 'Audio/SFX/Cooking/sizzle',
        /** 翻面 */
        FLIP: 'Audio/SFX/Cooking/flip',
        /** 切菜 */
        CHOP: 'Audio/SFX/Cooking/chop',
        /** 刷酱 */
        BRUSH_SAUCE: 'Audio/SFX/Cooking/brush_sauce',
        /** 撒调料 */
        SPRINKLE: 'Audio/SFX/Cooking/sprinkle',
        /** 上菜 */
        SERVE: 'Audio/SFX/Cooking/serve',
        /** 订单完成 */
        ORDER_COMPLETE: 'Audio/SFX/Cooking/order_complete',
        /** 订单超时 */
        ORDER_TIMEOUT: 'Audio/SFX/Cooking/order_timeout',
        /** 客人满意 */
        CUSTOMER_HAPPY: 'Audio/SFX/Cooking/customer_happy',
        /** 客人不满 */
        CUSTOMER_ANGRY: 'Audio/SFX/Cooking/customer_angry',
        /** 倒计时警告 */
        TIMER_WARNING: 'Audio/SFX/Cooking/timer_warning',
        /** 烧焦警告 */
        BURN_WARNING: 'Audio/SFX/Cooking/burn_warning',
    };

    // ==================== 音量默认值 ====================
    static readonly DEFAULT_VOLUME = {
        /** 背景音乐音量 */
        BGM: 0.5,
        /** 音效音量 */
        SFX: 0.8,
        /** 主音量 */
        MASTER: 1.0,
    };
}
