/**
 * SettlementUI.ts
 * 结算面板UI组件
 * 从 CookingControllerV2.ts 提取
 */

import { Node, Label, Button, UITransform, Graphics, Color, find } from 'cc';
import { GameProgressManager, LEVEL_CONFIGS } from '../../Manager/GameProgressManager';

/**
 * 结算数据接口
 */
export interface SettlementData {
    money: number;
    superGood: number;
    good: number;
    bad: number;
    isFailed: boolean;
    failReason: string;
}

/**
 * 结算面板回调接口
 */
export interface SettlementCallbacks {
    onNextDay: () => void;
    onRetry: () => void;
    onReturnMenu: () => void;
}

/**
 * 结算面板UI类
 */
export class SettlementUI {
    private panel: Node = null;
    
    // 配色方案
    private readonly colors = {
        mask: new Color(0, 0, 0, 150),
        panelBg: new Color(248, 249, 250, 255),
        cardBg: new Color(255, 255, 255, 255),
        border: new Color(222, 226, 230, 255),
        titleText: new Color(255, 255, 255, 255),
        labelText: new Color(73, 80, 87, 255),
        valueText: new Color(33, 37, 41, 255),
        accent: new Color(13, 110, 253, 255),
        accentAlt: new Color(255, 153, 0, 255),
        danger: new Color(220, 53, 69, 255),
        success: new Color(25, 135, 84, 255),
        progressBg: new Color(233, 236, 239, 255),
        btnPrimary: new Color(13, 110, 253, 255),
        btnSecondary: new Color(108, 117, 125, 255)
    };
    
    /**
     * 显示结算面板
     */
    show(data: SettlementData, callbacks: SettlementCallbacks) {
        this.destroy();
        
        const canvas = find('Canvas');
        if (!canvas) return;
        
        const progressManager = GameProgressManager.instance;
        const levelConfig = progressManager?.currentLevelConfig;
        const totalMoney = progressManager?.progress.totalMoney || 0;
        const unlockMoney = levelConfig?.unlockMoney || 0;
        const canUnlock = progressManager?.canUnlockNextLevel() || false;
        const moneyNeeded = progressManager?.getMoneyNeededForNextLevel() || 0;
        
        // 创建面板
        this.panel = new Node('SettlementPanel');
        this.panel.addComponent(UITransform).setContentSize(420, 520);
        this.panel.setPosition(0, 0, 0);
        this.panel.setSiblingIndex(9999);
        canvas.addChild(this.panel);
        
        // 半透明背景遮罩
        this.createMask();
        
        // 面板背景
        this.createPanelBackground();
        
        // 标题区域
        this.createTitle(data.isFailed);
        
        // 天数显示
        const dayText = progressManager ? progressManager.getDayText() : '第1天';
        this.createDayLabel(dayText);
        
        // 今日收入卡片
        this.createCard(0, 115, 340, 50);
        const incomeColor = data.money >= 0 ? this.colors.success : this.colors.danger;
        const incomeSign = data.money >= 0 ? '+' : '';
        this.createCardRow('今日收入', `${incomeSign}${data.money} 元`, 0, 115, incomeColor);
        
        // 评价统计卡片
        this.createCard(0, 20, 340, 110);
        this.createCardRow('🌟 超级好评', `${data.superGood}`, 0, 50, this.colors.accentAlt);
        this.createCardRow('😊 好评', `${data.good}`, 0, 15, this.colors.success);
        const badColor = data.bad > 0 ? this.colors.danger : this.colors.valueText;
        this.createCardRow('😢 差评', `${data.bad}`, 0, -20, badColor);
        
        // 累计金币卡片
        this.createCard(0, -70, 340, 50);
        this.createCardRow('累计金币', `${totalMoney} 元`, 0, -70, this.colors.accentAlt);
        
        // 解锁进度区域
        if (!data.isFailed && levelConfig && levelConfig.levelId < LEVEL_CONFIGS.length) {
            this.createUnlockProgress(totalMoney, unlockMoney, canUnlock, moneyNeeded);
        }
        
        // 失败原因
        if (data.isFailed && data.failReason) {
            this.createFailReason(data.failReason);
        }
        
        // 按钮区域
        const btnY = -200;
        if (data.isFailed) {
            this.createButton('重试', -90, btnY, this.colors.btnPrimary, callbacks.onRetry);
            this.createButton('返回', 90, btnY, this.colors.btnSecondary, callbacks.onReturnMenu);
        } else {
            this.createButton('下一天', -90, btnY, this.colors.btnPrimary, callbacks.onNextDay);
            this.createButton('返回', 90, btnY, this.colors.btnSecondary, callbacks.onReturnMenu);
        }
        
        console.log('[SettlementUI] 📊 结算面板已显示');
    }
    
    /**
     * 销毁面板
     */
    destroy() {
        if (this.panel) {
            this.panel.destroy();
            this.panel = null;
        }
    }
    
    /**
     * 面板是否存在
     */
    get isVisible(): boolean {
        return this.panel !== null && this.panel.isValid;
    }
    
    // ========== 私有方法 ==========
    
    private createMask() {
        const mask = new Node('Mask');
        mask.addComponent(UITransform).setContentSize(2000, 2000);
        const graphics = mask.addComponent(Graphics);
        graphics.fillColor = this.colors.mask;
        graphics.rect(-1000, -1000, 2000, 2000);
        graphics.fill();
        mask.addComponent(Button);
        this.panel.addChild(mask);
    }
    
    private createPanelBackground() {
        const panel = new Node('Panel');
        panel.addComponent(UITransform).setContentSize(380, 480);
        const graphics = panel.addComponent(Graphics);
        graphics.strokeColor = this.colors.border;
        graphics.lineWidth = 2;
        graphics.fillColor = this.colors.panelBg;
        graphics.roundRect(-190, -240, 380, 480, 16);
        graphics.fill();
        graphics.stroke();
        this.panel.addChild(panel);
    }
    
    private createTitle(isFailed: boolean) {
        const titleBg = new Node('TitleBg');
        titleBg.addComponent(UITransform).setContentSize(380, 60);
        const graphics = titleBg.addComponent(Graphics);
        const bgColor = isFailed ? this.colors.danger : this.colors.accent;
        graphics.fillColor = bgColor;
        graphics.roundRect(-190, -30, 380, 60, 16);
        graphics.fill();
        graphics.fillColor = bgColor;
        graphics.rect(-190, -30, 380, 20);
        graphics.fill();
        titleBg.setPosition(0, 210, 0);
        this.panel.addChild(titleBg);
        
        const titleNode = new Node('Title');
        const label = titleNode.addComponent(Label);
        label.string = isFailed ? '营业失败' : '今日结算';
        label.fontSize = 28;
        label.color = this.colors.titleText;
        label.isBold = true;
        titleNode.setPosition(0, 210, 0);
        this.panel.addChild(titleNode);
    }
    
    private createDayLabel(dayText: string) {
        const dayNode = new Node('Day');
        const label = dayNode.addComponent(Label);
        label.string = dayText;
        label.fontSize = 16;
        label.color = this.colors.labelText;
        dayNode.setPosition(0, 165, 0);
        this.panel.addChild(dayNode);
    }
    
    private createCard(x: number, y: number, w: number, h: number) {
        const card = new Node('Card');
        card.addComponent(UITransform).setContentSize(w, h);
        const graphics = card.addComponent(Graphics);
        graphics.fillColor = this.colors.cardBg;
        graphics.strokeColor = this.colors.border;
        graphics.lineWidth = 1;
        graphics.roundRect(-w/2, -h/2, w, h, 8);
        graphics.fill();
        graphics.stroke();
        card.setPosition(x, y, 0);
        this.panel.addChild(card);
    }
    
    private createCardRow(labelText: string, valueText: string, x: number, y: number, valueColor?: Color) {
        const row = new Node('Row');
        row.setPosition(x, y, 0);
        this.panel.addChild(row);
        
        const labelNode = new Node('Label');
        const labelComp = labelNode.addComponent(Label);
        labelComp.string = labelText;
        labelComp.fontSize = 17;
        labelComp.color = this.colors.labelText;
        labelNode.setPosition(-70, 0, 0);
        row.addChild(labelNode);
        
        const valueNode = new Node('Value');
        const valueComp = valueNode.addComponent(Label);
        valueComp.string = valueText;
        valueComp.fontSize = 18;
        valueComp.color = valueColor || this.colors.valueText;
        valueComp.isBold = true;
        valueNode.setPosition(90, 0, 0);
        row.addChild(valueNode);
    }
    
    private createUnlockProgress(totalMoney: number, unlockMoney: number, canUnlock: boolean, moneyNeeded: number) {
        const unlockY = -140;
        
        // 进度条背景
        const progressBg = new Node('ProgressBg');
        progressBg.addComponent(UITransform).setContentSize(320, 12);
        const bgGraphics = progressBg.addComponent(Graphics);
        bgGraphics.fillColor = this.colors.progressBg;
        bgGraphics.roundRect(-160, -6, 320, 12, 6);
        bgGraphics.fill();
        progressBg.setPosition(0, unlockY, 0);
        this.panel.addChild(progressBg);
        
        // 进度条填充
        const progressPercent = Math.min(100, (totalMoney / unlockMoney) * 100);
        const progressWidth = 320 * (progressPercent / 100);
        if (progressWidth > 0) {
            const progressFill = new Node('ProgressFill');
            progressFill.addComponent(UITransform).setContentSize(progressWidth, 12);
            const fillGraphics = progressFill.addComponent(Graphics);
            fillGraphics.fillColor = canUnlock ? this.colors.success : this.colors.accent;
            fillGraphics.roundRect(-160, -6, progressWidth, 12, 6);
            fillGraphics.fill();
            progressFill.setPosition(0, unlockY, 0);
            this.panel.addChild(progressFill);
        }
        
        // 解锁提示
        const hintNode = new Node('UnlockHint');
        const hintLabel = hintNode.addComponent(Label);
        if (canUnlock) {
            hintLabel.string = `已达成解锁条件`;
            hintLabel.color = this.colors.success;
        } else {
            hintLabel.string = `下一关: ${totalMoney}/${unlockMoney} (差${moneyNeeded})`;
            hintLabel.color = this.colors.labelText;
        }
        hintLabel.fontSize = 14;
        hintNode.setPosition(0, unlockY - 20, 0);
        this.panel.addChild(hintNode);
    }
    
    private createFailReason(reason: string) {
        const reasonNode = new Node('Reason');
        const label = reasonNode.addComponent(Label);
        label.string = reason;
        label.fontSize = 16;
        label.color = this.colors.danger;
        reasonNode.setPosition(0, -140, 0);
        this.panel.addChild(reasonNode);
    }
    
    private createButton(text: string, x: number, y: number, bgColor: Color, onClick: () => void) {
        const btn = new Node('Button');
        btn.addComponent(UITransform).setContentSize(150, 44);
        btn.setPosition(x, y, 0);
        
        const graphics = btn.addComponent(Graphics);
        graphics.fillColor = bgColor;
        graphics.roundRect(-75, -22, 150, 44, 8);
        graphics.fill();
        
        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 18;
        label.color = new Color(255, 255, 255, 255);
        label.isBold = true;
        btn.addChild(labelNode);
        
        btn.addComponent(Button);
        btn.on(Node.EventType.TOUCH_END, onClick);
        
        this.panel.addChild(btn);
    }
}
