import { SpecialEventTemplate, SpecialEventOption, SpecialEventEffect, TimeSlot, VoucherType } from './SpecialEventTypes';

const DEFAULT_SENDER = { name: '摊主', icon: '📌', role: '通知' };
const MAIN_LOSS: SpecialEventEffect = { mainIngredientDelta: -1 };

const SLOT_LABEL: Record<TimeSlot, string> = {
    lunch: '午市',
    afternoon: '下午',
    dinner: '晚高峰',
    night: '夜市'
};

const LEVEL_FOOD: Record<number, string> = {
    1: '烤冷面',
    2: '饭包',
    3: '锅包肉',
    4: '麻辣烫',
    5: '烧烤'
};

const OPTION_TEXT_MAP: Record<string, string> = {
    '冲刺': '咬牙冲刺',
    '挑战': '硬接挑战',
    '接单': '硬接此单',
    '接下': '接下硬单',
    '拒绝': '果断拒绝',
    '婉拒': '委婉推辞',
    '放慢': '稳守节奏',
    '放慢节奏': '稳住节奏',
    '放慢处理': '缓慢处理',
    '补救': '紧急补救',
    '补做': '加班补做',
    '补偿': '当场补偿',
    '止损': '先行止损',
    '补损': '自掏补损',
    '放弃': '放弃处理',
    '稳住': '稳住场面',
    '稳妥宣传': '稳妥铺宣',
    '请客宣传': '请客拉人',
    '摆宣传牌': '立刻摆牌',
    '简易贴纸': '贴个小贴',
    '宣传冲刺': '猛推宣传',
    '小宣传': '低调宣传',
    '大宣传': '加大宣传',
    '接赞助': '接下赞助',
    '公关处理': '公关安抚',
    '加急': '加钱加急',
    '坚持': '坚持营业',
    '收摊': '提前收摊',
    '最后一单': '再做一单',
    '完成任务': '接下任务',
    '换票挑战': '接票挑战',
    '换硬币': '换硬币单',
    '换券挑战': '接券挑战',
    '跳过': '暂时跳过',
    '顶住': '咬牙顶住',
    '手忙脚乱': '硬撑处理',
    '配合': '配合拍摄',
    '备用电': '启用备用',
    '买广告位': '抢广告位',
    '折扣补偿': '折扣补偿',
    '快速应对': '快速应对',
    '简单应对': '简单应对',
    '认真招待': '认真招待',
    '稳住口碑': '稳住口碑',
    '促销冲刺': '冲刺促销',
    '小额支持': '小额支持'
};

const enrichOptionText = (text: string) => OPTION_TEXT_MAP[text] ?? text;

const hasKeyword = (title: string, keywords: string[]) => {
    return keywords.some(keyword => title.indexOf(keyword) !== -1);
};

const buildStoryDescription = (levelId: number, slot: TimeSlot, title: string): string => {
    const slotLabel = SLOT_LABEL[slot] ?? '';
    const food = LEVEL_FOOD[levelId] ?? '小吃';
    const prefix = slotLabel ? `【${slotLabel}】` : '';

    if (hasKeyword(title, ['刮刮乐', '彩票'])) {
        return `${prefix}彩票站老板递来体验票，想用${food}换人气。接下这波吗？`;
    }
    if (hasKeyword(title, ['硬币', '扭蛋'])) {
        return `${prefix}扭蛋店在拉新，说做任务就给硬币。你要接还是跳过？`;
    }
    if (hasKeyword(title, ['赌石', '折扣券'])) {
        return `${prefix}赌石店老板来串门，许诺折扣券换任务。你要不要接？`;
    }
    if (hasKeyword(title, ['宣传', '赞助', '广告', '宣传牌', '贴纸'])) {
        return `${prefix}人流有点散，路过商家提议做宣传引流。花钱冲一波吗？`;
    }
    if (hasKeyword(title, ['插队', '争抢'])) {
        return `${prefix}队伍里起了插队争执，气氛紧张。你要强硬还是安抚？`;
    }
    if (hasKeyword(title, ['差评', '口碑', '回访'])) {
        return `${prefix}有人当场吐槽口味，口碑开始摇摆。你要补救还是无视？`;
    }
    if (hasKeyword(title, ['停电'])) {
        return `${prefix}街边临时断电，灶火变弱但单子还在排。你怎么处理？`;
    }
    if (hasKeyword(title, ['烫手'])) {
        return `${prefix}操作太急被烫到，动作变慢。要补救还是认赔？`;
    }
    if (hasKeyword(title, ['掉地', '撒落', '破损', '破洞', '被踩', '被碰翻', '结块', '翻车', '失误'])) {
        return `${prefix}${food}操作出小事故，材料有损耗但队伍还在排。如何处理？`;
    }
    if (hasKeyword(title, ['收摊', '打烊', '夜宵'])) {
        return `${prefix}快到收摊，夜宵客还在等。再冲一波还是早点收？`;
    }
    if (hasKeyword(title, ['彩头', '首单', '加倍'])) {
        return `${prefix}今天想讨个彩头，有人提议做个挑战换奖励。要试试吗？`;
    }
    if (hasKeyword(title, ['团单', '加急', '爆单', '冲刺', '挑战', '连击', '高峰', '预警', '预热', '加班族', '夜市'])) {
        return `${prefix}突然涌来一波订单，${food}摊前排成长龙。你要硬接还是稳守？`;
    }

    return `${prefix}${food}摊前忽然有情况，${title}让你左右为难。要怎么处理？`;
};

const resolveVoucherTier = (type: VoucherType, targetCount: number, timeLimit?: number): string => {
    if (type === 'lottery') {
        if (targetCount >= 6 || (timeLimit && timeLimit >= 420)) return 'gold';
        if (targetCount >= 4 || (timeLimit && timeLimit >= 300)) return 'silver';
        return 'bronze';
    }
    if (type === 'gacha') {
        if (targetCount >= 6 || (timeLimit && timeLimit >= 600)) return 'luxury';
        if (targetCount >= 4 || (timeLimit && timeLimit >= 420)) return 'premium';
        return 'normal';
    }
    if (type === 'stone') {
        if (targetCount >= 6 || (timeLimit && timeLimit >= 840)) return '1';
        if (targetCount >= 4 || (timeLimit && timeLimit >= 600)) return '5';
        return '8';
    }
    return 'normal';
};

const makeTaskDescription = (count: number, timeLimit?: number) => {
    return timeLimit ? `完成${count}单/${timeLimit}s` : `完成${count}单`;
};

const deliverOption = (
    text: string,
    emoji: string,
    count: number,
    timeLimit: number | undefined,
    success: SpecialEventEffect,
    fail?: SpecialEventEffect,
    voucherType?: VoucherType,
    voucherTier?: string
): SpecialEventOption => {
    const successEffect: SpecialEventEffect = { ...success };
    if (voucherType) {
        successEffect.voucher = {
            type: voucherType,
            tier: voucherTier ?? resolveVoucherTier(voucherType, count, timeLimit),
            count: 1
        };
    }
    return {
        text: enrichOptionText(text),
        emoji,
        task: {
            type: 'delivery',
            targetCount: count,
            timeLimit,
            description: makeTaskDescription(count, timeLimit)
        },
        successEffect,
        failEffect: fail
    };
};

const heatOption = (text: string, emoji: string, heat: number): SpecialEventOption => ({
    text: enrichOptionText(text),
    emoji,
    successEffect: { heat }
});

const moneyOption = (text: string, emoji: string, money: number, heat: number = 0): SpecialEventOption => ({
    text: enrichOptionText(text),
    emoji,
    successEffect: { money, heat }
});

const payOption = (text: string, emoji: string, cost: number, heat: number = 0): SpecialEventOption => ({
    text: enrichOptionText(text),
    emoji,
    successEffect: { money: -Math.abs(cost), heat }
});

const makeEvent = (
    levelId: number,
    slot: TimeSlot,
    id: string,
    title: string,
    optionA: SpecialEventOption,
    optionB: SpecialEventOption,
    description: string = ''
): SpecialEventTemplate => ({
    id,
    levelId,
    slot,
    title,
    description: description || buildStoryDescription(levelId, slot, title),
    sender: DEFAULT_SENDER,
    optionA,
    optionB
});

const L1_LUNCH: SpecialEventTemplate[] = [
    makeEvent(1, 'lunch', 'L1_M01', '开张打卡', deliverOption('冲刺', '✅', 2, 120, { money: 20, heat: 8 }), payOption('稳妥宣传', '💸', 15, 6)),
    makeEvent(1, 'lunch', 'L1_M02', '赶早上班族', deliverOption('冲刺', '🏃', 3, 180, { money: 35 }), heatOption('放慢节奏', '⏳', -6)),
    makeEvent(1, 'lunch', 'L1_M03', '刮刮乐体验票', deliverOption('换票挑战', '🎫', 3, 210, { heat: 5 }, undefined, 'lottery'), heatOption('婉拒', '🙅', -8)),
    makeEvent(1, 'lunch', 'L1_M04', '面饼手滑', deliverOption('挽回', '🫓', 2, 150, { money: 15 }, MAIN_LOSS), payOption('补损', '💸', 10)),
    makeEvent(1, 'lunch', 'L1_M05', '口碑试吃', deliverOption('补做', '🥢', 2, undefined, { heat: 10 }), payOption('请客宣传', '🎁', 20, 12)),
    makeEvent(1, 'lunch', 'L1_M06', '插队风波', deliverOption('快速应对', '⚡', 3, 180, { heat: 8 }), heatOption('放慢处理', '😓', -10)),
    makeEvent(1, 'lunch', 'L1_M07', '鸡蛋磕裂', deliverOption('顶住', '🥚', 2, 120, { money: 10 }, MAIN_LOSS), payOption('止损', '💸', 8)),
    makeEvent(1, 'lunch', 'L1_M08', '香肠掉地', deliverOption('补救', '🌭', 3, 180, { money: 18 }, MAIN_LOSS), heatOption('放弃', '😞', -6)),
    makeEvent(1, 'lunch', 'L1_M09', '小宣传牌', payOption('摆宣传牌', '📣', 30, 18), payOption('简易贴纸', '📝', 10, 6)),
    makeEvent(1, 'lunch', 'L1_M10', '临时加急', deliverOption('接下', '🔥', 4, 240, { money: 45 }), heatOption('拒绝', '🙅', -8)),
    makeEvent(1, 'lunch', 'L1_M11', '老客带新客', deliverOption('认真招待', '😊', 3, undefined, { heat: 12 }), deliverOption('简单应对', '🙂', 2, undefined, { heat: 6 })),
    makeEvent(1, 'lunch', 'L1_M12', '今日首单彩头', deliverOption('首单挑战', '🎯', 2, undefined, {}, undefined, 'lottery'), payOption('改用宣传', '💸', 15, 6))
];

const L1_AFTERNOON: SpecialEventTemplate[] = [
    makeEvent(1, 'afternoon', 'L1_N01', '写字楼团单', deliverOption('接单', '📦', 5, 300, { money: 70, heat: 8 }), heatOption('拒绝', '🙅', -10)),
    makeEvent(1, 'afternoon', 'L1_N02', '主播冲刺', deliverOption('冲刺', '📺', 6, 360, { money: 30, heat: 20 }), heatOption('婉拒', '😓', -8)),
    makeEvent(1, 'afternoon', 'L1_N03', '刮刮乐换餐', deliverOption('完成任务', '🎫', 4, 240, { money: 10 }, undefined, 'lottery'), payOption('付费平息', '💸', 20, 10)),
    makeEvent(1, 'afternoon', 'L1_N04', '摊位被围观', deliverOption('稳住', '😎', 4, 240, { heat: 15 }), heatOption('放慢', '😶', -6)),
    makeEvent(1, 'afternoon', 'L1_N05', '油纸烫手', deliverOption('赶紧补', '🧻', 3, 210, { money: 30 }, MAIN_LOSS), payOption('补偿', '💸', 12)),
    makeEvent(1, 'afternoon', 'L1_N06', '差评危机', deliverOption('补救', '🧯', 3, 180, { heat: 12 }), payOption('公关处理', '💸', 25, 12)),
    makeEvent(1, 'afternoon', 'L1_N07', '香肠党来袭', deliverOption('冲刺', '🌭', 5, 300, { money: 55 }, MAIN_LOSS), heatOption('放弃', '😓', -8)),
    makeEvent(1, 'afternoon', 'L1_N08', '鸡蛋党来袭', deliverOption('冲刺', '🥚', 5, 300, { money: 55 }, MAIN_LOSS), heatOption('放弃', '😓', -8)),
    makeEvent(1, 'afternoon', 'L1_N09', '临时停电', deliverOption('手忙脚乱', '⚡', 3, 240, { money: 20 }), payOption('备用电', '💸', 20)),
    makeEvent(1, 'afternoon', 'L1_N10', '排队拍照', deliverOption('配合', '📸', 4, 240, { heat: 18 }), heatOption('拒绝', '🙅', -6)),
    makeEvent(1, 'afternoon', 'L1_N11', '小额赞助', payOption('接赞助', '💸', 40, 22), payOption('小额支持', '💸', 15, 8)),
    makeEvent(1, 'afternoon', 'L1_N12', '午间加倍券', deliverOption('冲刺', '🎟️', 6, 420, {}, undefined, 'lottery'), heatOption('跳过', '😞', -10))
];

const L1_DINNER: SpecialEventTemplate[] = [
    makeEvent(1, 'dinner', 'L1_E01', '夜市爆单预演', deliverOption('挑战', '🔥', 7, 420, { money: 90, heat: 10 }), heatOption('放弃', '😓', -12)),
    makeEvent(1, 'dinner', 'L1_E02', '加班族冲刺', deliverOption('接单', '💼', 6, 360, { money: 75 }), heatOption('拒绝', '🙅', -8)),
    makeEvent(1, 'dinner', 'L1_E03', '王牌摊位', payOption('买广告位', '📣', 60, 28), payOption('小宣传', '💸', 20, 10)),
    makeEvent(1, 'dinner', 'L1_E04', '刮刮乐加注', deliverOption('冲刺', '🎫', 5, 360, { money: 15 }, undefined, 'lottery'), heatOption('放弃', '😓', -8)),
    makeEvent(1, 'dinner', 'L1_E05', '面饼翻面失误', deliverOption('补救', '🫓', 4, 240, { money: 35 }, MAIN_LOSS), payOption('补偿', '💸', 15)),
    makeEvent(1, 'dinner', 'L1_E06', '订单连击', deliverOption('高难度', '🏆', 8, 480, { money: 110 }), deliverOption('中等难度', '✅', 5, 300, { money: 55 })),
    makeEvent(1, 'dinner', 'L1_E07', '香肠告急', deliverOption('稳住', '🌭', 5, 300, { money: 45 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(1, 'dinner', 'L1_E08', '鸡蛋碎裂', deliverOption('稳住', '🥚', 5, 300, { money: 45 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(1, 'dinner', 'L1_E09', '争抢摊位', deliverOption('加速', '⚡', 4, 240, { heat: 15 }), heatOption('让步', '😓', -12)),
    makeEvent(1, 'dinner', 'L1_E10', '口碑回访', deliverOption('补做', '🥢', 3, 180, { heat: 12 }), payOption('公关处理', '💸', 30, 18)),
    makeEvent(1, 'dinner', 'L1_E11', '临时促销', deliverOption('促销冲刺', '🛎️', 6, 360, { money: 60, heat: 8 }), payOption('折扣补偿', '💸', 20, 12)),
    makeEvent(1, 'dinner', 'L1_E12', '晚间券引导', deliverOption('冲刺', '🎟️', 6, 420, {}, undefined, 'lottery'), heatOption('跳过', '😞', -10))
];

const L1_NIGHT: SpecialEventTemplate[] = [
    makeEvent(1, 'night', 'L1_T01', '打烊前冲刺', deliverOption('冲刺', '🏁', 3, 180, { money: 35, heat: 6 }), heatOption('收摊', '😴', -6)),
    makeEvent(1, 'night', 'L1_T02', '深夜刮刮乐票', deliverOption('完成任务', '🎫', 2, undefined, {}, undefined, 'lottery'), heatOption('跳过', '😞', -5)),
    makeEvent(1, 'night', 'L1_T03', '余料撒落', deliverOption('补救', '🫓', 1, 120, { money: 10 }, MAIN_LOSS), payOption('补偿', '💸', 10)),
    makeEvent(1, 'night', 'L1_T04', '情绪化差评', deliverOption('补做', '😤', 2, 180, { heat: 8 }), heatOption('不理', '🙅', -10)),
    makeEvent(1, 'night', 'L1_T05', '夜宵加班族', deliverOption('接单', '🌙', 4, 240, { money: 50 }), heatOption('拒绝', '😓', -6)),
    makeEvent(1, 'night', 'L1_T06', '结尾宣传', payOption('宣传冲刺', '📣', 20, 12), payOption('小宣传', '💸', 8, 5)),
    makeEvent(1, 'night', 'L1_T07', '香肠被顺走', deliverOption('补救', '🌭', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(1, 'night', 'L1_T08', '鸡蛋被碰碎', deliverOption('补救', '🥚', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(1, 'night', 'L1_T09', '送走最后一波', deliverOption('坚持', '💪', 3, 240, { heat: 10 }), heatOption('不加班', '😴', -5)),
    makeEvent(1, 'night', 'L1_T10', '夜市口碑', deliverOption('稳住口碑', '⭐', 2, 180, { heat: 8 }), heatOption('放弃', '😞', -4)),
    makeEvent(1, 'night', 'L1_T11', '刮刮乐最后一张', deliverOption('冲刺', '🎫', 3, 240, {}, undefined, 'lottery'), payOption('改用宣传', '💸', 15, 6)),
    makeEvent(1, 'night', 'L1_T12', '收摊', deliverOption('最后一单', '✅', 1, 120, { money: 8 }), heatOption('直接收摊', '😴', -3))
];

const L2_LUNCH: SpecialEventTemplate[] = [
    makeEvent(2, 'lunch', 'L2_M01', '开张冲刺', deliverOption('冲刺', '✅', 2, 150, { money: 25, heat: 6 }), heatOption('放慢', '⏳', -5)),
    makeEvent(2, 'lunch', 'L2_M02', '并行调度练习', deliverOption('挑战', '🧠', 3, 240, { money: 40 }), heatOption('放弃', '🙅', -6)),
    makeEvent(2, 'lunch', 'L2_M03', '扭蛋硬币体验', deliverOption('换硬币', '🪙', 3, 240, { heat: 5 }, undefined, 'gacha'), heatOption('婉拒', '😓', -8)),
    makeEvent(2, 'lunch', 'L2_M04', '菜叶破损', deliverOption('补救', '🥬', 2, 180, { money: 15 }, MAIN_LOSS), payOption('补偿', '💸', 10)),
    makeEvent(2, 'lunch', 'L2_M05', '主料掉地', deliverOption('补救', '🥔', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(2, 'lunch', 'L2_M06', '主料撒落', deliverOption('补救', '🍚', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(2, 'lunch', 'L2_M07', '葱香争议', deliverOption('耐心处理', '🧅', 3, 210, { heat: 10 }), heatOption('忽略', '🙅', -6)),
    makeEvent(2, 'lunch', 'L2_M08', '香菜党争议', deliverOption('耐心处理', '🌿', 3, 210, { heat: 10 }), heatOption('忽略', '🙅', -6)),
    makeEvent(2, 'lunch', 'L2_M09', '摆摊宣传', payOption('大宣传', '📣', 30, 16), payOption('小宣传', '💸', 12, 7)),
    makeEvent(2, 'lunch', 'L2_M10', '连续出餐', deliverOption('冲刺', '🔥', 4, 300, { money: 55 }), deliverOption('缓冲', '✅', 2, 180, { money: 20 })),
    makeEvent(2, 'lunch', 'L2_M11', '今日彩头硬币', deliverOption('完成任务', '🪙', 2, undefined, {}, undefined, 'gacha'), heatOption('跳过', '😞', -5)),
    makeEvent(2, 'lunch', 'L2_M12', '手忙脚乱', deliverOption('稳住', '🫠', 3, 210, { money: 35 }, MAIN_LOSS), payOption('止损', '💸', 15))
];

const L2_AFTERNOON: SpecialEventTemplate[] = [
    makeEvent(2, 'afternoon', 'L2_N01', '社区团单', deliverOption('接单', '📦', 5, 420, { money: 75, heat: 8 }), heatOption('拒绝', '🙅', -10)),
    makeEvent(2, 'afternoon', 'L2_N02', '高峰并行', deliverOption('挑战', '⚡', 6, 480, { money: 90 }), heatOption('放弃', '😓', -10)),
    makeEvent(2, 'afternoon', 'L2_N03', '扭蛋硬币奖励', deliverOption('换硬币', '🪙', 4, 360, { money: 10 }, undefined, 'gacha'), heatOption('跳过', '😞', -8)),
    makeEvent(2, 'afternoon', 'L2_N04', '蒸锅忙不过来', deliverOption('顶住', '🥘', 4, 360, { money: 55 }, MAIN_LOSS), payOption('加急', '💸', 20)),
    makeEvent(2, 'afternoon', 'L2_N05', '拌料失误', deliverOption('补救', '🥣', 3, 240, { heat: 12 }, MAIN_LOSS), heatOption('忽略', '🙅', -8)),
    makeEvent(2, 'afternoon', 'L2_N06', '老客带队', deliverOption('稳住', '😄', 4, 300, { heat: 15 }), heatOption('拒绝', '😓', -6)),
    makeEvent(2, 'afternoon', 'L2_N07', '赶时间外卖', deliverOption('冲刺', '🚴', 5, 360, { money: 70 }), heatOption('拒绝', '🙅', -8)),
    makeEvent(2, 'afternoon', 'L2_N08', '主料不足', deliverOption('补救', '🥬', 3, 240, { money: 30 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(2, 'afternoon', 'L2_N09', '鸡蛋酱翻车', deliverOption('补救', '🍳', 3, 240, { money: 30 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(2, 'afternoon', 'L2_N10', '午间宣传', payOption('大宣传', '📣', 40, 20), payOption('小宣传', '💸', 15, 8)),
    makeEvent(2, 'afternoon', 'L2_N11', '午间硬币引导', deliverOption('冲刺', '🪙', 6, 540, {}, undefined, 'gacha'), heatOption('跳过', '😞', -10)),
    makeEvent(2, 'afternoon', 'L2_N12', '口碑回访', deliverOption('补做', '🥢', 3, 240, { heat: 12 }), payOption('公关处理', '💸', 30, 18))
];

const L2_DINNER: SpecialEventTemplate[] = [
    makeEvent(2, 'dinner', 'L2_E01', '晚高峰爆单', deliverOption('冲刺', '🔥', 7, 600, { money: 110, heat: 10 }), heatOption('拒绝', '🙅', -12)),
    makeEvent(2, 'dinner', 'L2_E02', '连续出餐挑战', deliverOption('高难度', '🏆', 8, 660, { money: 130 }), deliverOption('中难度', '✅', 5, 420, { money: 70 })),
    makeEvent(2, 'dinner', 'L2_E03', '晚间硬币奖励', deliverOption('换硬币', '🪙', 5, 480, { money: 15 }, undefined, 'gacha'), heatOption('跳过', '😓', -8)),
    makeEvent(2, 'dinner', 'L2_E04', '主料被踩', deliverOption('补救', '🥬', 4, 360, { money: 35 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(2, 'dinner', 'L2_E05', '主料被碰翻', deliverOption('补救', '🍚', 4, 360, { money: 35 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(2, 'dinner', 'L2_E06', '主料蒸过头', deliverOption('补救', '🥔', 4, 360, { money: 35 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(2, 'dinner', 'L2_E07', '葱香加成', deliverOption('冲刺', '🧅', 6, 420, { heat: 18 }), heatOption('放弃', '😓', -8)),
    makeEvent(2, 'dinner', 'L2_E08', '香菜加成', deliverOption('冲刺', '🌿', 6, 420, { heat: 18 }), heatOption('放弃', '😓', -8)),
    makeEvent(2, 'dinner', 'L2_E09', '争抢摊位', deliverOption('坚持', '💪', 5, 360, { heat: 15 }), heatOption('让步', '😓', -12)),
    makeEvent(2, 'dinner', 'L2_E10', '晚间宣传', payOption('大宣传', '📣', 60, 26), payOption('小宣传', '💸', 20, 10)),
    makeEvent(2, 'dinner', 'L2_E11', '晚间硬币引导', deliverOption('冲刺', '🪙', 7, 660, {}, undefined, 'gacha'), heatOption('跳过', '😞', -10)),
    makeEvent(2, 'dinner', 'L2_E12', '收尾冲刺', deliverOption('冲刺', '🏁', 5, 420, { money: 70 }), heatOption('放弃', '😓', -6))
];

const L2_NIGHT: SpecialEventTemplate[] = [
    makeEvent(2, 'night', 'L2_T01', '打烊前冲刺', deliverOption('冲刺', '🏁', 3, 240, { money: 40, heat: 6 }), heatOption('收摊', '😴', -5)),
    makeEvent(2, 'night', 'L2_T02', '夜宵硬币', deliverOption('完成任务', '🪙', 2, undefined, {}, undefined, 'gacha'), heatOption('跳过', '😞', -5)),
    makeEvent(2, 'night', 'L2_T03', '主料破洞', deliverOption('补救', '🥬', 2, 180, { money: 15 }, MAIN_LOSS), payOption('补偿', '💸', 10)),
    makeEvent(2, 'night', 'L2_T04', '主料撒落', deliverOption('补救', '🥔', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(2, 'night', 'L2_T05', '主料撒落', deliverOption('补救', '🍚', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(2, 'night', 'L2_T06', '夜市口碑', deliverOption('坚持', '⭐', 3, 240, { heat: 10 }), heatOption('收摊', '😓', -5)),
    makeEvent(2, 'night', 'L2_T07', '结尾宣传', payOption('宣传冲刺', '📣', 20, 12), payOption('小宣传', '💸', 8, 5)),
    makeEvent(2, 'night', 'L2_T08', '临时插队', deliverOption('稳住', '🧑‍🍳', 2, 180, { heat: 8 }), heatOption('拒绝', '🙅', -8)),
    makeEvent(2, 'night', 'L2_T09', '最后一波出餐', deliverOption('冲刺', '🏁', 4, 300, { money: 55 }), heatOption('放弃', '😓', -6)),
    makeEvent(2, 'night', 'L2_T10', '夜宵加班族', deliverOption('接单', '🌙', 3, 240, { money: 40 }), heatOption('拒绝', '🙅', -6)),
    makeEvent(2, 'night', 'L2_T11', '夜宵硬币引导', deliverOption('完成任务', '🪙', 3, 300, {}, undefined, 'gacha'), heatOption('跳过', '😞', -6)),
    makeEvent(2, 'night', 'L2_T12', '收摊', deliverOption('最后一单', '✅', 1, 120, { money: 8 }), heatOption('直接收摊', '😴', -3))
];

const L3_LUNCH: SpecialEventTemplate[] = [
    makeEvent(3, 'lunch', 'L3_M01', '开张冲刺', deliverOption('冲刺', '✅', 2, 180, { money: 25, heat: 6 }), heatOption('放慢', '⏳', -5)),
    makeEvent(3, 'lunch', 'L3_M02', '口味宣传', payOption('宣传冲刺', '📣', 30, 16), payOption('小宣传', '💸', 12, 7)),
    makeEvent(3, 'lunch', 'L3_M03', '赌石折扣券体验', deliverOption('换券挑战', '🎟️', 3, 300, { heat: 5 }, undefined, 'stone'), heatOption('婉拒', '😓', -8)),
    makeEvent(3, 'lunch', 'L3_M04', '主料掉地', deliverOption('补救', '🥩', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'lunch', 'L3_M05', '淀粉结块', deliverOption('补救', '🥣', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'lunch', 'L3_M06', '配菜散落', deliverOption('补救', '🥕', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'lunch', 'L3_M07', '姜丝散落', deliverOption('补救', '🫚', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'lunch', 'L3_M08', '葱丝散落', deliverOption('补救', '🧅', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'lunch', 'L3_M09', '开张口碑', deliverOption('稳住', '⭐', 3, 240, { heat: 10 }), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'lunch', 'L3_M10', '小冲刺', deliverOption('冲刺', '🏁', 4, 360, { money: 55 }), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'lunch', 'L3_M11', '今日彩头赌石券', deliverOption('完成任务', '🎟️', 2, undefined, {}, undefined, 'stone'), heatOption('跳过', '😞', -5)),
    makeEvent(3, 'lunch', 'L3_M12', '手忙脚乱', deliverOption('稳住', '😵', 3, 300, { money: 40 }, MAIN_LOSS), payOption('止损', '💸', 15))
];

const L3_AFTERNOON: SpecialEventTemplate[] = [
    makeEvent(3, 'afternoon', 'L3_N01', '剧组加急', deliverOption('接单', '🎬', 5, 600, { money: 85, heat: 8 }), heatOption('拒绝', '🙅', -10)),
    makeEvent(3, 'afternoon', 'L3_N02', '午高峰爆单', deliverOption('冲刺', '🔥', 6, 720, { money: 110, heat: 10 }), heatOption('拒绝', '🙅', -12)),
    makeEvent(3, 'afternoon', 'L3_N03', '赌石折扣券奖励', deliverOption('换券挑战', '🎟️', 4, 540, { money: 10 }, undefined, 'stone'), heatOption('跳过', '😞', -8)),
    makeEvent(3, 'afternoon', 'L3_N04', '炸锅节奏', deliverOption('稳住', '🍳', 5, 600, { money: 80 }, MAIN_LOSS), payOption('加急', '💸', 20)),
    makeEvent(3, 'afternoon', 'L3_N05', '炒锅翻车', deliverOption('补救', '🥘', 4, 480, { money: 60 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'afternoon', 'L3_N06', '口碑回访', deliverOption('补做', '🥢', 3, 240, { heat: 12 }), payOption('公关处理', '💸', 30, 18)),
    makeEvent(3, 'afternoon', 'L3_N07', '里脊损耗', deliverOption('补救', '🥩', 4, 360, { money: 45 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'afternoon', 'L3_N08', '淀粉损耗', deliverOption('补救', '🥣', 4, 360, { money: 45 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'afternoon', 'L3_N09', '萝卜姜葱三拼', deliverOption('应对', '🥕', 4, 360, { heat: 15 }), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'afternoon', 'L3_N10', '午间宣传', payOption('大宣传', '📣', 40, 20), payOption('小宣传', '💸', 15, 8)),
    makeEvent(3, 'afternoon', 'L3_N11', '午间赌石券引导', deliverOption('冲刺', '🎟️', 6, 840, {}, undefined, 'stone'), heatOption('跳过', '😞', -10)),
    makeEvent(3, 'afternoon', 'L3_N12', '午间冲刺', deliverOption('冲刺', '🏁', 5, 600, { money: 80 }), heatOption('放弃', '😓', -8))
];

const L3_DINNER: SpecialEventTemplate[] = [
    makeEvent(3, 'dinner', 'L3_E01', '晚高峰爆单', deliverOption('冲刺', '🔥', 7, 900, { money: 140, heat: 12 }), heatOption('拒绝', '🙅', -12)),
    makeEvent(3, 'dinner', 'L3_E02', '连续出餐挑战', deliverOption('高难度', '🏆', 8, 960, { money: 165 }), deliverOption('中难度', '✅', 5, 660, { money: 95 })),
    makeEvent(3, 'dinner', 'L3_E03', '晚间赌石券奖励', deliverOption('换券挑战', '🎟️', 5, 780, { money: 15 }, undefined, 'stone'), heatOption('跳过', '😞', -8)),
    makeEvent(3, 'dinner', 'L3_E04', '争抢摊位', deliverOption('坚持', '💪', 5, 420, { heat: 15 }), heatOption('让步', '😓', -12)),
    makeEvent(3, 'dinner', 'L3_E05', '里脊被顺走', deliverOption('补救', '🥩', 4, 360, { money: 45 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'dinner', 'L3_E06', '淀粉被打翻', deliverOption('补救', '🥣', 4, 360, { money: 45 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'dinner', 'L3_E07', '配菜被踩', deliverOption('补救', '🥕', 4, 360, { money: 45 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'dinner', 'L3_E08', '葱姜被碰翻', deliverOption('补救', '🧅', 4, 360, { money: 45 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'dinner', 'L3_E09', '晚间宣传', payOption('大宣传', '📣', 60, 26), payOption('小宣传', '💸', 20, 10)),
    makeEvent(3, 'dinner', 'L3_E10', '口碑爆发', deliverOption('冲刺', '⭐', 6, 480, { heat: 18 }), heatOption('放弃', '😓', -8)),
    makeEvent(3, 'dinner', 'L3_E11', '晚间赌石券引导', deliverOption('冲刺', '🎟️', 7, 1020, {}, undefined, 'stone'), heatOption('跳过', '😞', -10)),
    makeEvent(3, 'dinner', 'L3_E12', '收尾冲刺', deliverOption('冲刺', '🏁', 5, 720, { money: 95 }), heatOption('放弃', '😓', -6))
];

const L3_NIGHT: SpecialEventTemplate[] = [
    makeEvent(3, 'night', 'L3_T01', '打烊前冲刺', deliverOption('冲刺', '🏁', 3, 360, { money: 45, heat: 6 }), heatOption('收摊', '😴', -5)),
    makeEvent(3, 'night', 'L3_T02', '夜宵赌石券', deliverOption('完成任务', '🎟️', 2, undefined, {}, undefined, 'stone'), heatOption('跳过', '😞', -5)),
    makeEvent(3, 'night', 'L3_T03', '肉片撒落', deliverOption('补救', '🥩', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'night', 'L3_T04', '淀粉结块', deliverOption('补救', '🥣', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'night', 'L3_T05', '配菜散落', deliverOption('补救', '🥕', 2, 180, { money: 15 }, MAIN_LOSS), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'night', 'L3_T06', '夜市口碑', deliverOption('坚持', '⭐', 3, 240, { heat: 10 }), heatOption('收摊', '😓', -5)),
    makeEvent(3, 'night', 'L3_T07', '结尾宣传', payOption('宣传冲刺', '📣', 20, 12), payOption('小宣传', '💸', 8, 5)),
    makeEvent(3, 'night', 'L3_T08', '临时插队', deliverOption('稳住', '🧑‍🍳', 2, 180, { heat: 8 }), heatOption('拒绝', '🙅', -8)),
    makeEvent(3, 'night', 'L3_T09', '最后一波出餐', deliverOption('冲刺', '🏁', 4, 480, { money: 65 }), heatOption('放弃', '😓', -6)),
    makeEvent(3, 'night', 'L3_T10', '夜宵加班族', deliverOption('接单', '🌙', 3, 420, { money: 50 }), heatOption('拒绝', '🙅', -6)),
    makeEvent(3, 'night', 'L3_T11', '夜宵赌石券引导', deliverOption('完成任务', '🎟️', 3, 480, {}, undefined, 'stone'), heatOption('跳过', '😞', -6)),
    makeEvent(3, 'night', 'L3_T12', '收摊', deliverOption('最后一单', '✅', 1, 120, { money: 8 }), heatOption('直接收摊', '😴', -3))
];

const buildFallbackTemplates = (levelId: number): SpecialEventTemplate[] => {
    return [
        makeEvent(levelId, 'lunch', `L${levelId}_G01`, '开张冲刺', deliverOption('冲刺', '✅', 2, 180, { money: 20, heat: 5 }), heatOption('放慢', '⏳', -5)),
        makeEvent(levelId, 'lunch', `L${levelId}_G02`, '口碑宣传', payOption('宣传冲刺', '📣', 30, 12), heatOption('跳过', '😞', -5)),
        makeEvent(levelId, 'lunch', `L${levelId}_G03`, '高峰预热', deliverOption('冲刺', '🔥', 3, 240, { money: 30 }), heatOption('放弃', '😓', -6)),
        makeEvent(levelId, 'lunch', `L${levelId}_G04`, '临时插队', deliverOption('稳住', '🧑‍🍳', 2, 180, { heat: 6 }), heatOption('拒绝', '🙅', -6)),
        makeEvent(levelId, 'afternoon', `L${levelId}_G05`, '午后冲刺', deliverOption('冲刺', '🏁', 4, 360, { money: 45, heat: 6 }), heatOption('放弃', '😓', -8)),
        makeEvent(levelId, 'afternoon', `L${levelId}_G06`, '口碑回访', deliverOption('补做', '🥢', 3, 240, { heat: 10 }), payOption('公关处理', '💸', 20, 8)),
        makeEvent(levelId, 'afternoon', `L${levelId}_G07`, '高峰预警', deliverOption('接单', '📦', 5, 480, { money: 60 }), heatOption('拒绝', '🙅', -10)),
        makeEvent(levelId, 'afternoon', `L${levelId}_G08`, '设备忙乱', deliverOption('补救', '🧰', 3, 300, { money: 35 }, MAIN_LOSS), payOption('止损', '💸', 15)),
        makeEvent(levelId, 'dinner', `L${levelId}_G09`, '晚高峰爆单', deliverOption('冲刺', '🔥', 6, 600, { money: 90, heat: 8 }), heatOption('拒绝', '🙅', -12)),
        makeEvent(levelId, 'dinner', `L${levelId}_G10`, '晚间宣传', payOption('大宣传', '📣', 50, 20), payOption('小宣传', '💸', 20, 8)),
        makeEvent(levelId, 'dinner', `L${levelId}_G11`, '连击挑战', deliverOption('高难度', '🏆', 7, 720, { money: 110 }), deliverOption('中难度', '✅', 4, 420, { money: 60 })),
        makeEvent(levelId, 'dinner', `L${levelId}_G12`, '临时状况', deliverOption('补救', '🧯', 4, 360, { money: 45 }, MAIN_LOSS), heatOption('放弃', '😓', -8)),
        makeEvent(levelId, 'night', `L${levelId}_G13`, '打烊前冲刺', deliverOption('冲刺', '🏁', 3, 240, { money: 35, heat: 5 }), heatOption('收摊', '😴', -5)),
        makeEvent(levelId, 'night', `L${levelId}_G14`, '夜市口碑', deliverOption('坚持', '⭐', 2, 180, { heat: 8 }), heatOption('放弃', '😞', -5)),
        makeEvent(levelId, 'night', `L${levelId}_G15`, '夜宵加班族', deliverOption('接单', '🌙', 3, 300, { money: 40 }), heatOption('拒绝', '🙅', -6)),
        makeEvent(levelId, 'night', `L${levelId}_G16`, '收摊', deliverOption('最后一单', '✅', 1, 120, { money: 8 }), heatOption('直接收摊', '😴', -3))
    ];
};

const LEVEL1_EVENTS = [...L1_LUNCH, ...L1_AFTERNOON, ...L1_DINNER, ...L1_NIGHT];
const LEVEL2_EVENTS = [...L2_LUNCH, ...L2_AFTERNOON, ...L2_DINNER, ...L2_NIGHT];
const LEVEL3_EVENTS = [...L3_LUNCH, ...L3_AFTERNOON, ...L3_DINNER, ...L3_NIGHT];

export const getSpecialEventTemplates = (levelId: number): SpecialEventTemplate[] => {
    if (levelId === 1) return LEVEL1_EVENTS;
    if (levelId === 2) return LEVEL2_EVENTS;
    if (levelId === 3) return LEVEL3_EVENTS;
    if (levelId === 4 || levelId === 5) return buildFallbackTemplates(levelId);
    return LEVEL1_EVENTS;
};

export const getAllSpecialEventTemplates = (): SpecialEventTemplate[] => {
    return [...LEVEL1_EVENTS, ...LEVEL2_EVENTS, ...LEVEL3_EVENTS, ...buildFallbackTemplates(4), ...buildFallbackTemplates(5)];
};
