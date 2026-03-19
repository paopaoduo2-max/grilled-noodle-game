import { _decorator, Component, Node, Label, Button, Color, UITransform, Sprite } from 'cc';
import { GameManager } from '../Manager/GameManager';
const { ccclass, property } = _decorator;

/**
 * 结算界面UI控制器
 */
@ccclass('ResultUI')
export class ResultUI extends Component {
    @property(Label)
    titleLabel: Label = null;      // 标题（通过/失败）

    @property(Label)
    moneyLabel: Label = null;      // 金币显示

    @property(Label)
    targetMoneyLabel: Label = null;  // 目标金币

    @property(Label)
    customerLabel: Label = null;   // 客户数显示

    @property(Label)
    targetCustomerLabel: Label = null;  // 目标客户数

    @property(Label)
    scoreLabel: Label = null;      // 评分显示

    @property(Label)
    statsLabel: Label = null;      // 统计信息

    @property(Button)
    retryBtn: Button = null;       // 重试按钮

    @property(Button)
    nextBtn: Button = null;        // 下一关按钮

    @property(Button)
    menuBtn: Button = null;        // 返回菜单按钮

    private _isPassed: boolean = false;

    onLoad() {
        // 自动查找节点（如果属性没有绑定）
        if (!this.titleLabel) {
            const labelNode = this.node.getChildByPath('ResultPanel/TitleLabel');
            if (labelNode) this.titleLabel = labelNode.getComponent(Label);
        }
        
        if (!this.moneyLabel) {
            const labelNode = this.node.getChildByPath('ResultPanel/MoneyLabel');
            if (labelNode) this.moneyLabel = labelNode.getComponent(Label);
        }
        
        if (!this.targetMoneyLabel) {
            const labelNode = this.node.getChildByPath('ResultPanel/TargetMoneyLabel');
            if (labelNode) this.targetMoneyLabel = labelNode.getComponent(Label);
        }
        
        if (!this.customerLabel) {
            const labelNode = this.node.getChildByPath('ResultPanel/CustomerLabel');
            if (labelNode) this.customerLabel = labelNode.getComponent(Label);
        }
        
        if (!this.targetCustomerLabel) {
            const labelNode = this.node.getChildByPath('ResultPanel/TargetCustomerLabel');
            if (labelNode) this.targetCustomerLabel = labelNode.getComponent(Label);
        }
        
        if (!this.scoreLabel) {
            const labelNode = this.node.getChildByPath('ResultPanel/ScoreLabel');
            if (labelNode) this.scoreLabel = labelNode.getComponent(Label);
        }
        
        if (!this.statsLabel) {
            const labelNode = this.node.getChildByPath('ResultPanel/StatsLabel');
            if (labelNode) this.statsLabel = labelNode.getComponent(Label);
        }
        
        if (!this.retryBtn) {
            const btnNode = this.node.getChildByPath('ButtonPanel/RetryBtn');
            if (btnNode) this.retryBtn = btnNode.getComponent(Button);
        }
        
        if (!this.nextBtn) {
            const btnNode = this.node.getChildByPath('ButtonPanel/NextBtn');
            if (btnNode) this.nextBtn = btnNode.getComponent(Button);
        }
        
        if (!this.menuBtn) {
            const btnNode = this.node.getChildByPath('ButtonPanel/MenuBtn');
            if (btnNode) this.menuBtn = btnNode.getComponent(Button);
        }
        
        this.setupButtons();
    }

    start() {
        this.displayResult();
    }

    /**
     * 设置按钮事件
     */
    private setupButtons() {
        if (this.retryBtn) {
            this.retryBtn.node.on(Button.EventType.CLICK, this.onRetry, this);
        }

        if (this.nextBtn) {
            this.nextBtn.node.on(Button.EventType.CLICK, this.onNextLevel, this);
        }

        if (this.menuBtn) {
            this.menuBtn.node.on(Button.EventType.CLICK, this.onReturnMenu, this);
        }
    }

    /**
     * 显示结算结果
     */
    private displayResult() {
        const gameManager = GameManager.Instance;
        if (!gameManager || !gameManager.currentLevel) {
            console.error('[ResultUI] GameManager或当前关卡不存在');
            return;
        }

        const level = gameManager.currentLevel;
        const money = gameManager.playerMoney || 0;
        const customers = gameManager.completedCustomers || 0;
        const score = gameManager.totalScore || 0;
        const stats = gameManager.sessionStats;

        // 判断是否通过
        this._isPassed = money >= level.targetMoney && customers >= level.targetCustomers;

        // 标题
        if (this.titleLabel) {
            this.titleLabel.string = this._isPassed ? '🎉 关卡通过！' : '❌ 关卡失败';
            this.titleLabel.color = this._isPassed ? new Color(0, 255, 0, 255) : new Color(255, 0, 0, 255);
        }

        // 金币
        if (this.moneyLabel) {
            this.moneyLabel.string = `赚取金币: ${money}`;
            this.moneyLabel.color = money >= level.targetMoney ? Color.GREEN : Color.RED;
        }
        if (this.targetMoneyLabel) {
            this.targetMoneyLabel.string = `目标金币: ${level.targetMoney}`;
        }

        // 客户数
        if (this.customerLabel) {
            this.customerLabel.string = `完成客户: ${customers}`;
            this.customerLabel.color = customers >= level.targetCustomers ? Color.GREEN : Color.RED;
        }
        if (this.targetCustomerLabel) {
            this.targetCustomerLabel.string = `目标客户: ${level.targetCustomers}`;
        }

        // 评分
        if (this.scoreLabel) {
            this.scoreLabel.string = `总评分: ${score}`;
        }

        // 统计信息
        if (this.statsLabel) {
            this.statsLabel.string = 
                `完成订单: ${stats.ordersCompleted}\n` +
                `超时订单: ${stats.ordersTimeout}\n` +
                `总收入: ${stats.totalEarned}\n` +
                `总支出: ${stats.totalSpent}\n` +
                `净利润: ${stats.totalEarned - stats.totalSpent}`;
        }

        // 按钮显示
        if (this.nextBtn) {
            this.nextBtn.node.active = this._isPassed && level.levelId < 7;  // 最多7关
        }

        console.log('[ResultUI] 结算显示完成');
    }

    /**
     * 重试
     */
    private onRetry() {
        console.log('[ResultUI] 重试关卡');
        const gameManager = GameManager.Instance;
        gameManager.startLevel(gameManager.currentLevel.levelId);
    }

    /**
     * 下一关
     */
    private onNextLevel() {
        console.log('[ResultUI] 进入下一关');
        const gameManager = GameManager.Instance;
        const nextLevelId = gameManager.currentLevel.levelId + 1;
        gameManager.startLevel(nextLevelId);
    }

    /**
     * 返回菜单
     */
    private onReturnMenu() {
        console.log('[ResultUI] 返回主菜单');
        const gameManager = GameManager.Instance;
        gameManager.returnToMenu();
    }
}

