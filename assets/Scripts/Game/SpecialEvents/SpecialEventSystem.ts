import { _decorator, Component, Node, Label, Color, UITransform, Graphics, Button, Vec3, tween, BlockInputEvents } from 'cc';
import { GameProgressManager } from '../../Manager/GameProgressManager';
import { SpecialEventTemplate, SpecialEventOption, SpecialEventEffect, TimeSlot } from './SpecialEventTypes';
import { getSpecialEventTemplates } from './SpecialEventTemplates';
import { SpecialEventVoucherManager } from './SpecialEventVoucherManager';
import { EventManager, GameEvents } from '../../Utils/EventManager';
import { SpecialEventTextOverrides } from './SpecialEventTextOverrides';

const { ccclass } = _decorator;

interface SpecialEventCallbacks {
    getLevelId: () => number;
    areAllCustomersCleared: () => boolean;
    setCustomerClearing: (clearing: boolean) => void;
    setEventPhase?: (active: boolean) => void;
    markLegacyTrigger?: (hour: number, minute: number) => void;
    showMessage: (message: string) => void;
    addEventMessage?: (sender: string, icon: string, content: string, eventId: string) => void;
    getMoney?: () => number;
    getMainIngredientCount?: () => number;
    applyMoneyDelta: (delta: number) => boolean;
    applyHeatDelta: (delta: number) => void;
    applyMainIngredientDelta: (delta: number) => boolean;
    isBusinessOpen?: () => boolean;
}

interface TaskState {
    event: SpecialEventTemplate;
    option: SpecialEventOption;
    progress: number;
    timeLimit?: number;
    remainingTime?: number;
}

@ccclass('SpecialEventSystem')
export class SpecialEventSystem extends Component {
    private callbacks: SpecialEventCallbacks | null = null;
    private templates: SpecialEventTemplate[] = [];
    private triggeredEventIds = new Set<string>();
    private triggeredSlots = new Set<TimeSlot>();
    private currentDay = 1;

    private pendingEvent: SpecialEventTemplate | null = null;
    private waitingForClear = false;
    private waitingElapsed = 0;
    private waitingTotal = 0;

    private popupNode: Node | null = null;
    private popupTitle: Label | null = null;
    private popupDesc: Label | null = null;
    private popupSender: Label | null = null;
    private optionABtn: Node | null = null;
    private optionBBtn: Node | null = null;
    private optionALabel: Label | null = null;
    private optionBLabel: Label | null = null;

    private taskState: TaskState | null = null;
    private taskPanel: Node | null = null;
    private taskLabel: Label | null = null;
    private taskTimeLabel: Label | null = null;

    private isEventActive = false;
    private orderCompleteHandler: ((payload?: any) => void) | null = null;

    public initialize(callbacks: SpecialEventCallbacks) {
        this.callbacks = callbacks;
        this.refreshTemplates();
        this.currentDay = this.getCurrentDay();
        this.orderCompleteHandler = () => this.handleOrderComplete();
        EventManager.Instance.on(GameEvents.ORDER_COMPLETE, this.orderCompleteHandler);
        SpecialEventVoucherManager.instance.cleanupExpired(this.currentDay);
        SpecialEventTextOverrides.instance.ensureLoaded();
        console.log('[SpecialEventSystem] 初始化完成');
    }

    onDestroy() {
        if (this.orderCompleteHandler) {
            EventManager.Instance.off(GameEvents.ORDER_COMPLETE, this.orderCompleteHandler);
        }
    }

    update(dt: number) {
        this.checkDayChange();
        if (this.taskState) {
            this.tickTaskTimer(dt);
        }
        if (this.waitingForClear) {
            this.waitingElapsed += dt;
            this.waitingTotal += dt;
            if (this.waitingElapsed >= 0.5) {
                this.waitingElapsed = 0;
                this.checkCustomerCleared();
            }
        }
    }

    public checkTrigger(hour: number, minute: number): boolean {
        if (!this.callbacks) return false;
        if (this.isEventActive || this.taskState || this.pendingEvent) return false;
        if (this.callbacks.isBusinessOpen && !this.callbacks.isBusinessOpen()) return false;

        const slot = this.resolveTimeSlot(hour, minute);
        if (!slot) return false;
        if (this.triggeredSlots.has(slot)) return false;

        const event = this.pickEvent(slot);
        if (!event) return false;

        this.triggeredSlots.add(slot);
        if (this.callbacks.markLegacyTrigger) {
            this.callbacks.markLegacyTrigger(hour, minute);
        }
        this.pendingEvent = event;
        this.waitForCustomerClear();
        return true;
    }

    private resolveTimeSlot(hour: number, minute: number): TimeSlot | null {
        const currentTime = hour + minute / 60;
        const slots = [
            { slot: 'lunch' as TimeSlot, hour: 13, minute: 30 },
            { slot: 'afternoon' as TimeSlot, hour: 15, minute: 30 },
            { slot: 'dinner' as TimeSlot, hour: 18, minute: 0 },
            { slot: 'night' as TimeSlot, hour: 20, minute: 30 }
        ];
        for (const item of slots) {
            const target = item.hour + item.minute / 60;
            if (currentTime >= target && currentTime < target + 0.1) {
                return item.slot;
            }
        }
        return null;
    }

    private refreshTemplates() {
        const levelId = this.callbacks?.getLevelId?.() ?? 1;
        this.templates = getSpecialEventTemplates(levelId);
    }

    private getCurrentDay(): number {
        return GameProgressManager.instance?.progress?.currentDay ?? 1;
    }

    private checkDayChange() {
        const day = this.getCurrentDay();
        if (day !== this.currentDay) {
            this.currentDay = day;
            this.triggeredEventIds.clear();
            this.triggeredSlots.clear();
            SpecialEventVoucherManager.instance.cleanupExpired(day);
        }
    }

    private pickEvent(slot: TimeSlot): SpecialEventTemplate | null {
        this.refreshTemplates();
        const candidates = this.templates.filter(e => e.slot === slot && !this.triggeredEventIds.has(e.id));
        if (!candidates.length) return null;
        const totalWeight = candidates.reduce((sum, e) => sum + (e.weight ?? 1), 0);
        let roll = Math.random() * totalWeight;
        for (const item of candidates) {
            roll -= item.weight ?? 1;
            if (roll <= 0) return item;
        }
        return candidates[0];
    }

    private waitForCustomerClear() {
        if (!this.pendingEvent || !this.callbacks) return;
        this.waitingForClear = true;
        this.waitingElapsed = 0;
        this.waitingTotal = 0;
        this.callbacks.setCustomerClearing(true);
        this.callbacks.showMessage('📣 有情况发生，等待当前顾客离开...');
    }

    private checkCustomerCleared() {
        if (!this.waitingForClear || !this.pendingEvent || !this.callbacks) return;
        const cleared = this.callbacks.areAllCustomersCleared();
        if (cleared || this.waitingTotal >= 5) {
            this.waitingForClear = false;
            this.callbacks.setCustomerClearing(false);
            this.showEventPopup(this.pendingEvent);
            this.pendingEvent = null;
        }
    }

    private showEventPopup(event: SpecialEventTemplate) {
        SpecialEventTextOverrides.instance.tryReloadInEditor();
        event = SpecialEventTextOverrides.instance.apply(event);

        const canvas = this.node.parent ?? this.node;
        this.isEventActive = true;
        this.callbacks?.setEventPhase?.(true);
        if (this.popupNode) {
            this.popupNode.destroy();
            this.popupNode = null;
        }

        const panel = new Node('SpecialEventPopup');
        panel.layer = 1 << 25;
        canvas.addChild(panel);
        panel.setSiblingIndex(9999);
        const panelTransform = panel.addComponent(UITransform);
        panelTransform.setContentSize(520, 300);
        panel.setPosition(0, 40, 0);

        const mask = new Node('Mask');
        mask.layer = 1 << 25;
        panel.addChild(mask);
        const maskTransform = mask.addComponent(UITransform);
        maskTransform.setContentSize(1400, 900);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 140);
        maskGraphics.rect(-700, -450, 1400, 900);
        maskGraphics.fill();
        mask.addComponent(BlockInputEvents);

        const bg = new Node('Background');
        bg.layer = 1 << 25;
        panel.addChild(bg);
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(36, 46, 58, 245);
        bgGraphics.roundRect(-260, -150, 520, 300, 14);
        bgGraphics.fill();
        bgGraphics.strokeColor = new Color(10, 10, 10, 255);
        bgGraphics.lineWidth = 3;
        bgGraphics.roundRect(-260, -150, 520, 300, 14);
        bgGraphics.stroke();

        const senderNode = new Node('Sender');
        panel.addChild(senderNode);
        senderNode.setPosition(0, 110, 0);
        this.popupSender = senderNode.addComponent(Label);
        const sender = event.sender ?? { name: '摊主', icon: '📌', role: '通知' };
        this.popupSender.string = `${sender.icon} ${sender.name} (${sender.role})`;
        this.popupSender.fontSize = 16;
        this.popupSender.color = new Color(180, 190, 210, 255);

        const titleNode = new Node('Title');
        panel.addChild(titleNode);
        titleNode.setPosition(0, 70, 0);
        this.popupTitle = titleNode.addComponent(Label);
        this.popupTitle.string = event.title;
        this.popupTitle.fontSize = 24;
        this.popupTitle.color = new Color(255, 220, 130, 255);

        const descNode = new Node('Description');
        panel.addChild(descNode);
        descNode.setPosition(0, 15, 0);
        const descTransform = descNode.addComponent(UITransform);
        descTransform.setContentSize(460, 80);
        this.popupDesc = descNode.addComponent(Label);
        this.popupDesc.string = event.description || `${event.title}，要怎么处理？`;
        this.popupDesc.fontSize = 18;
        this.popupDesc.color = new Color(225, 230, 240, 255);
        this.popupDesc.overflow = Label.Overflow.CLAMP;
        this.popupDesc.enableWrapText = true;

        this.optionABtn = this.createOptionButton('OptionA', -130, -90, new Color(80, 170, 110, 255));
        this.optionBBtn = this.createOptionButton('OptionB', 130, -90, new Color(190, 90, 90, 255));
        panel.addChild(this.optionABtn);
        panel.addChild(this.optionBBtn);

        this.optionALabel = this.optionABtn.getChildByName('Label')?.getComponent(Label) ?? null;
        this.optionBLabel = this.optionBBtn.getChildByName('Label')?.getComponent(Label) ?? null;
        if (this.optionALabel) this.optionALabel.string = `${event.optionA.emoji} ${event.optionA.text}`;
        if (this.optionBLabel) this.optionBLabel.string = `${event.optionB.emoji} ${event.optionB.text}`;

        this.optionABtn.on(Node.EventType.TOUCH_END, () => this.handleOptionChoice(event, event.optionA));
        this.optionBBtn.on(Node.EventType.TOUCH_END, () => this.handleOptionChoice(event, event.optionB));

        this.popupNode = panel;
        panel.setScale(0.85, 0.85, 1);
        tween(panel).to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    private createOptionButton(name: string, x: number, y: number, color: Color): Node {
        const node = new Node(name);
        node.setPosition(x, y, 0);
        node.layer = 1 << 25;
        const transform = node.addComponent(UITransform);
        transform.setContentSize(210, 60);
        const gfx = node.addComponent(Graphics);
        gfx.fillColor = color;
        gfx.roundRect(-105, -30, 210, 60, 10);
        gfx.fill();
        const labelNode = new Node('Label');
        node.addChild(labelNode);
        const label = labelNode.addComponent(Label);
        label.string = '选项';
        label.fontSize = 18;
        label.color = new Color(255, 255, 255, 255);
        node.addComponent(Button);
        return node;
    }

    private handleOptionChoice(event: SpecialEventTemplate, option: SpecialEventOption) {
        if (!this.callbacks) return;
        if (!this.canAffordOption(option)) {
            this.callbacks.showMessage('💬 金币不足或主料不足，无法选择');
            return;
        }

        this.closePopup();
        this.triggeredEventIds.add(event.id);

        if (option.task) {
            this.startTask(event, option);
            return;
        }

        const success = this.rollSuccess(option.successRate);
        const effect = success ? option.successEffect : option.failEffect;
        const summary = this.applyEffect(effect);
        const resultText = success ? '✅ 处理完成' : '❌ 处理失败';
        this.callbacks.showMessage(summary ? `${resultText} ${summary}` : resultText);
        this.sendEventMessage(event, option, success, summary);
        this.isEventActive = false;
        this.callbacks?.setEventPhase?.(false);
    }

    private canAffordOption(option: SpecialEventOption): boolean {
        if (!this.callbacks) return false;
        const effect = option.successEffect;
        if (!effect) return true;
        if (effect.money !== undefined && effect.money < 0) {
            if (this.callbacks.getMoney) {
                return this.callbacks.getMoney() + effect.money >= 0;
            }
            return true;
        }
        if (effect.mainIngredientDelta !== undefined && effect.mainIngredientDelta < 0 && !option.task) {
            if (this.callbacks.getMainIngredientCount) {
                return this.callbacks.getMainIngredientCount() + effect.mainIngredientDelta >= 0;
            }
            return true;
        }
        return true;
    }

    private startTask(event: SpecialEventTemplate, option: SpecialEventOption) {
        if (!option.task || !this.callbacks) return;
        this.taskState = {
            event,
            option,
            progress: 0,
            timeLimit: option.task.timeLimit,
            remainingTime: option.task.timeLimit
        };
        this.isEventActive = true;
        this.callbacks?.setEventPhase?.(true);
        this.ensureTaskPanel();
        this.updateTaskPanel();
        this.callbacks.showMessage(`📌 事件任务开始：${option.task.description}`);
        this.sendEventMessage(event, option, true, '任务开始');
    }

    private handleOrderComplete() {
        if (!this.taskState) return;
        this.taskState.progress += 1;
        if (this.taskState.progress >= (this.taskState.option.task?.targetCount ?? 0)) {
            this.finishTask(true);
        } else {
            this.updateTaskPanel();
        }
    }

    private tickTaskTimer(dt: number) {
        if (!this.taskState || !this.taskState.timeLimit) return;
        if (this.taskState.remainingTime === undefined) return;
        this.taskState.remainingTime -= dt;
        if (this.taskState.remainingTime <= 0) {
            this.taskState.remainingTime = 0;
            this.finishTask(false);
        } else {
            this.updateTaskPanel();
        }
    }

    private finishTask(success: boolean) {
        if (!this.taskState || !this.callbacks) return;
        const { event, option } = this.taskState;
        const effect = success ? option.successEffect : option.failEffect;
        const summary = this.applyEffect(effect);
        const resultText = success ? '✅ 任务完成' : '❌ 任务失败';
        this.callbacks.showMessage(summary ? `${resultText} ${summary}` : resultText);
        this.sendEventMessage(event, option, success, summary);
        this.taskState = null;
        this.hideTaskPanel();
        this.isEventActive = false;
        this.callbacks?.setEventPhase?.(false);
    }

    private rollSuccess(rate?: number): boolean {
        if (rate === undefined) return true;
        const finalRate = Math.max(0, Math.min(100, rate));
        return Math.random() * 100 <= finalRate;
    }

    private applyEffect(effect?: SpecialEventEffect): string {
        if (!effect || !this.callbacks) return '';
        const parts: string[] = [];
        if (effect.money && effect.money !== 0) {
            const ok = this.callbacks.applyMoneyDelta(effect.money);
            if (ok) {
                parts.push(`金币${effect.money > 0 ? '+' : ''}${effect.money}`);
            }
        }
        if (effect.heat && effect.heat !== 0) {
            this.callbacks.applyHeatDelta(effect.heat);
            parts.push(`热度${effect.heat > 0 ? '+' : ''}${effect.heat}`);
        }
        if (effect.mainIngredientDelta && effect.mainIngredientDelta !== 0) {
            const ok = this.callbacks.applyMainIngredientDelta(effect.mainIngredientDelta);
            if (ok) {
                parts.push(`主料${effect.mainIngredientDelta > 0 ? '+' : ''}${effect.mainIngredientDelta}`);
            }
        }
        if (effect.voucher) {
            SpecialEventVoucherManager.instance.grantVoucher(
                effect.voucher.type,
                effect.voucher.tier,
                effect.voucher.count ?? 1,
                this.currentDay
            );
            parts.push('获得券');
        }
        return parts.join(' / ');
    }

    private sendEventMessage(event: SpecialEventTemplate, option: SpecialEventOption, success: boolean, summary: string) {
        if (!this.callbacks?.addEventMessage) return;
        const sender = event.sender ?? { name: '摊主', icon: '📌', role: '通知' };
        const status = success ? '成功' : '失败';
        const content = summary ? `${option.text}：${status} (${summary})` : `${option.text}：${status}`;
        this.callbacks.addEventMessage(sender.name, sender.icon, content, event.id);
    }

    private closePopup() {
        if (this.popupNode) {
            this.popupNode.destroy();
            this.popupNode = null;
        }
    }

    private ensureTaskPanel() {
        if (this.taskPanel) return;
        const canvas = this.node.parent ?? this.node;
        const panel = new Node('SpecialEventTaskPanel');
        panel.layer = 1 << 25;
        canvas.addChild(panel);
        panel.setSiblingIndex(9998);
        const transform = panel.addComponent(UITransform);
        transform.setContentSize(260, 80);
        panel.setPosition(320, 220, 0);
        const gfx = panel.addComponent(Graphics);
        gfx.fillColor = new Color(20, 24, 32, 220);
        gfx.roundRect(-130, -40, 260, 80, 10);
        gfx.fill();
        gfx.strokeColor = new Color(255, 210, 130, 220);
        gfx.lineWidth = 2;
        gfx.roundRect(-130, -40, 260, 80, 10);
        gfx.stroke();

        const labelNode = new Node('TaskLabel');
        panel.addChild(labelNode);
        labelNode.setPosition(0, 12, 0);
        const label = labelNode.addComponent(Label);
        label.fontSize = 16;
        label.color = new Color(245, 245, 245, 255);
        this.taskLabel = label;

        const timeNode = new Node('TimeLabel');
        panel.addChild(timeNode);
        timeNode.setPosition(0, -18, 0);
        const timeLabel = timeNode.addComponent(Label);
        timeLabel.fontSize = 14;
        timeLabel.color = new Color(255, 210, 130, 255);
        this.taskTimeLabel = timeLabel;

        this.taskPanel = panel;
    }

    private updateTaskPanel() {
        if (!this.taskPanel || !this.taskState) return;
        const target = this.taskState.option.task?.targetCount ?? 0;
        const desc = this.taskState.option.task?.description ?? '事件任务';
        if (this.taskLabel) {
            this.taskLabel.string = `${desc} (${this.taskState.progress}/${target})`;
        }
        if (this.taskTimeLabel) {
            if (this.taskState.timeLimit && this.taskState.remainingTime !== undefined) {
                const seconds = Math.ceil(this.taskState.remainingTime);
                this.taskTimeLabel.string = `剩余 ${seconds}s`;
            } else {
                this.taskTimeLabel.string = '无时间限制';
            }
        }
    }

    private hideTaskPanel() {
        if (!this.taskPanel) return;
        this.taskPanel.destroy();
        this.taskPanel = null;
        this.taskLabel = null;
        this.taskTimeLabel = null;
    }
}


