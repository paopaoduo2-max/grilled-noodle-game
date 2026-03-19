/**
 * 🎲 随机事件系统 V2 - 支持制作类事件和链式事件
 */

// 时段类型
export type TimeSlot = 'lunch' | 'afternoon' | 'dinner' | 'night';

// 事件类型
export type EventType = 'normal' | 'production' | 'chain';

// 事件选项效果
export interface EventEffect {
    money?: number;              // 金币变化
    heat?: number;               // 热度变化
    customerRate?: number;       // 明天客流倍率 (1.5 = +50%)
    customerRateDays?: number;   // 客流效果持续天数
    successRate?: number;        // 成功概率 (0-100)
    failMoney?: number;          // 失败时金币
    failHeat?: number;           // 失败时热度
}

// 制作挑战配置
export interface ProductionChallenge {
    targetCount: number;         // 需要制作的份数
    timeLimit: number;           // 时限(秒)
    successReward: EventEffect;  // 成功奖励
    failPenalty: EventEffect;    // 失败惩罚
}

// 链式事件配置
export interface ChainEvent {
    triggerDays: number;         // 几天后触发
    effect: EventEffect;         // 效果
    message: string;             // 触发时的消息
}

// 交付需求配置
export interface DeliveryRequirement {
    count: number;               // 需要交付的份数
    description: string;         // 交付说明
    timeLimit?: number;          // 时限(秒)，可选
}

// 事件选项
export interface EventOptionV2 {
    text: string;                // 选项文字
    emoji: string;               // 选项emoji
    effect: EventEffect;         // 选项效果
    production?: ProductionChallenge;  // 制作挑战(如果有)
    chain?: ChainEvent;          // 链式事件(如果有)
    delivery?: DeliveryRequirement;    // 交付需求(如果有)：选择后需制作食物交付才能完成
}

// 事件发起人
export interface EventSender {
    name: string;                // 名字
    icon: string;                // 图标
    role: string;                // 身份
}

// 随机事件定义 V2
export interface RandomEventV2 {
    id: string;
    name: string;
    description: string;
    icon: string;
    timeSlot: TimeSlot;
    type: EventType;
    sender: EventSender;
    optionA: EventOptionV2;
    optionB: EventOptionV2;
}

// 事件消息记录
export interface EventMessage {
    eventId: string;
    sender: EventSender;
    day: number;
    time: string;
    content: string;
    status: 'active' | 'pending' | 'completed';
    effectSummary?: string;
}

// 活跃效果
export interface ActiveEffect {
    id: string;
    icon: string;
    name: string;
    type: 'buff' | 'debuff' | 'pending';
    customerRate?: number;
    remainingDays: number;
    sourceEvent: string;
    pendingMoney?: number;
    chainEvent?: ChainEvent;
}

// 待交付事件信息
export interface PendingDelivery {
    eventId: string;
    eventName: string;
    senderName: string;
    senderIcon: string;
    requirement: DeliveryRequirement;
    deliveredCount: number;
    effect: EventEffect;
    chain?: ChainEvent;
}

// 事件状态 V2
export interface EventStateV2 {
    currentEvent: RandomEventV2 | null;
    pendingEvent: RandomEventV2 | null;
    triggeredToday: string[];
    isEventPhase: boolean;
    customerClearing: boolean;
    productionChallenge: ProductionChallenge | null;
    productionProgress: number;
    activeEffects: ActiveEffect[];
    messages: EventMessage[];
    dayCount: number;
    pendingDelivery: PendingDelivery | null;  // 待交付事件
}

/**
 * 🍜 午餐时段事件 (13:30) - 25个
 */
export const LUNCH_EVENTS_V2: RandomEventV2[] = [
    {
        id: 'L01', name: '大胃王挑战', icon: '🍜', timeSlot: 'lunch', type: 'production',
        sender: { name: '小红', icon: '📱', role: '美食博主' },
        description: '网红大胃王要直播吃10份，吃完免单，保证给你涨粉！',
        optionA: {
            text: '接受挑战', emoji: '✅',
            effect: { money: -80 },
            production: { targetCount: 10, timeLimit: 300, successReward: { money: 80, heat: 50, customerRate: 1.3, customerRateDays: 1 }, failPenalty: { heat: -20 } }
        },
        optionB: { text: '婉拒', emoji: '❌', effect: { heat: -15 } }
    },
    {
        id: 'L02', name: '公司团建', icon: '🏢', timeSlot: 'lunch', type: 'production',
        sender: { name: '张经理', icon: '🏢', role: '公司经理' },
        description: '30人团建想订餐，15分钟能做完不？急！',
        optionA: {
            text: '接单', emoji: '💪',
            effect: {},
            production: { targetCount: 30, timeLimit: 480, successReward: { money: 300, heat: 30 }, failPenalty: { money: -50, heat: -20 } }
        },
        optionB: { text: '拒绝', emoji: '🙅', effect: {} }
    },
    {
        id: 'L03', name: '网红探店', icon: '📱', timeSlot: 'lunch', type: 'normal',
        sender: { name: '小红', icon: '📱', role: '美食博主' },
        description: '50万粉博主想免费吃换曝光，稳赚不亏！',
        optionA: { 
            text: '免费请', emoji: '🎁', 
            effect: { heat: 40, customerRate: 1.5, customerRateDays: 1 },
            delivery: { count: 1, description: '为网红博主制作一份烤冷面' }
        },
        optionB: { text: '收费', emoji: '💰', effect: { money: 15, heat: -25 } }
    },
    {
        id: 'L04', name: '收徒弟', icon: '👨‍🎓', timeSlot: 'lunch', type: 'chain',
        sender: { name: '小王', icon: '👨‍🎓', role: '学徒' },
        description: '年轻人想学手艺，愿意交200学费！',
        optionA: {
            text: '收徒', emoji: '🤝',
            effect: { money: 200, heat: -10 },
            chain: { triggerDays: 3, effect: { customerRate: 1.2, customerRateDays: 3 }, message: '师傅！我学成了，来帮您招呼客人！' }
        },
        optionB: { text: '拒绝', emoji: '🙅', effect: { heat: -5 } }
    },
    {
        id: 'L05', name: '老顾客借钱', icon: '🙏', timeSlot: 'lunch', type: 'chain',
        sender: { name: '王大妈', icon: '👵', role: '老顾客' },
        description: '老顾客急用钱想借100，承诺3天后还150！',
        optionA: {
            text: '借出', emoji: '💳',
            effect: { money: -100 },
            chain: { triggerDays: 3, effect: { money: 150 }, message: '小伙子，钱还你，多给50当利息！' }
        },
        optionB: { text: '拒绝', emoji: '❌', effect: { heat: -10 } }
    },
    {
        id: 'L06', name: '批量订单', icon: '💒', timeSlot: 'lunch', type: 'production',
        sender: { name: '婚庆公司', icon: '💒', role: '客户' },
        description: '婚宴要50份当喜糖，预付定金！',
        optionA: {
            text: '接单', emoji: '✅',
            effect: {},
            production: { targetCount: 50, timeLimit: 720, successReward: { money: 500, heat: 25 }, failPenalty: { money: -80, heat: -15 } }
        },
        optionB: { text: '拒绝', emoji: '❌', effect: {} }
    },
    {
        id: 'L07', name: '媒体采访', icon: '📺', timeSlot: 'lunch', type: 'normal',
        sender: { name: '刘记者', icon: '📺', role: '记者' },
        description: '本地报纸想写一篇你的创业故事！',
        optionA: { text: '接受', emoji: '🎤', effect: { heat: 35, customerRate: 1.25, customerRateDays: 1 } },
        optionB: { text: '太忙', emoji: '🙅', effect: {} }
    },
    {
        id: 'L08', name: '学生团购', icon: '🎓', timeSlot: 'lunch', type: 'normal',
        sender: { name: '学生代表', icon: '🎓', role: '学生' },
        description: '20个学生想团购，能打8折不？',
        optionA: { text: '同意', emoji: '✅', effect: { money: 128, heat: 15 } },
        optionB: { text: '不打折', emoji: '🙅', effect: { money: 160, heat: -5 } }
    },
    {
        id: 'L09', name: '老顾客介绍', icon: '👵', timeSlot: 'lunch', type: 'normal',
        sender: { name: '王大妈', icon: '👵', role: '老顾客' },
        description: '带了10个老姐妹来，给点优惠呗！',
        optionA: { text: '给优惠', emoji: '🎁', effect: { money: 60, heat: 25 } },
        optionB: { text: '原价', emoji: '💵', effect: { money: 80, heat: -5 } }
    },
    {
        id: 'L10', name: '外国游客', icon: '🌍', timeSlot: 'lunch', type: 'normal',
        sender: { name: '游客', icon: '🌍', role: '外国人' },
        description: '外国游客想尝试烤冷面，语言不通但很热情！',
        optionA: { text: '热情接待', emoji: '🤝', effect: { money: 50, heat: 30 } },
        optionB: { text: '比划着卖', emoji: '✋', effect: { money: 30, heat: 10 } }
    },
    {
        id: 'L11', name: '慈善捐款', icon: '❤️', timeSlot: 'lunch', type: 'normal',
        sender: { name: '志愿者', icon: '❤️', role: '公益人士' },
        description: '帮助贫困儿童募捐，献出一份爱心！',
        optionA: { text: '捐100', emoji: '❤️', effect: { money: -100, heat: 25 } },
        optionB: { text: '婉拒', emoji: '🙅', effect: { heat: -5 } }
    },
    {
        id: 'L12', name: '美食节邀请', icon: '🎪', timeSlot: 'lunch', type: 'chain',
        sender: { name: '主办方', icon: '🎪', role: '活动方' },
        description: '邀请参加美食节，摊位费200！',
        optionA: {
            text: '参加', emoji: '🎉',
            effect: { money: -200, heat: 60 },
            chain: { triggerDays: 3, effect: { money: 400 }, message: '美食节大成功！这是你的分成！' }
        },
        optionB: { text: '不去', emoji: '🙅', effect: {} }
    },
    {
        id: 'L13', name: '顾客拍照', icon: '📸', timeSlot: 'lunch', type: 'normal',
        sender: { name: '顾客', icon: '📸', role: '食客' },
        description: '顾客想拍照发朋友圈，问你介意吗？',
        optionA: { text: '欢迎', emoji: '📸', effect: { heat: 15, customerRate: 1.1, customerRateDays: 1 } },
        optionB: { text: '不让', emoji: '🙅', effect: { heat: -5 } }
    },
    {
        id: 'L14', name: '隔壁交好', icon: '🏪', timeSlot: 'lunch', type: 'chain',
        sender: { name: '隔壁老板', icon: '🏪', role: '邻居' },
        description: '隔壁在装修，送份饭交个朋友？',
        optionA: {
            text: '送饭', emoji: '🍱',
            effect: {},
            delivery: { count: 1, description: '为隔壁老板制作一份烤冷面' },
            chain: { triggerDays: 3, effect: { heat: 30 }, message: '兄弟够意思！以后互相照应！' }
        },
        optionB: { text: '不理', emoji: '😤', effect: {} }
    },
    {
        id: 'L15', name: '顾客投诉', icon: '😤', timeSlot: 'lunch', type: 'normal',
        sender: { name: '顾客', icon: '😤', role: '食客' },
        description: '顾客说分量太少，要求补一点！',
        optionA: { 
            text: '补一份', emoji: '🍜', 
            effect: { heat: 10 },
            delivery: { count: 1, description: '为投诉顾客补做一份' }
        },
        optionB: { text: '不补', emoji: '😤', effect: { heat: -20 } }
    },
    {
        id: 'L16', name: '异物索赔', icon: '😱', timeSlot: 'lunch', type: 'normal',
        sender: { name: '顾客', icon: '😱', role: '食客' },
        description: '有人说吃到头发，要赔100！',
        optionA: { text: '私了', emoji: '💰', effect: { money: -100 } },
        optionB: { text: '硬刚', emoji: '😤', effect: { successRate: 50, heat: 0, failHeat: -40 } }
    },
    {
        id: 'L17', name: '小费惊喜', icon: '💵', timeSlot: 'lunch', type: 'normal',
        sender: { name: '外国游客', icon: '🌍', role: '游客' },
        description: '外国人给了50小费，收不收？',
        optionA: { text: '收下', emoji: '🙏', effect: { money: 50, heat: 5 } },
        optionB: { text: '退回', emoji: '🙅', effect: { heat: 15 } }
    },
    {
        id: 'L18', name: '试吃推广', icon: '🍜', timeSlot: 'lunch', type: 'normal',
        sender: { name: '自己', icon: '💭', role: '店主' },
        description: '要不要放免费试吃吸引客人？',
        optionA: { text: '放试吃', emoji: '🍜', effect: { money: -30, heat: 30, customerRate: 1.2, customerRateDays: 1 } },
        optionB: { text: '不放', emoji: '🤷', effect: {} }
    },
    {
        id: 'L19', name: '熟人赊账', icon: '🤝', timeSlot: 'lunch', type: 'chain',
        sender: { name: '熟人', icon: '🤝', role: '熟客' },
        description: '熟人说下次一起给，先赊着？',
        optionA: {
            text: '赊账', emoji: '✅',
            effect: { money: -30 },
            chain: { triggerDays: 3, effect: { money: 30, successRate: 80 }, message: '上次的钱给你！' }
        },
        optionB: { text: '不行', emoji: '🙅', effect: { heat: -5 } }
    },
    {
        id: 'L20', name: '美食比拼', icon: '🏆', timeSlot: 'lunch', type: 'normal',
        sender: { name: '隔壁老板', icon: '🍜', role: '同行' },
        description: '隔壁摊主要比今天谁卖得多！',
        optionA: { text: '比', emoji: '🏆', effect: { successRate: 60, money: 100, heat: 30, failHeat: -10 } },
        optionB: { text: '不比', emoji: '🙅', effect: {} }
    },
    {
        id: 'L21', name: '粉丝见面', icon: '📱', timeSlot: 'lunch', type: 'normal',
        sender: { name: '粉丝', icon: '📱', role: '网友' },
        description: '网红的粉丝专程来吃！',
        optionA: { text: '送周边', emoji: '🎁', effect: { money: -20, heat: 35 } },
        optionB: { text: '正常', emoji: '🙂', effect: { heat: 15 } }
    },
    {
        id: 'L22', name: '电台采访', icon: '📻', timeSlot: 'lunch', type: 'normal',
        sender: { name: 'DJ小王', icon: '📻', role: '电台主持' },
        description: '本地电台想连线采访你！',
        optionA: { text: '接受', emoji: '🎙️', effect: { heat: 40, customerRate: 1.3, customerRateDays: 1 } },
        optionB: { text: '太忙', emoji: '🙅', effect: {} }
    },
    {
        id: 'L23', name: '幼儿园订餐', icon: '👶', timeSlot: 'lunch', type: 'production',
        sender: { name: '园长', icon: '👶', role: '幼儿园' },
        description: '幼儿园想订40份小份装！',
        optionA: {
            text: '接单', emoji: '✅',
            effect: {},
            production: { targetCount: 40, timeLimit: 600, successReward: { money: 280, heat: 35 }, failPenalty: { money: -60, heat: -15 } }
        },
        optionB: { text: '拒绝', emoji: '❌', effect: {} }
    },
    {
        id: 'L24', name: '老兵优惠', icon: '🎖️', timeSlot: 'lunch', type: 'normal',
        sender: { name: '老兵', icon: '🎖️', role: '退伍军人' },
        description: '退伍老兵问有没有优惠？',
        optionA: { 
            text: '免费送', emoji: '🎁', 
            effect: { heat: 30 },
            delivery: { count: 1, description: '为退伍老兵制作一份烤冷面' }
        },
        optionB: { text: '半价', emoji: '💰', effect: { money: 8, heat: 15 } }
    },
    {
        id: 'L25', name: '摄影师取景', icon: '📷', timeSlot: 'lunch', type: 'normal',
        sender: { name: '摄影师', icon: '📷', role: '摄影爱好者' },
        description: '想拍你做饭当素材，同意吗？',
        optionA: { text: '同意', emoji: '📸', effect: { heat: 20 } },
        optionB: { text: '拒绝', emoji: '🙅', effect: {} }
    }
];

/**
 * ☕ 下午时段事件 (15:30) - 25个
 */
export const AFTERNOON_EVENTS_V2: RandomEventV2[] = [
    {
        id: 'A01', name: '偷拍者', icon: '📷', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '可疑人', icon: '📷', role: '不明身份' },
        description: '有人在偷拍你的制作过程！',
        optionA: { text: '收费教学', emoji: '💰', effect: { money: 200, heat: -10 } },
        optionB: { text: '驱赶', emoji: '👋', effect: { heat: 5 } }
    },
    {
        id: 'A02', name: '招牌歪了', icon: '🪧', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '路人', icon: '👀', role: '好心人' },
        description: '有人提醒你招牌被风吹歪了！',
        optionA: { text: '重新挂', emoji: '🎨', effect: { money: -50, heat: 15 } },
        optionB: { text: '扶正', emoji: '📦', effect: { money: -10, heat: 5 } }
    },
    {
        id: 'A03', name: '同行取经', icon: '🍜', timeSlot: 'afternoon', type: 'chain',
        sender: { name: '老李', icon: '🍜', role: '外地同行' },
        description: '外地同行想学习，愿付300学费！',
        optionA: {
            text: '教他', emoji: '📖',
            effect: { money: 300, heat: -10 },
            chain: { triggerDays: 3, effect: { heat: -15 }, message: '听说他回去开了家一样的店...' }
        },
        optionB: { text: '拒绝', emoji: '🙅', effect: {} }
    },
    {
        id: 'A04', name: '包装升级', icon: '📦', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '自己', icon: '💭', role: '店主' },
        description: '要不要换好看的包装盒？',
        optionA: { text: '换', emoji: '📦', effect: { money: -80, heat: 25, customerRate: 1.15, customerRateDays: 1 } },
        optionB: { text: '不换', emoji: '🤷', effect: {} }
    },
    {
        id: 'A05', name: '顾客建议', icon: '💬', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '老顾客', icon: '💬', role: '常客' },
        description: '顾客建议多加点辣椒！',
        optionA: { text: '采纳', emoji: '✅', effect: { heat: 15 } },
        optionB: { text: '不变', emoji: '🙅', effect: { heat: -5 } }
    },
    {
        id: 'A06', name: '儿童套餐', icon: '👶', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '家长', icon: '👶', role: '顾客' },
        description: '家长问有没有儿童套餐？',
        optionA: { text: '推出', emoji: '🍜', effect: { money: -20, heat: 20 } },
        optionB: { text: '没有', emoji: '🙅', effect: { heat: -5 } }
    },
    {
        id: 'A07', name: '外卖入驻', icon: '🛵', timeSlot: 'afternoon', type: 'chain',
        sender: { name: '平台客服', icon: '🛵', role: '外卖平台' },
        description: '外卖平台邀请你入驻！',
        optionA: {
            text: '入驻', emoji: '✅',
            effect: { money: -100 },
            chain: { triggerDays: 1, effect: { customerRate: 1.3, customerRateDays: 7 }, message: '入驻成功！订单开始来了！' }
        },
        optionB: { text: '不入驻', emoji: '❌', effect: {} }
    },
    {
        id: 'A08', name: '美食评选', icon: '🏆', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '主办方', icon: '🏆', role: '评选委员会' },
        description: '参加本区美食评选？',
        optionA: { text: '参加', emoji: '🏆', effect: { successRate: 40, money: 300, heat: 60, failHeat: -5 } },
        optionB: { text: '不参加', emoji: '🙅', effect: {} }
    },
    {
        id: 'A09', name: '团购券合作', icon: '🎫', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '团购平台', icon: '🎫', role: '平台' },
        description: '团购平台邀请你发优惠券！',
        optionA: { text: '发券', emoji: '✅', effect: { money: -50, heat: 20, customerRate: 1.25, customerRateDays: 1 } },
        optionB: { text: '不发', emoji: '🙅', effect: {} }
    },
    {
        id: 'A10', name: '综艺踩点', icon: '📺', timeSlot: 'afternoon', type: 'chain',
        sender: { name: '综艺编导', icon: '📺', role: '电视台' },
        description: '综艺节目想来拍摄！',
        optionA: {
            text: '同意', emoji: '🎬',
            effect: { money: -50 },
            chain: { triggerDays: 3, effect: { heat: 80 }, message: '节目播出了！你火了！' }
        },
        optionB: { text: '拒绝', emoji: '🙅', effect: {} }
    },
    {
        id: 'A11', name: '网红二次来访', icon: '📱', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '小红', icon: '📱', role: '美食博主' },
        description: '上次那个网红又来了！',
        optionA: { 
            text: '继续免费', emoji: '🎁', 
            effect: { heat: 25 },
            delivery: { count: 1, description: '为网红再次制作一份烤冷面' }
        },
        optionB: { text: '这次收费', emoji: '💰', effect: { money: 15, heat: -10 } }
    },
    {
        id: 'A12', name: '本地群推荐', icon: '💬', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '群主', icon: '💬', role: '社区达人' },
        description: '群主愿意在群里推荐你！',
        optionA: { 
            text: '送他一份', emoji: '🎁', 
            effect: { heat: 30 },
            delivery: { count: 1, description: '为群主制作一份烤冷面' }
        },
        optionB: { text: '付费推广', emoji: '💰', effect: { money: -50, heat: 40 } }
    },
    {
        id: 'A13', name: '写字楼外卖', icon: '🏢', timeSlot: 'afternoon', type: 'production',
        sender: { name: '白领', icon: '🏢', role: '上班族' },
        description: '写字楼想订25份外卖！',
        optionA: {
            text: '接单', emoji: '✅',
            effect: {},
            production: { targetCount: 25, timeLimit: 420, successReward: { money: 250, heat: 20 }, failPenalty: { money: -40, heat: -10 } }
        },
        optionB: { text: '拒绝', emoji: '❌', effect: {} }
    },
    {
        id: 'A14', name: '点评回复', icon: '⭐', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '点评网站', icon: '⭐', role: '平台' },
        description: '有人在网站上好评了！',
        optionA: { text: '回复感谢', emoji: '🙏', effect: { heat: 15 } },
        optionB: { text: '送券邀请', emoji: '🎁', effect: { money: -20, heat: 25 } }
    },
    {
        id: 'A15', name: '老顾客推荐', icon: '👍', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '老顾客', icon: '👍', role: '常客' },
        description: '老顾客发朋友圈推荐了！',
        optionA: { text: '送小菜感谢', emoji: '🎁', effect: { money: -10, heat: 25 } },
        optionB: { text: '口头感谢', emoji: '🙂', effect: { heat: 15 } }
    },
    {
        id: 'A16', name: '孕妇顾客', icon: '🤰', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '孕妇', icon: '🤰', role: '顾客' },
        description: '孕妇想吃但怕不健康！',
        optionA: { text: '特制健康版', emoji: '🍜', effect: { money: -10, heat: 20 } },
        optionB: { text: '建议别吃', emoji: '🙅', effect: { heat: 5 } }
    },
    {
        id: 'A17', name: '同学聚会', icon: '🎓', timeSlot: 'afternoon', type: 'production',
        sender: { name: '聚会组织者', icon: '🎓', role: '顾客' },
        description: '老同学聚会想订20份！',
        optionA: {
            text: '接单', emoji: '✅',
            effect: {},
            production: { targetCount: 20, timeLimit: 360, successReward: { money: 200, heat: 20 }, failPenalty: { money: -30, heat: -10 } }
        },
        optionB: { text: '拒绝', emoji: '❌', effect: {} }
    },
    {
        id: 'A18', name: '健身教练', icon: '💪', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '教练', icon: '💪', role: '健身达人' },
        description: '教练问能不能做低脂版？',
        optionA: { text: '研发', emoji: '🍜', effect: { money: -30, heat: 25 } },
        optionB: { text: '做不了', emoji: '🙅', effect: {} }
    },
    {
        id: 'A19', name: '剧组订餐', icon: '🎬', timeSlot: 'afternoon', type: 'production',
        sender: { name: '剧务', icon: '🎬', role: '剧组' },
        description: '附近剧组想订35份！',
        optionA: {
            text: '接单', emoji: '✅',
            effect: {},
            production: { targetCount: 35, timeLimit: 540, successReward: { money: 350, heat: 40 }, failPenalty: { money: -50, heat: -15 } }
        },
        optionB: { text: '拒绝', emoji: '❌', effect: {} }
    },
    {
        id: 'A20', name: '失恋顾客', icon: '😢', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '顾客', icon: '😢', role: '食客' },
        description: '顾客边吃边哭...',
        optionA: { text: '安慰+送饮料', emoji: '🤗', effect: { money: -10, heat: 20 } },
        optionB: { text: '不管', emoji: '🙅', effect: {} }
    },
    {
        id: 'A21', name: '求职者', icon: '👔', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '求职者', icon: '👔', role: '年轻人' },
        description: '有人问你招不招人？',
        optionA: { text: '招他试试', emoji: '🤝', effect: { money: -50, customerRate: 1.2, customerRateDays: 1 } },
        optionB: { text: '不招', emoji: '🙅', effect: {} }
    },
    {
        id: 'A22', name: '纪录片', icon: '🎥', timeSlot: 'afternoon', type: 'chain',
        sender: { name: '导演', icon: '🎥', role: '纪录片导演' },
        description: '美食纪录片想拍你！',
        optionA: {
            text: '参与', emoji: '🎬',
            effect: { money: -30 },
            chain: { triggerDays: 3, effect: { heat: 70 }, message: '纪录片上线了！口碑爆棚！' }
        },
        optionB: { text: '太忙', emoji: '🙅', effect: {} }
    },
    {
        id: 'A23', name: '快递小哥', icon: '📦', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '快递员', icon: '📦', role: '快递小哥' },
        description: '快递小哥说饿了求便宜！',
        optionA: { text: '半价', emoji: '🍜', effect: { money: 8, heat: 15 } },
        optionB: { text: '原价', emoji: '💰', effect: { money: 15, heat: -5 } }
    },
    {
        id: 'A24', name: '社区活动', icon: '🏘️', timeSlot: 'afternoon', type: 'chain',
        sender: { name: '居委会', icon: '🏘️', role: '社区' },
        description: '邀请参加社区美食节！',
        optionA: {
            text: '参加', emoji: '🎉',
            effect: { money: -50 },
            chain: { triggerDays: 3, effect: { heat: 40 }, message: '社区活动很成功！邻居们都认识你了！' }
        },
        optionB: { text: '不去', emoji: '🙅', effect: {} }
    },
    {
        id: 'A25', name: '顾客晒图', icon: '📱', timeSlot: 'afternoon', type: 'normal',
        sender: { name: '顾客', icon: '📱', role: '食客' },
        description: '顾客发小红书晒你的店！',
        optionA: { 
            text: '送她一份', emoji: '🎁', 
            effect: { heat: 30 },
            delivery: { count: 1, description: '为晒图顾客制作一份烤冷面' }
        },
        optionB: { text: '说谢谢', emoji: '🙂', effect: { heat: 15 } }
    }
];

/**
 * 🍽️ 晚餐时段事件 (18:00) - 25个
 */
export const DINNER_EVENTS_V2: RandomEventV2[] = [
    {
        id: 'D01', name: '广场舞大妈', icon: '💃', timeSlot: 'dinner', type: 'normal',
        sender: { name: '大妈们', icon: '💃', role: '广场舞队' },
        description: '大妈们跳完舞集体来吃！',
        optionA: { text: '送饮料', emoji: '🎁', effect: { money: -20, heat: 30 } },
        optionB: { text: '正常', emoji: '🙂', effect: { heat: 10 } }
    },
    {
        id: 'D02', name: '醉汉多付', icon: '🍺', timeSlot: 'dinner', type: 'normal',
        sender: { name: '醉汉', icon: '🍺', role: '顾客' },
        description: '醉汉多给了100块！',
        optionA: { text: '收下', emoji: '🙏', effect: { money: 100 } },
        optionB: { text: '退回', emoji: '🙅', effect: { money: 15, heat: 10 } }
    },
    {
        id: 'D03', name: '明星路过', icon: '⭐', timeSlot: 'dinner', type: 'normal',
        sender: { name: '明星', icon: '⭐', role: '艺人' },
        description: '明星想吃烤冷面！',
        optionA: { 
            text: '免单合影', emoji: '📸', 
            effect: { heat: 80, customerRate: 2, customerRateDays: 1 },
            delivery: { count: 1, description: '为明星制作一份烤冷面' }
        },
        optionB: { text: '正常收', emoji: '💰', effect: { money: 50, heat: 10 } }
    },
    {
        id: 'D04', name: '外卖爆单', icon: '🛵', timeSlot: 'dinner', type: 'production',
        sender: { name: '外卖小哥', icon: '🛵', role: '骑手' },
        description: '突然来了20个外卖单！',
        optionA: {
            text: '全做', emoji: '💪',
            effect: {},
            production: { targetCount: 20, timeLimit: 360, successReward: { money: 200, heat: 15 }, failPenalty: { money: -30, heat: -10 } }
        },
        optionB: { text: '取消一半', emoji: '❌', effect: { money: 80, heat: -10 } }
    },
    {
        id: 'D05', name: '电视采访', icon: '📺', timeSlot: 'dinner', type: 'normal',
        sender: { name: '刘记者', icon: '📺', role: '电视台' },
        description: '电视台想做美食专题！',
        optionA: { text: '配合', emoji: '🎬', effect: { heat: 70, customerRate: 1.5, customerRateDays: 1 } },
        optionB: { text: '没时间', emoji: '🙅', effect: {} }
    },
    {
        id: 'D06', name: '熊孩子闯祸', icon: '👶', timeSlot: 'dinner', type: 'normal',
        sender: { name: '家长', icon: '👶', role: '顾客' },
        description: '熊孩子打翻了酱料！',
        optionA: { text: '要赔偿', emoji: '💰', effect: { money: 80, heat: -20 } },
        optionB: { text: '算了', emoji: '🤷', effect: { money: -30, heat: 20 } }
    },
    {
        id: 'D07', name: '顾客过敏', icon: '🏥', timeSlot: 'dinner', type: 'normal',
        sender: { name: '顾客', icon: '🏥', role: '食客' },
        description: '顾客说吃了过敏！',
        optionA: { text: '赔医药费', emoji: '💊', effect: { money: -150, heat: -10 } },
        optionB: { text: '拒赔', emoji: '❌', effect: { successRate: 60, failMoney: -200, failHeat: -40 } }
    },
    {
        id: 'D08', name: '夜市比赛', icon: '🏆', timeSlot: 'dinner', type: 'normal',
        sender: { name: '主办方', icon: '🏆', role: '夜市管理' },
        description: '夜市举办厨艺比赛！',
        optionA: { text: '参加', emoji: '🏆', effect: { successRate: 60, money: 300, heat: 50, failHeat: -10 } },
        optionB: { text: '专心', emoji: '📦', effect: { money: 50 } }
    },
    {
        id: 'D09', name: '情侣吵架', icon: '💔', timeSlot: 'dinner', type: 'normal',
        sender: { name: '情侣', icon: '💔', role: '顾客' },
        description: '两个顾客在店里吵架！',
        optionA: { text: '劝和', emoji: '🕊️', effect: { heat: 15, successRate: 70, money: 20, failHeat: -5 } },
        optionB: { text: '不管', emoji: '🙅', effect: { heat: -10 } }
    },
    {
        id: 'D10', name: '隔壁介绍', icon: '🏪', timeSlot: 'dinner', type: 'normal',
        sender: { name: '隔壁老板', icon: '🏪', role: '邻居' },
        description: '隔壁关门把客人介绍来了！',
        optionA: { text: '感谢', emoji: '🙏', effect: { heat: 20, customerRate: 1.3, customerRateDays: 0 } },
        optionB: { text: '送礼', emoji: '🎁', effect: { money: -30, heat: 35 } }
    },
    {
        id: 'D11', name: '顾客遗失', icon: '📞', timeSlot: 'dinner', type: 'normal',
        sender: { name: '顾客', icon: '📞', role: '食客' },
        description: '顾客说钱包忘这了！',
        optionA: { text: '保管还他', emoji: '📦', effect: { heat: 25, successRate: 80, money: 50 } },
        optionB: { text: '没看见', emoji: '🤷', effect: { money: 150, heat: -30 } }
    },
    {
        id: 'D12', name: '网红打卡', icon: '📱', timeSlot: 'dinner', type: 'normal',
        sender: { name: '网红', icon: '📱', role: '博主' },
        description: '有网红在门口摆拍！',
        optionA: { text: '邀请进店', emoji: '📸', effect: { money: -10, heat: 20, customerRate: 1.2, customerRateDays: 1 } },
        optionB: { text: '不理', emoji: '🙅', effect: {} }
    },
    {
        id: 'D13', name: '竞争对手', icon: '🍜', timeSlot: 'dinner', type: 'normal',
        sender: { name: '老李', icon: '🍜', role: '同行' },
        description: '对手来打探生意！',
        optionA: { text: '交流', emoji: '🤝', effect: { heat: 10 } },
        optionB: { text: '赶走', emoji: '😤', effect: { heat: -5 } }
    },
    {
        id: 'D14', name: '大单预约', icon: '📅', timeSlot: 'dinner', type: 'production',
        sender: { name: '客户', icon: '📅', role: '预约客户' },
        description: '有20人聚餐预约！',
        optionA: {
            text: '接受', emoji: '✅',
            effect: {},
            production: { targetCount: 20, timeLimit: 360, successReward: { money: 250, heat: 20 }, failPenalty: { money: -40, heat: -15 } }
        },
        optionB: { text: '拒绝', emoji: '❌', effect: {} }
    },
    {
        id: 'D15', name: '点评好评', icon: '⭐', timeSlot: 'dinner', type: 'normal',
        sender: { name: '平台', icon: '⭐', role: '点评网站' },
        description: '有人在点评网站好评！',
        optionA: { text: '回复', emoji: '🙏', effect: { heat: 15 } },
        optionB: { text: '送券', emoji: '🎁', effect: { money: -20, heat: 25 } }
    },
    {
        id: 'D16', name: '外卖小哥求情', icon: '🛵', timeSlot: 'dinner', type: 'normal',
        sender: { name: '外卖小哥', icon: '🛵', role: '骑手' },
        description: '求你快点做别超时！',
        optionA: { text: '优先做', emoji: '⏰', effect: { heat: 10 } },
        optionB: { text: '按顺序', emoji: '🙅', effect: { heat: -5 } }
    },
    {
        id: 'D17', name: '老人优惠', icon: '👴', timeSlot: 'dinner', type: 'normal',
        sender: { name: '老人', icon: '👴', role: '顾客' },
        description: '老人问能不能便宜点？',
        optionA: { 
            text: '免费送', emoji: '🎁', 
            effect: { heat: 25 },
            delivery: { count: 1, description: '为老人制作一份烤冷面' }
        },
        optionB: { text: '半价', emoji: '💰', effect: { money: 8, heat: 10 } }
    },
    {
        id: 'D18', name: '约会情侣', icon: '💕', timeSlot: 'dinner', type: 'normal',
        sender: { name: '情侣', icon: '💕', role: '顾客' },
        description: '情侣想要浪漫一点！',
        optionA: { text: '布置一下', emoji: '🕯️', effect: { money: -20, heat: 30 } },
        optionB: { text: '正常', emoji: '🙂', effect: { heat: 5 } }
    },
    {
        id: 'D19', name: '加班族', icon: '💼', timeSlot: 'dinner', type: 'production',
        sender: { name: '加班族', icon: '💼', role: '上班族' },
        description: '加班族想订15份夜宵！',
        optionA: {
            text: '接单', emoji: '✅',
            effect: {},
            production: { targetCount: 15, timeLimit: 300, successReward: { money: 150, heat: 15 }, failPenalty: { heat: -10 } }
        },
        optionB: { text: '拒绝', emoji: '❌', effect: {} }
    },
    {
        id: 'D20', name: '醉酒表白', icon: '🍺', timeSlot: 'dinner', type: 'normal',
        sender: { name: '醉汉', icon: '🍺', role: '顾客' },
        description: '醉汉要在你店里表白！',
        optionA: { text: '配合', emoji: '🎉', effect: { money: -10, heat: 25 } },
        optionB: { text: '别闹', emoji: '🙅', effect: {} }
    },
    {
        id: 'D21', name: '抖音直播', icon: '📱', timeSlot: 'dinner', type: 'normal',
        sender: { name: '路人', icon: '📱', role: '网友' },
        description: '有人在直播你的摊位！',
        optionA: { text: '配合', emoji: '📸', effect: { heat: 30 } },
        optionB: { text: '别拍', emoji: '🙅', effect: { heat: -10 } }
    },
    {
        id: 'D22', name: '半夜饥饿', icon: '🌙', timeSlot: 'dinner', type: 'normal',
        sender: { name: '顾客', icon: '🌙', role: '食客' },
        description: '顾客说太饿了多要一份！',
        optionA: { text: '做', emoji: '🍜', effect: { money: 15, heat: 5 } },
        optionB: { text: '没了', emoji: '🙅', effect: { heat: -5 } }
    },
    {
        id: 'D23', name: '朋友来访', icon: '🤝', timeSlot: 'dinner', type: 'normal',
        sender: { name: '老朋友', icon: '🤝', role: '朋友' },
        description: '老朋友专程来捧场！',
        optionA: { text: '请客', emoji: '🎁', effect: { money: -30, heat: 20 } },
        optionB: { text: '收钱', emoji: '💰', effect: { money: 15, heat: -5 } }
    },
    {
        id: 'D24', name: '顾客故事', icon: '💬', timeSlot: 'dinner', type: 'normal',
        sender: { name: '顾客', icon: '💬', role: '食客' },
        description: '顾客说你的烤冷面像家的味道！',
        optionA: { text: '聊天', emoji: '🤗', effect: { heat: 20 } },
        optionB: { text: '微笑', emoji: '🙂', effect: { heat: 10 } }
    },
    {
        id: 'D25', name: '拍美食视频', icon: '🎥', timeSlot: 'dinner', type: 'normal',
        sender: { name: '美食博主', icon: '🎥', role: '博主' },
        description: '博主想拍制作过程！',
        optionA: { text: '配合', emoji: '🎬', effect: { heat: 35, customerRate: 1.25, customerRateDays: 1 } },
        optionB: { text: '太忙', emoji: '🙅', effect: {} }
    }
];

/**
 * 🌙 夜市时段事件 (20:30) - 25个
 */
export const NIGHT_EVENTS_V2: RandomEventV2[] = [
    {
        id: 'N01', name: '加班大单', icon: '🌙', timeSlot: 'night', type: 'production',
        sender: { name: '深夜顾客', icon: '🌙', role: '食客' },
        description: '快收摊了来了10人大单！',
        optionA: {
            text: '继续', emoji: '💪',
            effect: {},
            production: { targetCount: 10, timeLimit: 240, successReward: { money: 120, heat: 15 }, failPenalty: { heat: -10 } }
        },
        optionB: { text: '关门', emoji: '🏠', effect: { heat: -10 } }
    },
    {
        id: 'N02', name: '神秘食客', icon: '🎩', timeSlot: 'night', type: 'chain',
        sender: { name: '神秘人', icon: '🎩', role: '不明身份' },
        description: '穿着讲究的人放下500块走了！',
        optionA: {
            text: '追问', emoji: '🔍',
            effect: { heat: 60 },
            chain: { triggerDays: 3, effect: { heat: 50 }, message: '我是美食评论家，你的店很有潜力！' }
        },
        optionB: { text: '接受', emoji: '🙏', effect: { money: 500 } }
    },
    {
        id: 'N03', name: '清洁工大爷', icon: '🧹', timeSlot: 'night', type: 'chain',
        sender: { name: '大爷', icon: '🧹', role: '清洁工' },
        description: '清洁工大爷看起来很饿...',
        optionA: {
            text: '请他吃', emoji: '🍜',
            effect: { heat: 15 },
            delivery: { count: 1, description: '为清洁工大爷制作一份烤冷面' },
            chain: { triggerDays: 2, effect: { heat: 20 }, message: '小伙子，有人投诉你我给挡了！' }
        },
        optionB: { text: '无视', emoji: '🙅', effect: { heat: -10 } }
    },
    {
        id: 'N04', name: '深夜大单', icon: '🌙', timeSlot: 'night', type: 'production',
        sender: { name: '顾客', icon: '🌙', role: '夜猫子' },
        description: '快收摊来了15人聚餐！',
        optionA: {
            text: '继续', emoji: '💪',
            effect: {},
            production: { targetCount: 15, timeLimit: 300, successReward: { money: 180, heat: 20 }, failPenalty: { heat: -15 } }
        },
        optionB: { text: '关门', emoji: '🏠', effect: { heat: -15 } }
    },
    {
        id: 'N05', name: '老友来访', icon: '🤝', timeSlot: 'night', type: 'chain',
        sender: { name: '老朋友', icon: '🤝', role: '朋友' },
        description: '收摊遇到老朋友！',
        optionA: {
            text: '请客', emoji: '🍺',
            effect: { money: -80 },
            chain: { triggerDays: 3, effect: { money: 200 }, message: '兄弟！有个婚宴200份介绍给你！' }
        },
        optionB: { text: '下次', emoji: '👋', effect: {} }
    },
    {
        id: 'N06', name: '夜市抽奖', icon: '🎰', timeSlot: 'night', type: 'normal',
        sender: { name: '主办方', icon: '🎰', role: '夜市' },
        description: '夜市抽奖50块一次！',
        optionA: { text: '试试', emoji: '🎰', effect: { successRate: 20, money: 500, failMoney: -50 } },
        optionB: { text: '不赌', emoji: '🙅', effect: {} }
    },
    {
        id: 'N07', name: '顾客感谢', icon: '🙏', timeSlot: 'night', type: 'normal',
        sender: { name: '顾客', icon: '🙏', role: '食客' },
        description: '你的烤冷面治好了我的乡愁！',
        optionA: { text: '握手', emoji: '🤝', effect: { heat: 10 } },
        optionB: { 
            text: '再送一份', emoji: '🎁', 
            effect: { heat: 30 },
            delivery: { count: 1, description: '为感恩顾客再做一份' }
        }
    },
    {
        id: 'N08', name: '竞争情报', icon: '🔍', timeSlot: 'night', type: 'normal',
        sender: { name: '熟人', icon: '🔍', role: '线人' },
        description: '有人卖对手的配方信息！',
        optionA: { text: '买', emoji: '💰', effect: { money: -200, heat: 20 } },
        optionB: { text: '不买', emoji: '🙅', effect: {} }
    },
    {
        id: 'N09', name: '深夜外卖', icon: '🛵', timeSlot: 'night', type: 'production',
        sender: { name: '外卖', icon: '🛵', role: '平台' },
        description: '深夜还有5单外卖！',
        optionA: {
            text: '做完', emoji: '💪',
            effect: {},
            production: { targetCount: 5, timeLimit: 120, successReward: { money: 60 }, failPenalty: { heat: -5 } }
        },
        optionB: { text: '关门', emoji: '❌', effect: { heat: -5 } }
    },
    {
        id: 'N10', name: '环卫工', icon: '🧹', timeSlot: 'night', type: 'normal',
        sender: { name: '环卫工', icon: '🧹', role: '工人' },
        description: '能不能便宜点卖我一份？',
        optionA: { 
            text: '免费送', emoji: '🍜', 
            effect: { heat: 25 },
            delivery: { count: 1, description: '为环卫工制作一份烤冷面' }
        },
        optionB: { text: '半价', emoji: '💰', effect: { money: 8, heat: 10 } }
    },
    {
        id: 'N11', name: '灯坏了', icon: '💡', timeSlot: 'night', type: 'normal',
        sender: { name: '自己', icon: '💡', role: '店主' },
        description: '招牌灯泡坏了！',
        optionA: { text: '马上换', emoji: '💡', effect: { money: -30, heat: 5 } },
        optionB: { text: '算了', emoji: '🤷', effect: { heat: -10 } }
    },
    {
        id: 'N12', name: '深夜求助', icon: '😢', timeSlot: 'night', type: 'normal',
        sender: { name: '路人', icon: '😢', role: '困难者' },
        description: '有人说没钱吃饭...',
        optionA: { 
            text: '免费给', emoji: '🍜', 
            effect: { heat: 20 },
            delivery: { count: 1, description: '为困难者制作一份烤冷面' }
        },
        optionB: { text: '不给', emoji: '🙅', effect: {} }
    },
    {
        id: 'N13', name: '收摊偶遇', icon: '💼', timeSlot: 'night', type: 'chain',
        sender: { name: '投资人', icon: '💼', role: '商人' },
        description: '西装男问有没有兴趣扩张？',
        optionA: {
            text: '交换联系', emoji: '🤝',
            effect: {},
            chain: { triggerDays: 3, effect: { money: 1000 }, message: '我想投资你开分店！先给1000启动资金！' }
        },
        optionB: { text: '不感兴趣', emoji: '🙅', effect: {} }
    },
    {
        id: 'N14', name: '夜市歌手', icon: '🎸', timeSlot: 'night', type: 'normal',
        sender: { name: '歌手', icon: '🎸', role: '艺人' },
        description: '在门口唱歌，给点吃的就行！',
        optionA: { text: '同意', emoji: '🎸', effect: { money: -8, heat: 25 } },
        optionB: { text: '拒绝', emoji: '🙅', effect: {} }
    },
    {
        id: 'N15', name: '最后一单', icon: '⏰', timeSlot: 'night', type: 'normal',
        sender: { name: '难缠顾客', icon: '⏰', role: '食客' },
        description: '收摊时来了难伺候的顾客！',
        optionA: { text: '接待', emoji: '💪', effect: { money: 20, successRate: 50, failHeat: -10 } },
        optionB: { text: '打烊了', emoji: '🏠', effect: { heat: -5 } }
    },
    {
        id: 'N16', name: '代驾小哥', icon: '🚗', timeSlot: 'night', type: 'normal',
        sender: { name: '代驾', icon: '🚗', role: '司机' },
        description: '代驾小哥问有没有吃的？',
        optionA: { 
            text: '请他吃', emoji: '🍜', 
            effect: { heat: 15 },
            delivery: { count: 1, description: '为代驾小哥制作一份烤冷面' }
        },
        optionB: { text: '正常卖', emoji: '💰', effect: { money: 15 } }
    },
    {
        id: 'N17', name: '酒吧散场', icon: '🍸', timeSlot: 'night', type: 'production',
        sender: { name: '酒吧客人', icon: '🍸', role: '夜店客' },
        description: '一群人从酒吧出来想吃！',
        optionA: {
            text: '接待', emoji: '✅',
            effect: {},
            production: { targetCount: 8, timeLimit: 180, successReward: { money: 100, heat: 15 }, failPenalty: { heat: -10 } }
        },
        optionB: { text: '收摊了', emoji: '🏠', effect: { heat: -10 } }
    },
    {
        id: 'N18', name: '夜跑团', icon: '🏃', timeSlot: 'night', type: 'normal',
        sender: { name: '跑步者', icon: '🏃', role: '运动员' },
        description: '夜跑团路过想补充能量！',
        optionA: { text: '热情招待', emoji: '🍜', effect: { money: 60, heat: 20 } },
        optionB: { text: '正常', emoji: '🙂', effect: { money: 45, heat: 5 } }
    },
    {
        id: 'N19', name: '拾荒老人', icon: '👴', timeSlot: 'night', type: 'normal',
        sender: { name: '老人', icon: '👴', role: '拾荒者' },
        description: '拾荒老人在翻垃圾桶...',
        optionA: { 
            text: '送份吃的', emoji: '🍜', 
            effect: { heat: 20 },  // 不扣钱，需要制作交付
            delivery: { count: 1, description: '为拾荒老人制作一份烤冷面' }
        },
        optionB: { text: '赶走', emoji: '🙅', effect: { heat: -10 } }
    },
    {
        id: 'N20', name: '情侣夜宵', icon: '💕', timeSlot: 'night', type: 'normal',
        sender: { name: '情侣', icon: '💕', role: '顾客' },
        description: '情侣想要浪漫的夜宵！',
        optionA: { text: '用心做', emoji: '🕯️', effect: { money: -10, heat: 25 } },
        optionB: { text: '正常', emoji: '🙂', effect: { money: 15, heat: 5 } }
    },
    {
        id: 'N21', name: '保安大哥', icon: '🛡️', timeSlot: 'night', type: 'normal',
        sender: { name: '保安', icon: '🛡️', role: '保安' },
        description: '保安说饿了能便宜点吗？',
        optionA: { 
            text: '请他吃', emoji: '🍜', 
            effect: { heat: 15 },
            delivery: { count: 1, description: '为保安大哥制作一份烤冷面' }
        },
        optionB: { text: '半价', emoji: '💰', effect: { money: 8, heat: 5 } }
    },
    {
        id: 'N22', name: '深夜聊天', icon: '💬', timeSlot: 'night', type: 'normal',
        sender: { name: '顾客', icon: '💬', role: '食客' },
        description: '顾客想和你聊聊人生！',
        optionA: { text: '聊天', emoji: '🗣️', effect: { heat: 20 } },
        optionB: { text: '太累了', emoji: '🙅', effect: {} }
    },
    {
        id: 'N23', name: '最后的食材', icon: '📦', timeSlot: 'night', type: 'normal',
        sender: { name: '自己', icon: '📦', role: '店主' },
        description: '食材刚好够做最后一份！',
        optionA: { text: '做给等候的人', emoji: '🍜', effect: { money: 15, heat: 15 } },
        optionB: { text: '收摊', emoji: '🏠', effect: { heat: -5 } }
    },
    {
        id: 'N24', name: '夜市收尾', icon: '🏪', timeSlot: 'night', type: 'normal',
        sender: { name: '其他摊主', icon: '🏪', role: '同行' },
        description: '摊主想买你剩的食材！',
        optionA: { text: '卖', emoji: '✅', effect: { money: 30 } },
        optionB: { text: '不卖', emoji: '🙅', effect: {} }
    },
    {
        id: 'N25', name: '回家路上', icon: '🚶', timeSlot: 'night', type: 'chain',
        sender: { name: '路人', icon: '🚶', role: '路人' },
        description: '回家路上有人问你店在哪？',
        optionA: {
            text: '详细介绍', emoji: '🗣️',
            effect: { heat: 10 },
            chain: { triggerDays: 1, effect: { customerRate: 1.1, customerRateDays: 1 }, message: '昨晚那人来了，还带了朋友！' }
        },
        optionB: { text: '随便说说', emoji: '🤷', effect: {} }
    }
];

/**
 * 获取所有事件
 */
export function getAllEventsV2(): RandomEventV2[] {
    return [...LUNCH_EVENTS_V2, ...AFTERNOON_EVENTS_V2, ...DINNER_EVENTS_V2, ...NIGHT_EVENTS_V2];
}

/**
 * 根据时段获取事件
 */
export function getEventsByTimeSlotV2(timeSlot: TimeSlot): RandomEventV2[] {
    switch (timeSlot) {
        case 'lunch': return LUNCH_EVENTS_V2;
        case 'afternoon': return AFTERNOON_EVENTS_V2;
        case 'dinner': return DINNER_EVENTS_V2;
        case 'night': return NIGHT_EVENTS_V2;
        default: return [];
    }
}

/**
 * 随机获取一个事件
 */
export function getRandomEventV2(timeSlot: TimeSlot, excludeIds: string[] = []): RandomEventV2 | null {
    const events = getEventsByTimeSlotV2(timeSlot);
    const available = events.filter(e => excludeIds.indexOf(e.id) === -1);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
}

/**
 * 创建初始事件状态
 */
export function createInitialEventStateV2(): EventStateV2 {
    return {
        currentEvent: null,
        pendingEvent: null,
        triggeredToday: [],
        isEventPhase: false,
        customerClearing: false,
        productionChallenge: null,
        productionProgress: 0,
        activeEffects: [],
        messages: [],
        dayCount: 1,
        pendingDelivery: null
    };
}
