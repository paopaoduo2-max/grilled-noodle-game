import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Button, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 🎲 随机事件系统 - 事件数据结构
 */

// 时段类型
export type TimeSlot = 'lunch' | 'afternoon' | 'dinner' | 'night';

// 事件选项
export interface EventOption {
    text: string;           // 选项文字
    emoji: string;          // 选项emoji
    cost: number;           // 金币消耗（负数表示收益）
    heatChange: number;     // 热度变化
    successRate?: number;   // 成功概率（0-100，默认100）
    failCost?: number;      // 失败时金币消耗
    failHeatChange?: number; // 失败时热度变化
    effect?: string;        // 特殊效果代码
}

// 随机事件定义
export interface RandomEvent {
    id: string;             // 事件ID
    name: string;           // 事件名称
    description: string;    // 事件描述
    icon: string;           // 事件图标emoji
    timeSlot: TimeSlot;     // 所属时段
    optionA: EventOption;   // 选项A
    optionB: EventOption;   // 选项B
    rarity?: 'common' | 'rare' | 'epic';  // 稀有度
    condition?: string;     // 触发条件
}

// 事件状态
export interface EventState {
    currentEvent: RandomEvent | null;
    pendingEvent: RandomEvent | null;
    triggeredToday: string[];
    isEventPhase: boolean;
    customerClearing: boolean;
    eventTriggerTimes: number[];  // 今日事件触发时间点
}

/**
 * 🎲 事件池 - 午餐时段 (13:30)
 */
export const LUNCH_EVENTS: RandomEvent[] = [
    {
        id: 'lunch_01',
        name: '大胃王挑战',
        description: '网红大胃王要直播吃10份，吃完免单。这波曝光很诱人...',
        icon: '🍜',
        timeSlot: 'lunch',
        optionA: {
            text: '接受挑战',
            emoji: '✅',
            cost: -80,
            heatChange: 50,
            effect: 'VIRAL_BOOST'
        },
        optionB: {
            text: '婉拒',
            emoji: '❌',
            cost: 0,
            heatChange: -15
        }
    },
    {
        id: 'lunch_02',
        name: '公司团建订餐',
        description: '隔壁公司30人团建想订餐，要求15分钟内做完。',
        icon: '🏢',
        timeSlot: 'lunch',
        optionA: {
            text: '接单挑战',
            emoji: '💪',
            cost: 240,
            heatChange: 30,
            successRate: 70,
            failCost: -240,
            failHeatChange: -30
        },
        optionB: {
            text: '拒绝',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'lunch_03',
        name: '收保护费',
        description: '几个混混说这是他们的地盘，要收保护费。',
        icon: '😠',
        timeSlot: 'lunch',
        optionA: {
            text: '交保护费',
            emoji: '💰',
            cost: -50,
            heatChange: 0
        },
        optionB: {
            text: '硬刚',
            emoji: '👊',
            cost: 0,
            heatChange: 20,
            successRate: 50,
            failCost: -30,
            failHeatChange: -40
        }
    },
    {
        id: 'lunch_04',
        name: '食材涨价',
        description: '供货商说鸡蛋涨价，要不要现在囤货？',
        icon: '🥚',
        timeSlot: 'lunch',
        optionA: {
            text: '囤货50个',
            emoji: '📦',
            cost: -100,
            heatChange: 0,
            effect: 'COST_DOWN'
        },
        optionB: {
            text: '不囤',
            emoji: '🤷',
            cost: 0,
            heatChange: 0,
            effect: 'COST_UP_5'
        }
    },
    {
        id: 'lunch_05',
        name: '拜师学艺',
        description: '年轻人想跟你学手艺，愿意交200元学费。但之后可能成为竞争对手...',
        icon: '👨‍🎓',
        timeSlot: 'lunch',
        optionA: {
            text: '收徒',
            emoji: '🤝',
            cost: 200,
            heatChange: -20,
            effect: 'APPRENTICE'
        },
        optionB: {
            text: '拒绝',
            emoji: '🙅',
            cost: 0,
            heatChange: -10
        }
    },
    {
        id: 'lunch_06',
        name: '网红探店',
        description: '50万粉丝博主想免费吃换曝光，还是正常收费？',
        icon: '📱',
        timeSlot: 'lunch',
        optionA: {
            text: '免费请他',
            emoji: '🎁',
            cost: -8,
            heatChange: 40
        },
        optionB: {
            text: '正常收费',
            emoji: '💰',
            cost: 8,
            heatChange: -25
        }
    },
    {
        id: 'lunch_07',
        name: '卫生突查',
        description: '食药监来检查，看起来很严格的样子...',
        icon: '🔍',
        timeSlot: 'lunch',
        optionA: {
            text: '塞红包',
            emoji: '💵',
            cost: -100,
            heatChange: 0
        },
        optionB: {
            text: '硬接检查',
            emoji: '📋',
            cost: 0,
            heatChange: 15,
            successRate: 70,
            failCost: -200,
            failHeatChange: -30
        }
    },
    {
        id: 'lunch_08',
        name: '老顾客借钱',
        description: '老顾客说急用钱想借100，承诺3天后还150。',
        icon: '🙏',
        timeSlot: 'lunch',
        optionA: {
            text: '借给他',
            emoji: '💳',
            cost: -100,
            heatChange: 0,
            effect: 'LOAN_OUT'
        },
        optionB: {
            text: '拒绝',
            emoji: '❌',
            cost: 0,
            heatChange: -5,
            effect: 'LOSE_CUSTOMER'
        }
    },
    {
        id: 'lunch_09',
        name: '设备升级',
        description: '有人推销新款铁板，效率提升30%，要价300元。',
        icon: '🔧',
        timeSlot: 'lunch',
        optionA: {
            text: '买！',
            emoji: '💰',
            cost: -300,
            heatChange: 0,
            effect: 'SPEED_UP_30'
        },
        optionB: {
            text: '不买',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'lunch_10',
        name: '隔壁降价战',
        description: '隔壁烤冷面降到5块抢客，你怎么应对？',
        icon: '📉',
        timeSlot: 'lunch',
        optionA: {
            text: '跟着降价',
            emoji: '💸',
            cost: 0,
            heatChange: 0,
            effect: 'PRICE_DOWN_3'
        },
        optionB: {
            text: '坚持品质',
            emoji: '💪',
            cost: 0,
            heatChange: -25
        }
    },
    {
        id: 'lunch_11',
        name: '美食节邀请',
        description: '被邀请参加美食节，需要200元摊位费。',
        icon: '🎪',
        timeSlot: 'lunch',
        optionA: {
            text: '参加',
            emoji: '🎉',
            cost: -200,
            heatChange: 60
        },
        optionB: {
            text: '不参加',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'lunch_12',
        name: '顾客吃出异物',
        description: '有人说吃到头发要索赔100元，否则发抖音差评。',
        icon: '😱',
        timeSlot: 'lunch',
        optionA: {
            text: '私了赔偿',
            emoji: '💰',
            cost: -100,
            heatChange: 0
        },
        optionB: {
            text: '硬刚',
            emoji: '😤',
            cost: 0,
            heatChange: 0,
            successRate: 50,
            failHeatChange: -40
        }
    },
    {
        id: 'lunch_13',
        name: '批量订单',
        description: '婚宴要订100份当婚礼小吃，预付500元。',
        icon: '💒',
        timeSlot: 'lunch',
        optionA: {
            text: '接单',
            emoji: '✅',
            cost: 500,
            heatChange: 20
        },
        optionB: {
            text: '拒绝',
            emoji: '❌',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'lunch_14',
        name: '二房东涨租',
        description: '摊位费从月租500涨到800，不交就走人。',
        icon: '📜',
        timeSlot: 'lunch',
        optionA: {
            text: '交钱',
            emoji: '💰',
            cost: -300,
            heatChange: 0
        },
        optionB: {
            text: '搬走',
            emoji: '🚚',
            cost: 0,
            heatChange: -50
        }
    },
    {
        id: 'lunch_15',
        name: '媒体采访',
        description: '本地报纸想写一篇小店故事，需要花1小时配合。',
        icon: '📰',
        timeSlot: 'lunch',
        optionA: {
            text: '接受采访',
            emoji: '🎤',
            cost: 0,
            heatChange: 35
        },
        optionB: {
            text: '太忙了',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'lunch_16',
        name: '学生团购',
        description: '附近学生想团购20份，要求打8折。',
        icon: '🎓',
        timeSlot: 'lunch',
        optionA: {
            text: '同意团购',
            emoji: '✅',
            cost: 128,
            heatChange: 15
        },
        optionB: {
            text: '不打折',
            emoji: '🙅',
            cost: 0,
            heatChange: -5
        }
    },
    {
        id: 'lunch_17',
        name: '食材涨价',
        description: '供应商说食材涨价了，要不要换供应商？',
        icon: '📈',
        timeSlot: 'lunch',
        optionA: {
            text: '接受涨价',
            emoji: '💰',
            cost: -50,
            heatChange: 0
        },
        optionB: {
            text: '换供应商',
            emoji: '🔄',
            cost: 0,
            heatChange: 0,
            successRate: 70,
            failHeatChange: -15
        }
    },
    {
        id: 'lunch_18',
        name: '老顾客介绍',
        description: '老顾客带了10个朋友来，希望能给点优惠。',
        icon: '👥',
        timeSlot: 'lunch',
        optionA: {
            text: '给优惠',
            emoji: '🎁',
            cost: 60,
            heatChange: 25
        },
        optionB: {
            text: '原价',
            emoji: '💵',
            cost: 80,
            heatChange: 0
        }
    },
    {
        id: 'lunch_19',
        name: '外国游客',
        description: '一群外国游客想尝试烤冷面，语言不通。',
        icon: '🌍',
        timeSlot: 'lunch',
        optionA: {
            text: '热情接待',
            emoji: '🤝',
            cost: 50,
            heatChange: 30
        },
        optionB: {
            text: '比划着卖',
            emoji: '✋',
            cost: 30,
            heatChange: 10
        }
    },
    {
        id: 'lunch_20',
        name: '消防演练',
        description: '商场要求参加消防演练，需要停业2小时。',
        icon: '🚒',
        timeSlot: 'lunch',
        optionA: {
            text: '参加',
            emoji: '✅',
            cost: -30,
            heatChange: 5
        },
        optionB: {
            text: '交罚款不参加',
            emoji: '💰',
            cost: -100,
            heatChange: 0
        }
    },
    {
        id: 'lunch_21',
        name: '突发头疼',
        description: '你突然头疼得厉害，要不要休息一下？',
        icon: '🤕',
        timeSlot: 'lunch',
        optionA: {
            text: '买药继续',
            emoji: '💊',
            cost: -20,
            heatChange: 0
        },
        optionB: {
            text: '休息一会',
            emoji: '😴',
            cost: -50,
            heatChange: 10
        }
    },
    {
        id: 'lunch_22',
        name: '慈善捐款',
        description: '有人来募捐，说是帮助贫困儿童。',
        icon: '💝',
        timeSlot: 'lunch',
        optionA: {
            text: '捐100元',
            emoji: '❤️',
            cost: -100,
            heatChange: 20
        },
        optionB: {
            text: '婉拒',
            emoji: '🙅',
            cost: 0,
            heatChange: -5
        }
    },
    {
        id: 'lunch_23',
        name: '隔壁装修',
        description: '隔壁店铺装修，噪音很大影响生意。',
        icon: '🔨',
        timeSlot: 'lunch',
        optionA: {
            text: '送饭交好',
            emoji: '🍱',
            cost: -20,
            heatChange: 0,
            effect: 'NEIGHBOR_QUIET'
        },
        optionB: {
            text: '投诉',
            emoji: '📝',
            cost: 0,
            heatChange: -10
        }
    },
    {
        id: 'lunch_24',
        name: '开分店邀请',
        description: '有人想和你合伙开分店，需要投资2000元。',
        icon: '🏪',
        timeSlot: 'lunch',
        optionA: {
            text: '投资',
            emoji: '💰',
            cost: -2000,
            heatChange: 50,
            effect: 'BRANCH_STORE'
        },
        optionB: {
            text: '拒绝',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'lunch_25',
        name: '顾客求婚',
        description: '有顾客想在你店里求婚，需要配合表演。',
        icon: '💍',
        timeSlot: 'lunch',
        optionA: {
            text: '配合',
            emoji: '🎉',
            cost: 0,
            heatChange: 40
        },
        optionB: {
            text: '太忙了',
            emoji: '😅',
            cost: 0,
            heatChange: -10
        }
    }
];

/**
 * 🎲 事件池 - 下午时段 (15:30)
 */
export const AFTERNOON_EVENTS: RandomEvent[] = [
    {
        id: 'afternoon_01',
        name: '改良配方',
        description: '想到一个新配方，需要50元买食材试验。',
        icon: '🧪',
        timeSlot: 'afternoon',
        optionA: {
            text: '研发新品',
            emoji: '🔬',
            cost: -50,
            heatChange: 30,
            successRate: 70,
            failHeatChange: -15
        },
        optionB: {
            text: '维持现状',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_02',
        name: '摊位装修',
        description: '摊位太破影响形象，装修要200元。',
        icon: '🏗️',
        timeSlot: 'afternoon',
        optionA: {
            text: '装修升级',
            emoji: '✨',
            cost: -200,
            heatChange: 25,
            effect: 'PRICE_UP_1'
        },
        optionB: {
            text: '凑合用',
            emoji: '🤷',
            cost: 0,
            heatChange: -10
        }
    },
    {
        id: 'afternoon_03',
        name: '雇小时工',
        description: '下午太忙，考虑雇个帮手，50元/天。',
        icon: '👷',
        timeSlot: 'afternoon',
        optionA: {
            text: '雇帮手',
            emoji: '🤝',
            cost: -50,
            heatChange: 0,
            effect: 'DOUBLE_SPEED'
        },
        optionB: {
            text: '一个人扛',
            emoji: '💪',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_04',
        name: '差评要挟',
        description: '有人威胁：给100块就删差评，不给发3条差评。',
        icon: '😈',
        timeSlot: 'afternoon',
        optionA: {
            text: '给钱了事',
            emoji: '💰',
            cost: -100,
            heatChange: 0
        },
        optionB: {
            text: '不给',
            emoji: '😤',
            cost: 0,
            heatChange: -35
        }
    },
    {
        id: 'afternoon_05',
        name: '黑心进货',
        description: '有人说能便宜卖食材，但来路不明...',
        icon: '🤫',
        timeSlot: 'afternoon',
        optionA: {
            text: '买便宜货',
            emoji: '💵',
            cost: -50,
            heatChange: 0,
            successRate: 90,
            failHeatChange: -50
        },
        optionB: {
            text: '走正规',
            emoji: '✅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_06',
        name: '招牌被砸',
        description: '刮风把招牌吹掉了，需要重做。',
        icon: '💨',
        timeSlot: 'afternoon',
        optionA: {
            text: '重做招牌',
            emoji: '🪧',
            cost: -80,
            heatChange: 15
        },
        optionB: {
            text: '用纸板凑合',
            emoji: '📝',
            cost: 0,
            heatChange: -20
        }
    },
    {
        id: 'afternoon_07',
        name: '涨价决定',
        description: '物价涨了，考虑是否涨价？',
        icon: '📈',
        timeSlot: 'afternoon',
        optionA: {
            text: '涨2元',
            emoji: '💰',
            cost: 0,
            heatChange: -15,
            effect: 'PRICE_UP_2'
        },
        optionB: {
            text: '不涨',
            emoji: '🤝',
            cost: 0,
            heatChange: 10
        }
    },
    {
        id: 'afternoon_08',
        name: 'VIP充值',
        description: '老顾客想充值500享8折。',
        icon: '💳',
        timeSlot: 'afternoon',
        optionA: {
            text: '接受充值',
            emoji: '✅',
            cost: 500,
            heatChange: 10,
            effect: 'VIP_DISCOUNT'
        },
        optionB: {
            text: '不做充值',
            emoji: '❌',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_09',
        name: '合伙提议',
        description: '有人想投资1000入股，之后利润对半分。',
        icon: '🤝',
        timeSlot: 'afternoon',
        optionA: {
            text: '接受投资',
            emoji: '💰',
            cost: 1000,
            heatChange: 0,
            effect: 'PARTNER'
        },
        optionB: {
            text: '保持独立',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_10',
        name: '请客吃饭',
        description: '街道管理员暗示想吃饭...不请可能经常被查。',
        icon: '🍽️',
        timeSlot: 'afternoon',
        optionA: {
            text: '请客',
            emoji: '🍻',
            cost: -200,
            heatChange: 0,
            effect: 'NO_INSPECT'
        },
        optionB: {
            text: '不请',
            emoji: '🙅',
            cost: 0,
            heatChange: 0,
            effect: 'WEEKLY_FINE'
        }
    },
    {
        id: 'afternoon_11',
        name: '买冰箱',
        description: '想买个冰箱保鲜食材，500元但能减少浪费。',
        icon: '🧊',
        timeSlot: 'afternoon',
        optionA: {
            text: '买',
            emoji: '💰',
            cost: -500,
            heatChange: 10,
            effect: 'LESS_WASTE'
        },
        optionB: {
            text: '不买',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_12',
        name: '秘方泄露',
        description: '发现配方被隔壁偷学了，要不要改良配方保持优势？',
        icon: '🔐',
        timeSlot: 'afternoon',
        optionA: {
            text: '改良配方',
            emoji: '🧪',
            cost: -50,
            heatChange: 20
        },
        optionB: {
            text: '不管',
            emoji: '🤷',
            cost: 0,
            heatChange: -15
        }
    },
    {
        id: 'afternoon_13',
        name: '学新技术',
        description: '网上有付费烤冷面课程300元，学了能解锁新品种。',
        icon: '📚',
        timeSlot: 'afternoon',
        optionA: {
            text: '报名学习',
            emoji: '📖',
            cost: -300,
            heatChange: 25,
            effect: 'NEW_RECIPE'
        },
        optionB: {
            text: '自己摸索',
            emoji: '🤔',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_14',
        name: '品牌包装',
        description: '想做品牌包装袋，150元印1000个。',
        icon: '🛍️',
        timeSlot: 'afternoon',
        optionA: {
            text: '做包装',
            emoji: '✨',
            cost: -150,
            heatChange: 15
        },
        optionB: {
            text: '用白袋子',
            emoji: '🤷',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_15',
        name: '主动请网红',
        description: '主动花500元请网红来探店，换取曝光。',
        icon: '📸',
        timeSlot: 'afternoon',
        optionA: {
            text: '请网红',
            emoji: '💸',
            cost: -500,
            heatChange: 60
        },
        optionB: {
            text: '自然增长',
            emoji: '🌱',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_16',
        name: '顾客投诉',
        description: '有顾客在网上发差评说不干净！',
        icon: '😤',
        timeSlot: 'afternoon',
        optionA: {
            text: '公开道歉',
            emoji: '🙏',
            cost: -30,
            heatChange: -10
        },
        optionB: {
            text: '删帖',
            emoji: '🗑️',
            cost: -100,
            heatChange: 5
        }
    },
    {
        id: 'afternoon_17',
        name: '网络故障',
        description: '收款码突然用不了，只能现金交易。',
        icon: '📵',
        timeSlot: 'afternoon',
        optionA: {
            text: '找人修',
            emoji: '🔧',
            cost: -50,
            heatChange: 0
        },
        optionB: {
            text: '只收现金',
            emoji: '💵',
            cost: 0,
            heatChange: -20
        }
    },
    {
        id: 'afternoon_18',
        name: '免费试吃',
        description: '考虑在门口放试吃品吸引顾客。',
        icon: '🆓',
        timeSlot: 'afternoon',
        optionA: {
            text: '放试吃',
            emoji: '🍜',
            cost: -30,
            heatChange: 25
        },
        optionB: {
            text: '不放',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_19',
        name: '政府补贴',
        description: '政府发放小摊贩补贴，需要提交申请。',
        icon: '🏛️',
        timeSlot: 'afternoon',
        optionA: {
            text: '申请',
            emoji: '📝',
            cost: 0,
            heatChange: 0,
            successRate: 80,
            failCost: 0,
            failHeatChange: 0,
            effect: 'GET_SUBSIDY_200'
        },
        optionB: {
            text: '太麻烦',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_20',
        name: '换位置',
        description: '有个更好的摊位空出来了，搬迁费300元。',
        icon: '📍',
        timeSlot: 'afternoon',
        optionA: {
            text: '搬过去',
            emoji: '🚚',
            cost: -300,
            heatChange: 40
        },
        optionB: {
            text: '不搬',
            emoji: '🏠',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_21',
        name: '老板娘生病',
        description: '你媳妇感冒了，要不要请假照顾？',
        icon: '🤒',
        timeSlot: 'afternoon',
        optionA: {
            text: '回家照顾',
            emoji: '💝',
            cost: -80,
            heatChange: 0
        },
        optionB: {
            text: '继续营业',
            emoji: '💪',
            cost: 0,
            heatChange: -5
        }
    },
    {
        id: 'afternoon_22',
        name: '进货选择',
        description: '有便宜货源但品质一般，要不要进？',
        icon: '📦',
        timeSlot: 'afternoon',
        optionA: {
            text: '进便宜货',
            emoji: '💰',
            cost: 50,
            heatChange: -15
        },
        optionB: {
            text: '坚持品质',
            emoji: '⭐',
            cost: 0,
            heatChange: 10
        }
    },
    {
        id: 'afternoon_23',
        name: '抖音挑战',
        description: '有人发起烤冷面挑战，要不要参与？',
        icon: '📱',
        timeSlot: 'afternoon',
        optionA: {
            text: '参与挑战',
            emoji: '🎬',
            cost: 0,
            heatChange: 45,
            successRate: 60,
            failHeatChange: -10
        },
        optionB: {
            text: '不参与',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'afternoon_24',
        name: '水管爆裂',
        description: '附近水管爆了，没水用了！',
        icon: '💧',
        timeSlot: 'afternoon',
        optionA: {
            text: '买桶装水',
            emoji: '🪣',
            cost: -30,
            heatChange: 0
        },
        optionB: {
            text: '暂停营业',
            emoji: '🚫',
            cost: -100,
            heatChange: -15
        }
    },
    {
        id: 'afternoon_25',
        name: '同行取经',
        description: '外地同行想来学习，愿意付学费500元。',
        icon: '📚',
        timeSlot: 'afternoon',
        optionA: {
            text: '教他',
            emoji: '👨‍🏫',
            cost: 500,
            heatChange: -10
        },
        optionB: {
            text: '拒绝',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    }
];

/**
 * 🎲 事件池 - 晚餐时段 (18:00)
 */
export const DINNER_EVENTS: RandomEvent[] = [
    {
        id: 'dinner_01',
        name: '广场舞大妈',
        description: '大妈们的音响震天响，盖过你的吆喝声！',
        icon: '💃',
        timeSlot: 'dinner',
        optionA: {
            text: '买大音响对轰',
            emoji: '🔊',
            cost: -200,
            heatChange: 40
        },
        optionB: {
            text: '忍受',
            emoji: '😫',
            cost: 0,
            heatChange: -30
        }
    },
    {
        id: 'dinner_02',
        name: '醉汉闹事',
        description: '醉汉要赊账还动手动脚，很烦人。',
        icon: '🍺',
        timeSlot: 'dinner',
        optionA: {
            text: '报警',
            emoji: '🚔',
            cost: -30,
            heatChange: 15
        },
        optionB: {
            text: '请他吃打发',
            emoji: '🍜',
            cost: -8,
            heatChange: -20,
            effect: 'DRUNKARD'
        }
    },
    {
        id: 'dinner_03',
        name: '停电危机',
        description: '整条街停电了！',
        icon: '🔌',
        timeSlot: 'dinner',
        optionA: {
            text: '买发电机',
            emoji: '⚡',
            cost: -400,
            heatChange: 50,
            effect: 'GENERATOR'
        },
        optionB: {
            text: '收摊休息',
            emoji: '🏠',
            cost: -200,
            heatChange: 0
        }
    },
    {
        id: 'dinner_04',
        name: '暴雨来袭',
        description: '突然下大雨，顾客都在躲雨。',
        icon: '🌧️',
        timeSlot: 'dinner',
        optionA: {
            text: '买遮雨棚',
            emoji: '☔',
            cost: -300,
            heatChange: 20,
            effect: 'RAIN_COVER'
        },
        optionB: {
            text: '收摊避雨',
            emoji: '🏃',
            cost: -150,
            heatChange: 0
        }
    },
    {
        id: 'dinner_05',
        name: '明星路过',
        description: '某明星低调来吃，要不要免单求合影？',
        icon: '⭐',
        timeSlot: 'dinner',
        optionA: {
            text: '免单求合影',
            emoji: '📸',
            cost: -8,
            heatChange: 80
        },
        optionB: {
            text: '正常收费',
            emoji: '💰',
            cost: 50,
            heatChange: 0
        }
    },
    {
        id: 'dinner_06',
        name: '外卖爆单',
        description: '外卖突然来20单，做不完要退款！',
        icon: '📱',
        timeSlot: 'dinner',
        optionA: {
            text: '硬撑全做',
            emoji: '💪',
            cost: 160,
            heatChange: -15,
            effect: 'TIRED'
        },
        optionB: {
            text: '取消一半',
            emoji: '❌',
            cost: -80,
            heatChange: 0
        }
    },
    {
        id: 'dinner_07',
        name: '地痞报复',
        description: '上次被赶走的混混带人来报复！',
        icon: '😡',
        timeSlot: 'dinner',
        optionA: {
            text: '赔礼道歉',
            emoji: '🙏',
            cost: -50,
            heatChange: 0
        },
        optionB: {
            text: '叫人对峙',
            emoji: '👊',
            cost: 0,
            heatChange: 30,
            successRate: 50,
            failCost: -100,
            failHeatChange: -50
        }
    },
    {
        id: 'dinner_08',
        name: '电视采访',
        description: '电视台美食栏目想拍摄你的摊位！',
        icon: '📺',
        timeSlot: 'dinner',
        optionA: {
            text: '配合拍摄',
            emoji: '🎬',
            cost: 0,
            heatChange: 70
        },
        optionB: {
            text: '没时间',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'dinner_09',
        name: '熊孩子闯祸',
        description: '熊孩子把你的酱料打翻了！家长在旁边。',
        icon: '👶',
        timeSlot: 'dinner',
        optionA: {
            text: '要求赔偿',
            emoji: '💰',
            cost: 100,
            heatChange: -25
        },
        optionB: {
            text: '算了',
            emoji: '😌',
            cost: -50,
            heatChange: 15
        }
    },
    {
        id: 'dinner_10',
        name: '市长视察',
        description: '市长带队检查夜市，要快速整理！',
        icon: '👔',
        timeSlot: 'dinner',
        optionA: {
            text: '花钱装饰',
            emoji: '✨',
            cost: -20,
            heatChange: 40
        },
        optionB: {
            text: '保持原样',
            emoji: '🤷',
            cost: 0,
            heatChange: -25
        }
    },
    {
        id: 'dinner_11',
        name: '夜市比赛',
        description: '夜市举办厨艺比赛，50元报名费，获奖有大奖。',
        icon: '🏆',
        timeSlot: 'dinner',
        optionA: {
            text: '参加比赛',
            emoji: '🎯',
            cost: -50,
            heatChange: 50,
            successRate: 60,
            failHeatChange: -10
        },
        optionB: {
            text: '专心营业',
            emoji: '👨‍🍳',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'dinner_12',
        name: '顾客打架',
        description: '两个顾客因为插队吵起来打架了！',
        icon: '🥊',
        timeSlot: 'dinner',
        optionA: {
            text: '报警处理',
            emoji: '🚔',
            cost: -30,
            heatChange: -10
        },
        optionB: {
            text: '劝架调解',
            emoji: '🕊️',
            cost: 0,
            heatChange: 15,
            successRate: 70,
            failHeatChange: -30
        }
    },
    {
        id: 'dinner_13',
        name: '高温预警',
        description: '天气太热食材容易变质，需要买冰块保鲜。',
        icon: '🌡️',
        timeSlot: 'dinner',
        optionA: {
            text: '买冰块',
            emoji: '🧊',
            cost: -30,
            heatChange: 0
        },
        optionB: {
            text: '不买',
            emoji: '🤷',
            cost: 0,
            heatChange: 0,
            successRate: 80,
            failHeatChange: -40
        }
    },
    {
        id: 'dinner_14',
        name: '竞争对手挖人',
        description: '隔壁老板想高薪挖走你的帮手！',
        icon: '💼',
        timeSlot: 'dinner',
        optionA: {
            text: '加薪挽留',
            emoji: '💰',
            cost: -100,
            heatChange: 0
        },
        optionB: {
            text: '随他去',
            emoji: '👋',
            cost: 0,
            heatChange: -20
        }
    },
    {
        id: 'dinner_15',
        name: '食材临期',
        description: '今天的食材快过期了，要不要打折清仓？',
        icon: '⏰',
        timeSlot: 'dinner',
        optionA: {
            text: '打折清仓',
            emoji: '📢',
            cost: 50,
            heatChange: 10
        },
        optionB: {
            text: '扔掉',
            emoji: '🗑️',
            cost: -30,
            heatChange: 0
        }
    },
    {
        id: 'dinner_16',
        name: '雨天生意',
        description: '突然下大雨，顾客都跑光了！',
        icon: '🌧️',
        timeSlot: 'dinner',
        optionA: {
            text: '买雨棚',
            emoji: '⛱️',
            cost: -150,
            heatChange: 20
        },
        optionB: {
            text: '等雨停',
            emoji: '⏳',
            cost: -60,
            heatChange: -10
        }
    },
    {
        id: 'dinner_17',
        name: '送餐员等餐',
        description: '送餐员催得急，但前面还有几单...',
        icon: '🛵',
        timeSlot: 'dinner',
        optionA: {
            text: '优先外卖',
            emoji: '📦',
            cost: 0,
            heatChange: -10
        },
        optionB: {
            text: '按顺序',
            emoji: '📋',
            cost: -20,
            heatChange: 5
        }
    },
    {
        id: 'dinner_18',
        name: '偷学配方',
        description: '发现有人偷拍你的操作流程！',
        icon: '📷',
        timeSlot: 'dinner',
        optionA: {
            text: '赶走他',
            emoji: '👋',
            cost: 0,
            heatChange: 0
        },
        optionB: {
            text: '收徒弟费',
            emoji: '💰',
            cost: 200,
            heatChange: -5
        }
    },
    {
        id: 'dinner_19',
        name: '顾客过敏',
        description: '有顾客说吃了过敏，要求赔偿！',
        icon: '🤧',
        timeSlot: 'dinner',
        optionA: {
            text: '赔偿医药费',
            emoji: '💊',
            cost: -200,
            heatChange: 0
        },
        optionB: {
            text: '拒绝赔偿',
            emoji: '🙅',
            cost: 0,
            heatChange: -30,
            successRate: 60,
            failCost: -300,
            failHeatChange: -50
        }
    },
    {
        id: 'dinner_20',
        name: '晚高峰排队',
        description: '排队太长，有顾客等不及要走！',
        icon: '🚶',
        timeSlot: 'dinner',
        optionA: {
            text: '送饮料安抚',
            emoji: '🥤',
            cost: -20,
            heatChange: 15
        },
        optionB: {
            text: '随他去',
            emoji: '🤷',
            cost: 0,
            heatChange: -10
        }
    },
    {
        id: 'dinner_21',
        name: '灯泡坏了',
        description: '招牌灯泡坏了，要不要现在换？',
        icon: '💡',
        timeSlot: 'dinner',
        optionA: {
            text: '立刻换',
            emoji: '🔧',
            cost: -30,
            heatChange: 5
        },
        optionB: {
            text: '明天再说',
            emoji: '📅',
            cost: 0,
            heatChange: -10
        }
    },
    {
        id: 'dinner_22',
        name: '员工请假',
        description: '帮手突然说家里有事要走！',
        icon: '🏃',
        timeSlot: 'dinner',
        optionA: {
            text: '准假',
            emoji: '✅',
            cost: -80,
            heatChange: 0
        },
        optionB: {
            text: '不准',
            emoji: '❌',
            cost: 0,
            heatChange: 0,
            effect: 'EMPLOYEE_UNHAPPY'
        }
    },
    {
        id: 'dinner_23',
        name: '附近火灾',
        description: '附近着火了，消防车堵路影响生意！',
        icon: '🔥',
        timeSlot: 'dinner',
        optionA: {
            text: '帮忙救火',
            emoji: '🧯',
            cost: 0,
            heatChange: 30
        },
        optionB: {
            text: '专心营业',
            emoji: '👨‍🍳',
            cost: 0,
            heatChange: -5
        }
    },
    {
        id: 'dinner_24',
        name: '收款失误',
        description: '刚才好像多找钱了！',
        icon: '💸',
        timeSlot: 'dinner',
        optionA: {
            text: '追回去',
            emoji: '🏃',
            cost: 50,
            heatChange: 0,
            successRate: 50,
            failCost: 0,
            failHeatChange: 0
        },
        optionB: {
            text: '算了',
            emoji: '😔',
            cost: -50,
            heatChange: 0
        }
    },
    {
        id: 'dinner_25',
        name: '美食博主',
        description: '有美食博主想拍视频，需要配合演示。',
        icon: '🎥',
        timeSlot: 'dinner',
        optionA: {
            text: '配合拍摄',
            emoji: '🎬',
            cost: 0,
            heatChange: 55
        },
        optionB: {
            text: '太忙了',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    }
];

/**
 * 🎲 事件池 - 夜市时段 (20:30)
 */
export const NIGHT_EVENTS: RandomEvent[] = [
    {
        id: 'night_01',
        name: '加班抉择',
        description: '已经22点该收摊了，但还有客人...',
        icon: '🌙',
        timeSlot: 'night',
        optionA: {
            text: '加班1小时',
            emoji: '⏰',
            cost: 100,
            heatChange: 0,
            effect: 'TOMORROW_TIRED'
        },
        optionB: {
            text: '准时收摊',
            emoji: '🏠',
            cost: 0,
            heatChange: -10
        }
    },
    {
        id: 'night_02',
        name: '神秘食客',
        description: '穿西装的人默默吃完，留下500小费就走了。',
        icon: '🕴️',
        timeSlot: 'night',
        optionA: {
            text: '追问身份',
            emoji: '🏃',
            cost: 0,
            heatChange: 60,
            effect: 'FOOD_CRITIC'
        },
        optionB: {
            text: '收钱不问',
            emoji: '💰',
            cost: 500,
            heatChange: 0
        }
    },
    {
        id: 'night_03',
        name: '小偷出没',
        description: '发现有人在偷你的食材！',
        icon: '🦹',
        timeSlot: 'night',
        optionA: {
            text: '抓住报警',
            emoji: '🚔',
            cost: 0,
            heatChange: 0
        },
        optionB: {
            text: '放走',
            emoji: '🙈',
            cost: -80,
            heatChange: 0
        }
    },
    {
        id: 'night_04',
        name: '消防检查',
        description: '消防来查灭火器，你没有...',
        icon: '🧯',
        timeSlot: 'night',
        optionA: {
            text: '买灭火器',
            emoji: '🧯',
            cost: -100,
            heatChange: 0
        },
        optionB: {
            text: '塞红包',
            emoji: '💵',
            cost: -50,
            heatChange: 0
        }
    },
    {
        id: 'night_05',
        name: '管理费涨价',
        description: '今天管理费要多交50元。',
        icon: '📋',
        timeSlot: 'night',
        optionA: {
            text: '乖乖交钱',
            emoji: '💰',
            cost: -50,
            heatChange: 0
        },
        optionB: {
            text: '讨价还价',
            emoji: '🗣️',
            cost: 0,
            heatChange: 0,
            successRate: 50,
            failCost: -30,
            failHeatChange: 0,
            effect: 'WEEKLY_FEE_UP'
        }
    },
    {
        id: 'night_06',
        name: '酒吧散场',
        description: '一群醉醺醺的人想吃夜宵，给小费很大方但可能闹事。',
        icon: '🍻',
        timeSlot: 'night',
        optionA: {
            text: '接待他们',
            emoji: '🤝',
            cost: 100,
            heatChange: 0,
            successRate: 80,
            failHeatChange: -30
        },
        optionB: {
            text: '婉拒',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'night_07',
        name: '收摊遇险',
        description: '收摊时被人盯上了...',
        icon: '😰',
        timeSlot: 'night',
        optionA: {
            text: '跑',
            emoji: '🏃',
            cost: -300,
            heatChange: 0
        },
        optionB: {
            text: '反抗',
            emoji: '👊',
            cost: 0,
            heatChange: 0,
            successRate: 50,
            failCost: -200,
            failHeatChange: 0
        }
    },
    {
        id: 'night_08',
        name: '剩余食材',
        description: '还剩很多食材，明天可能不新鲜。',
        icon: '🥬',
        timeSlot: 'night',
        optionA: {
            text: '打折甩卖',
            emoji: '📢',
            cost: 40,
            heatChange: 0
        },
        optionB: {
            text: '留着',
            emoji: '📦',
            cost: 0,
            heatChange: 0,
            successRate: 80,
            failHeatChange: -20
        }
    },
    {
        id: 'night_09',
        name: '清洁工大爷',
        description: '扫街大爷饿着肚子眼巴巴看着你...',
        icon: '🧹',
        timeSlot: 'night',
        optionA: {
            text: '请他吃',
            emoji: '🍜',
            cost: -8,
            heatChange: 15,
            effect: 'CLEANER_HELP'
        },
        optionB: {
            text: '无视',
            emoji: '🙈',
            cost: 0,
            heatChange: -10
        }
    },
    {
        id: 'night_10',
        name: '一天总结',
        description: '今天结束了，要不要花钱学习提升？',
        icon: '📚',
        timeSlot: 'night',
        optionA: {
            text: '花钱学习',
            emoji: '📖',
            cost: -100,
            heatChange: 0,
            effect: 'TOMORROW_BOOST'
        },
        optionB: {
            text: '早点休息',
            emoji: '😴',
            cost: 0,
            heatChange: 10
        }
    },
    {
        id: 'night_11',
        name: '深夜顾客',
        description: '一群年轻人深夜想吃烤冷面，愿意多付钱。',
        icon: '🌃',
        timeSlot: 'night',
        optionA: {
            text: '继续营业',
            emoji: '💪',
            cost: 150,
            heatChange: 10
        },
        optionB: {
            text: '关门休息',
            emoji: '🚪',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'night_12',
        name: '外卖平台邀请',
        description: '外卖平台邀请入驻，月费200但能扩大客源。',
        icon: '📱',
        timeSlot: 'night',
        optionA: {
            text: '入驻',
            emoji: '✅',
            cost: -200,
            heatChange: 30
        },
        optionB: {
            text: '不入驻',
            emoji: '❌',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'night_13',
        name: '收摊遇老友',
        description: '多年不见的老朋友路过，想叙叙旧。',
        icon: '👋',
        timeSlot: 'night',
        optionA: {
            text: '请他吃喝',
            emoji: '🍻',
            cost: -50,
            heatChange: 0,
            effect: 'OLD_FRIEND_HELP'
        },
        optionB: {
            text: '下次再聚',
            emoji: '📅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'night_14',
        name: '设备故障',
        description: '铁板有点问题，需要修理。',
        icon: '🔧',
        timeSlot: 'night',
        optionA: {
            text: '花钱修理',
            emoji: '🛠️',
            cost: -80,
            heatChange: 0
        },
        optionB: {
            text: '凑合用',
            emoji: '🤷',
            cost: 0,
            heatChange: 0,
            successRate: 70,
            failCost: -150,
            failHeatChange: -20
        }
    },
    {
        id: 'night_15',
        name: '夜市抽奖',
        description: '夜市举办抽奖活动，50元抽一次，大奖500元！',
        icon: '🎰',
        timeSlot: 'night',
        optionA: {
            text: '试试手气',
            emoji: '🎲',
            cost: -50,
            heatChange: 0,
            successRate: 20,
            failCost: 0,
            failHeatChange: 0,
            effect: 'WIN_500'
        },
        optionB: {
            text: '不赌',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'night_16',
        name: '明日计划',
        description: '明天要进货，多进点还是少进点？',
        icon: '📝',
        timeSlot: 'night',
        optionA: {
            text: '多进货',
            emoji: '📦',
            cost: -100,
            heatChange: 0,
            effect: 'MORE_STOCK'
        },
        optionB: {
            text: '少进货',
            emoji: '💰',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'night_17',
        name: '小偷出没',
        description: '有人想偷你的收银盒！',
        icon: '🦹',
        timeSlot: 'night',
        optionA: {
            text: '大声呼救',
            emoji: '📢',
            cost: 0,
            heatChange: 10
        },
        optionB: {
            text: '追过去',
            emoji: '🏃',
            cost: 0,
            heatChange: 20,
            successRate: 60,
            failCost: -200,
            failHeatChange: 0
        }
    },
    {
        id: 'night_18',
        name: '夜市歌手',
        description: '街头歌手想在你摊位旁表演，换取一份烤冷面。',
        icon: '🎸',
        timeSlot: 'night',
        optionA: {
            text: '同意',
            emoji: '🎵',
            cost: -8,
            heatChange: 25
        },
        optionB: {
            text: '拒绝',
            emoji: '🙅',
            cost: 0,
            heatChange: 0
        }
    },
    {
        id: 'night_19',
        name: '突发停电',
        description: '突然停电了！需要买蜡烛或者发电机。',
        icon: '🔦',
        timeSlot: 'night',
        optionA: {
            text: '买发电机',
            emoji: '⚡',
            cost: -300,
            heatChange: 20
        },
        optionB: {
            text: '点蜡烛',
            emoji: '🕯️',
            cost: -10,
            heatChange: 5
        }
    },
    {
        id: 'night_20',
        name: '明星光临',
        description: '有个明星来吃夜宵，要不要合影宣传？',
        icon: '⭐',
        timeSlot: 'night',
        optionA: {
            text: '合影宣传',
            emoji: '📸',
            cost: 0,
            heatChange: 80
        },
        optionB: {
            text: '保护隐私',
            emoji: '🤫',
            cost: 50,
            heatChange: 0
        }
    }
];

/**
 * 获取所有事件池
 */
export function getAllEvents(): RandomEvent[] {
    return [...LUNCH_EVENTS, ...AFTERNOON_EVENTS, ...DINNER_EVENTS, ...NIGHT_EVENTS];
}

/**
 * 根据时段获取事件池
 */
export function getEventsByTimeSlot(timeSlot: TimeSlot): RandomEvent[] {
    switch (timeSlot) {
        case 'lunch': return LUNCH_EVENTS;
        case 'afternoon': return AFTERNOON_EVENTS;
        case 'dinner': return DINNER_EVENTS;
        case 'night': return NIGHT_EVENTS;
    }
}

/**
 * 从事件池随机选取一个事件
 */
export function getRandomEvent(timeSlot: TimeSlot, excludeIds: string[] = []): RandomEvent | null {
    const pool = getEventsByTimeSlot(timeSlot).filter(e => excludeIds.indexOf(e.id) === -1);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

console.log('[RandomEventSystem] 📦 事件系统模块加载完成，共', getAllEvents().length, '个事件');
