import { _decorator, Component, Node, Label, Button, Color, UITransform, Graphics } from 'cc';
import { InventoryManager } from '../Manager/InventoryManager';

const { ccclass, property } = _decorator;

/**
 * 存档管理UI组件
 * 提供存档槽位选择、重置、删除等功能
 */
@ccclass('SaveManagerUI')
export class SaveManagerUI extends Component {
    
    @property(Node)
    savePanel: Node = null;
    
    @property(Label)
    walletLabel: Label = null;
    
    @property(Label)
    dailyEarningsLabel: Label = null;
    
    @property(Label)
    unlockedLevelLabel: Label = null;
    
    private slotButtons: Node[] = [];
    
    onLoad() {
        this.createUI();
    }
    
    start() {
        this.refreshDisplay();
    }
    
    /**
     * 创建存档管理UI
     */
    private createUI() {
        if (!this.savePanel) {
            this.savePanel = new Node('SavePanel');
            this.node.addChild(this.savePanel);
        }
        
        // 创建背景
        const bg = this.savePanel.addComponent(Graphics);
        bg.fillColor = new Color(30, 30, 40, 230);
        bg.roundRect(-200, -180, 400, 360, 15);
        bg.fill();
        
        const transform = this.savePanel.getComponent(UITransform) || this.savePanel.addComponent(UITransform);
        transform.setContentSize(400, 360);
        
        // 标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '💾 存档管理';
        titleLabel.fontSize = 24;
        titleLabel.color = new Color(255, 255, 255, 255);
        titleNode.setPosition(0, 150, 0);
        this.savePanel.addChild(titleNode);
        
        // 当前状态显示
        this.createStatusDisplay();
        
        // 存档槽位按钮
        this.createSlotButtons();
        
        // 操作按钮
        this.createActionButtons();
        
        // 默认隐藏
        this.savePanel.active = false;
    }
    
    /**
     * 创建状态显示
     */
    private createStatusDisplay() {
        const statusY = 100;
        
        // 钱包余额
        const walletNode = new Node('Wallet');
        this.walletLabel = walletNode.addComponent(Label);
        this.walletLabel.string = '💰 钱包: ¥0';
        this.walletLabel.fontSize = 16;
        this.walletLabel.color = new Color(255, 215, 0, 255);
        walletNode.setPosition(-80, statusY, 0);
        this.savePanel.addChild(walletNode);
        
        // 当日收益
        const dailyNode = new Node('Daily');
        this.dailyEarningsLabel = dailyNode.addComponent(Label);
        this.dailyEarningsLabel.string = '📅 今日: ¥0';
        this.dailyEarningsLabel.fontSize = 16;
        this.dailyEarningsLabel.color = new Color(100, 200, 255, 255);
        dailyNode.setPosition(80, statusY, 0);
        this.savePanel.addChild(dailyNode);
        
        // 解锁关卡
        const levelNode = new Node('Level');
        this.unlockedLevelLabel = levelNode.addComponent(Label);
        this.unlockedLevelLabel.string = '🔓 已解锁: 第1关';
        this.unlockedLevelLabel.fontSize = 14;
        this.unlockedLevelLabel.color = new Color(150, 255, 150, 255);
        levelNode.setPosition(0, statusY - 30, 0);
        this.savePanel.addChild(levelNode);
    }
    
    /**
     * 创建存档槽位按钮
     */
    private createSlotButtons() {
        const startY = 30;
        const spacing = 50;
        
        for (let i = 1; i <= 3; i++) {
            const slotNode = this.createSlotButton(i);
            slotNode.setPosition(0, startY - (i - 1) * spacing, 0);
            this.savePanel.addChild(slotNode);
            this.slotButtons.push(slotNode);
        }
    }
    
    /**
     * 创建单个存档槽位按钮
     */
    private createSlotButton(slotId: number): Node {
        const node = new Node(`Slot_${slotId}`);
        
        // 背景
        const bg = node.addComponent(Graphics);
        bg.fillColor = new Color(60, 60, 80, 255);
        bg.strokeColor = new Color(100, 100, 150, 255);
        bg.lineWidth = 2;
        bg.roundRect(-160, -18, 320, 36, 8);
        bg.fill();
        bg.stroke();
        
        const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
        transform.setContentSize(320, 36);
        
        // 槽位标签
        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        label.string = `存档 ${slotId}: 空`;
        label.fontSize = 14;
        label.color = new Color(200, 200, 200, 255);
        node.addChild(labelNode);
        
        // 点击事件
        node.on(Node.EventType.TOUCH_END, () => this.onSlotClick(slotId), this);
        
        return node;
    }
    
    /**
     * 创建操作按钮
     */
    private createActionButtons() {
        const btnY = -100;
        const btnSpacing = 110;
        
        // 重置按钮
        const resetBtn = this.createButton('🔄 重置', new Color(255, 150, 50, 255));
        resetBtn.setPosition(-btnSpacing, btnY, 0);
        resetBtn.on(Node.EventType.TOUCH_END, this.onResetClick, this);
        this.savePanel.addChild(resetBtn);
        
        // 清除全部按钮
        const clearBtn = this.createButton('🗑️ 清除全部', new Color(255, 80, 80, 255));
        clearBtn.setPosition(0, btnY, 0);
        clearBtn.on(Node.EventType.TOUCH_END, this.onClearAllClick, this);
        this.savePanel.addChild(clearBtn);
        
        // 关闭按钮
        const closeBtn = this.createButton('✖ 关闭', new Color(100, 100, 120, 255));
        closeBtn.setPosition(btnSpacing, btnY, 0);
        closeBtn.on(Node.EventType.TOUCH_END, this.hide, this);
        this.savePanel.addChild(closeBtn);
    }
    
    /**
     * 创建通用按钮
     */
    private createButton(text: string, bgColor: Color): Node {
        const node = new Node('Button');
        
        const bg = node.addComponent(Graphics);
        bg.fillColor = bgColor;
        bg.roundRect(-50, -15, 100, 30, 6);
        bg.fill();
        
        const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
        transform.setContentSize(100, 30);
        
        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 12;
        label.color = new Color(255, 255, 255, 255);
        node.addChild(labelNode);
        
        return node;
    }
    
    /**
     * 刷新显示
     */
    public refreshDisplay() {
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        
        const stats = inventory.getSaveStats();
        
        if (this.walletLabel) {
            this.walletLabel.string = `💰 钱包: ¥${stats.globalWallet}`;
        }
        
        if (this.dailyEarningsLabel) {
            this.dailyEarningsLabel.string = `📅 今日: ¥${stats.dailyEarnings}`;
        }
        
        if (this.unlockedLevelLabel) {
            this.unlockedLevelLabel.string = `🔓 已解锁: 第${stats.unlockedLevel}关`;
        }
        
        // 更新槽位显示
        this.updateSlotDisplays();
    }
    
    /**
     * 更新槽位显示
     */
    private updateSlotDisplays() {
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        
        for (let i = 0; i < this.slotButtons.length; i++) {
            const slotId = i + 1;
            const info = inventory.getSlotInfo(slotId);
            const labelNode = this.slotButtons[i].getChildByName('Label');
            if (labelNode) {
                const label = labelNode.getComponent(Label);
                if (label) {
                    if (info.exists) {
                        const date = info.savedAt ? new Date(info.savedAt).toLocaleDateString() : '未知';
                        label.string = `存档 ${slotId}: ¥${info.wallet} | 第${info.level}关 | ${date}`;
                        label.color = slotId === inventory.currentSlot ? 
                            new Color(100, 255, 100, 255) : new Color(200, 200, 200, 255);
                    } else {
                        label.string = `存档 ${slotId}: 空`;
                        label.color = new Color(150, 150, 150, 255);
                    }
                }
            }
        }
    }
    
    /**
     * 槽位点击
     */
    private onSlotClick(slotId: number) {
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        
        inventory.switchSlot(slotId);
        this.refreshDisplay();
        console.log(`[SaveManagerUI] 切换到存档槽位 ${slotId}`);
    }
    
    /**
     * 重置当前存档
     */
    private onResetClick() {
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        
        inventory.resetCurrentSave();
        this.refreshDisplay();
        console.log('[SaveManagerUI] 当前存档已重置');
    }
    
    /**
     * 清除所有存档
     */
    private onClearAllClick() {
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        
        inventory.clearAllSaves();
        this.refreshDisplay();
        console.log('[SaveManagerUI] 所有存档已清除');
    }
    
    /**
     * 显示面板
     */
    public show() {
        if (this.savePanel) {
            this.savePanel.active = true;
            this.refreshDisplay();
        }
    }
    
    /**
     * 隐藏面板
     */
    public hide() {
        if (this.savePanel) {
            this.savePanel.active = false;
        }
    }
    
    /**
     * 切换显示/隐藏
     */
    public toggle() {
        if (this.savePanel) {
            if (this.savePanel.active) {
                this.hide();
            } else {
                this.show();
            }
        }
    }
}
