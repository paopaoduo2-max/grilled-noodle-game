/**
 * 🎲 事件系统配置文件
 * 所有可调整的参数集中在这里，方便后期修改
 */

/**
 * ⏰ 事件触发时间配置
 */
export const EVENT_TRIGGER_TIMES = {
    LUNCH: { hour: 13, minute: 30 },      // 午餐时段
    AFTERNOON: { hour: 15, minute: 30 },  // 下午时段
    DINNER: { hour: 18, minute: 0 },      // 晚餐时段
    NIGHT: { hour: 20, minute: 30 }       // 夜市时段
};

/**
 * 🍳 制作挑战时间倍率
 * 调整此值可以统一放大或缩小所有制作挑战的时限
 * 1.0 = 原始时间, 1.5 = 1.5倍时间, 0.8 = 80%时间
 */
export const PRODUCTION_TIME_MULTIPLIER = 1.0;

/**
 * 🍳 制作挑战难度配置
 */
export const PRODUCTION_CONFIG = {
    // 每份制作的基础时间（秒）- 用于估算是否能完成
    BASE_TIME_PER_ITEM: 8,
    
    // 成功时的额外奖励倍率
    SUCCESS_BONUS_MULTIPLIER: 1.0,
    
    // 失败时的惩罚倍率
    FAIL_PENALTY_MULTIPLIER: 1.0,
    
    // 是否显示制作进度提示
    SHOW_PROGRESS_HINTS: true,
    
    // 时间紧迫警告阈值（秒）
    TIME_WARNING_THRESHOLD: 30,
    TIME_CRITICAL_THRESHOLD: 10
};

/**
 * 🔗 链式事件配置
 */
export const CHAIN_EVENT_CONFIG = {
    // 最大延迟天数
    MAX_DELAY_DAYS: 3,
    
    // 链式事件成功率调整（某些事件有概率失败）
    SUCCESS_RATE_MULTIPLIER: 1.0,
    
    // 是否在触发时显示通知
    SHOW_TRIGGER_NOTIFICATION: true
};

/**
 * 📱 手机讯息UI配置
 */
export const MESSAGE_UI_CONFIG = {
    // 最大保存消息数量
    MAX_MESSAGES: 50,
    
    // 消息项高度
    MESSAGE_ITEM_HEIGHT: 90,
    
    // 消息间距
    MESSAGE_SPACING: 10,
    
    // 是否显示发送人身份
    SHOW_SENDER_ROLE: true,
    
    // 消息内容最大长度
    MAX_CONTENT_LENGTH: 40,
    
    // 新消息提示持续时间（秒）
    NEW_MESSAGE_HIGHLIGHT_DURATION: 3
};

/**
 * 🎯 状态图标UI配置
 */
export const STATUS_ICON_CONFIG = {
    // 图标大小
    ICON_SIZE: 36,
    
    // 图标间距
    ICON_SPACING: 8,
    
    // 最大显示数量
    MAX_ICONS: 8,
    
    // 图标位置（相对于Canvas右上角）
    POSITION_OFFSET_X: -20,
    POSITION_OFFSET_Y: -60,
    
    // 提示框宽度
    TOOLTIP_WIDTH: 180,
    TOOLTIP_HEIGHT: 80,
    
    // 是否显示剩余天数
    SHOW_REMAINING_DAYS: true,
    
    // 效果类型颜色（RGBA）
    COLORS: {
        BUFF: { r: 100, g: 255, b: 100, a: 255 },
        DEBUFF: { r: 255, g: 100, b: 100, a: 255 },
        PENDING: { r: 255, g: 200, b: 100, a: 255 }
    }
};

/**
 * 🎲 事件弹窗UI配置
 */
export const EVENT_POPUP_CONFIG = {
    // 弹窗尺寸
    WIDTH: 400,
    HEIGHT: 280,
    
    // 标题字体大小
    TITLE_FONT_SIZE: 22,
    
    // 描述字体大小
    DESCRIPTION_FONT_SIZE: 16,
    
    // 按钮字体大小
    BUTTON_FONT_SIZE: 16,
    
    // 按钮尺寸
    BUTTON_WIDTH: 160,
    BUTTON_HEIGHT: 45,
    
    // 动画持续时间（秒）
    ANIMATION_DURATION: 0.3,
    
    // 背景颜色
    BG_COLOR: { r: 40, g: 40, b: 60, a: 240 },
    
    // 边框颜色
    BORDER_COLOR: { r: 255, g: 200, b: 100, a: 255 }
};

/**
 * 💰 效果数值配置
 * 可以在这里统一调整所有效果的数值倍率
 */
export const EFFECT_MULTIPLIERS = {
    // 金币效果倍率
    MONEY: 1.0,
    
    // 热度效果倍率
    HEAT: 1.0,
    
    // 客流效果倍率
    CUSTOMER_RATE: 1.0
};

/**
 * 🎨 UI文字配置
 */
export const UI_TEXTS = {
    // 制作挑战
    PRODUCTION_CHALLENGE_TITLE: '🍳 制作挑战',
    PRODUCTION_PROGRESS_FORMAT: '进度: {current}/{target}',
    PRODUCTION_TIMER_FORMAT: '⏱️ {time}',
    PRODUCTION_SUCCESS: '✅ 挑战成功!',
    PRODUCTION_FAIL: '❌ 时间到!',
    
    // 状态图标
    STATUS_BUFF: '增益效果',
    STATUS_DEBUFF: '减益效果',
    STATUS_PENDING: '待结算',
    STATUS_REMAINING_DAYS: '剩余: {days}天',
    
    // 手机讯息
    MESSAGE_STATUS_ACTIVE: '● 进行中',
    MESSAGE_STATUS_PENDING: '⏳ 待结算',
    MESSAGE_STATUS_COMPLETED: '✓ 已完成',
    
    // 事件弹窗
    EVENT_OPTION_A_DEFAULT: '选项A',
    EVENT_OPTION_B_DEFAULT: '选项B'
};

/**
 * 🔊 音效配置（资源路径）
 */
export const SOUND_CONFIG = {
    // 事件触发音效
    EVENT_TRIGGER: 'sounds/event_trigger',
    
    // 选择按钮音效
    BUTTON_CLICK: 'sounds/button_click',
    
    // 制作完成音效
    PRODUCTION_COMPLETE: 'sounds/production_complete',
    
    // 制作失败音效
    PRODUCTION_FAIL: 'sounds/production_fail',
    
    // 链式事件触发音效
    CHAIN_TRIGGER: 'sounds/chain_trigger',
    
    // 新消息音效
    NEW_MESSAGE: 'sounds/new_message'
};

/**
 * 🖼️ 图片资源配置（资源路径）
 */
export const IMAGE_CONFIG = {
    // 事件弹窗背景
    EVENT_POPUP_BG: 'textures/event_popup_bg',
    
    // 按钮背景
    BUTTON_BG: 'textures/button_bg',
    
    // 状态图标背景
    STATUS_ICON_BG: 'textures/status_icon_bg',
    
    // 消息项背景
    MESSAGE_ITEM_BG: 'textures/message_item_bg',
    
    // 默认发送人头像
    DEFAULT_SENDER_AVATAR: 'textures/default_avatar'
};

/**
 * 获取应用倍率后的制作时限
 */
export function getAdjustedProductionTime(originalTime: number): number {
    return Math.floor(originalTime * PRODUCTION_TIME_MULTIPLIER);
}

/**
 * 获取应用倍率后的金币效果
 */
export function getAdjustedMoneyEffect(originalMoney: number): number {
    return Math.floor(originalMoney * EFFECT_MULTIPLIERS.MONEY);
}

/**
 * 获取应用倍率后的热度效果
 */
export function getAdjustedHeatEffect(originalHeat: number): number {
    return Math.floor(originalHeat * EFFECT_MULTIPLIERS.HEAT);
}

/**
 * 获取应用倍率后的客流效果
 */
export function getAdjustedCustomerRate(originalRate: number): number {
    // 将倍率应用于变化量，而不是总倍率
    const change = originalRate - 1;
    return 1 + change * EFFECT_MULTIPLIERS.CUSTOMER_RATE;
}

/**
 * 格式化时间显示
 */
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * 格式化文本模板
 */
export function formatText(template: string, params: Record<string, string | number>): string {
    let result = template;
    for (const key in params) {
        result = result.replace(`{${key}}`, String(params[key]));
    }
    return result;
}
