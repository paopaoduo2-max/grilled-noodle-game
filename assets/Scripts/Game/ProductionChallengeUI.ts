import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Vec3, tween, Sprite } from 'cc';
import { ProductionChallenge } from './RandomEventSystemV2';

const { ccclass, property } = _decorator;

/**
 * 🍳 制作挑战UI组件
 * 显示制作挑战的进度和倒计时
 */
@ccclass('ProductionChallengeUI')
export class ProductionChallengeUI extends Component {
    private panelNode: Node = null;
    private titleLabel: Label = null;
    private progressLabel: Label = null;
    private timerLabel: Label = null;
    private progressBar: Graphics = null;
    
    private challenge: ProductionChallenge = null;
    private currentProgress: number = 0;
    private remainingTime: number = 0;
    private isActive: boolean = false;
    private onTimeout: () => void = null;
    private onComplete: () => void = null;

    /**
     * 创建UI
     */
    public createUI(parent: Node) {
        // 创建主面板
        this.panelNode = new Node('ProductionChallengePanel');
        parent.addChild(this.panelNode);
        
        const panelTransform = this.panelNode.addComponent(UITransform);
        panelTransform.setContentSize(300, 100);
        this.panelNode.setPosition(0, 280, 0);

        // 背景
        const bg = this.panelNode.addComponent(Graphics);
        bg.fillColor = new Color(40, 40, 60, 230);
        bg.roundRect(-150, -50, 300, 100, 10);
        bg.fill();
        bg.strokeColor = new Color(255, 200, 100, 255);
        bg.lineWidth = 2;
        bg.roundRect(-150, -50, 300, 100, 10);
        bg.stroke();

        // 标题
        const titleNode = new Node('Title');
        this.panelNode.addChild(titleNode);
        titleNode.setPosition(0, 30, 0);
        this.titleLabel = titleNode.addComponent(Label);
        this.titleLabel.string = '🍳 制作挑战';
        this.titleLabel.fontSize = 18;
        this.titleLabel.color = new Color(255, 220, 100, 255);

        // 进度文字
        const progressNode = new Node('Progress');
        this.panelNode.addChild(progressNode);
        progressNode.setPosition(-50, 0, 0);
        this.progressLabel = progressNode.addComponent(Label);
        this.progressLabel.string = '进度: 0/10';
        this.progressLabel.fontSize = 16;
        this.progressLabel.color = new Color(255, 255, 255, 255);

        // 倒计时
        const timerNode = new Node('Timer');
        this.panelNode.addChild(timerNode);
        timerNode.setPosition(80, 0, 0);
        this.timerLabel = timerNode.addComponent(Label);
        this.timerLabel.string = '⏱️ 5:00';
        this.timerLabel.fontSize = 16;
        this.timerLabel.color = new Color(255, 150, 150, 255);

        // 进度条背景
        const progressBarBg = new Node('ProgressBarBg');
        this.panelNode.addChild(progressBarBg);
        progressBarBg.setPosition(0, -25, 0);
        const barBgGraphics = progressBarBg.addComponent(Graphics);
        barBgGraphics.fillColor = new Color(60, 60, 80, 255);
        barBgGraphics.roundRect(-120, -8, 240, 16, 5);
        barBgGraphics.fill();

        // 进度条
        const progressBarNode = new Node('ProgressBar');
        this.panelNode.addChild(progressBarNode);
        progressBarNode.setPosition(0, -25, 0);
        this.progressBar = progressBarNode.addComponent(Graphics);
        
        // 默认隐藏
        this.panelNode.active = false;
    }

    /**
     * 开始挑战
     */
    public startChallenge(challenge: ProductionChallenge, onTimeout: () => void, onComplete: () => void) {
        this.challenge = challenge;
        this.currentProgress = 0;
        this.remainingTime = challenge.timeLimit;
        this.isActive = true;
        this.onTimeout = onTimeout;
        this.onComplete = onComplete;

        // 更新UI
        this.titleLabel.string = `🍳 制作挑战 - 目标${challenge.targetCount}份`;
        this.updateProgressDisplay();
        this.updateTimerDisplay();
        this.updateProgressBar();

        // 显示面板
        this.panelNode.active = true;
        
        // 入场动画
        this.panelNode.setScale(0.5, 0.5, 1);
        tween(this.panelNode)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        console.log(`[ProductionChallengeUI] 开始挑战: ${challenge.targetCount}份, ${challenge.timeLimit}秒`);
    }

    /**
     * 更新进度
     */
    public updateProgress(completed: number) {
        this.currentProgress = completed;
        this.updateProgressDisplay();
        this.updateProgressBar();

        // 检查是否完成
        if (this.challenge && completed >= this.challenge.targetCount) {
            this.completeChallenge(true);
        }
    }

    /**
     * 每帧更新
     */
    update(dt: number) {
        if (!this.isActive || !this.challenge) return;

        this.remainingTime -= dt;
        this.updateTimerDisplay();

        // 时间到
        if (this.remainingTime <= 0) {
            this.completeChallenge(false);
        }
    }

    /**
     * 完成挑战
     */
    private completeChallenge(success: boolean) {
        this.isActive = false;

        // 更新显示
        if (success) {
            this.titleLabel.string = '✅ 挑战成功!';
            this.titleLabel.color = new Color(100, 255, 100, 255);
        } else {
            this.titleLabel.string = '❌ 时间到!';
            this.titleLabel.color = new Color(255, 100, 100, 255);
        }

        // 延迟隐藏
        this.scheduleOnce(() => {
            tween(this.panelNode)
                .to(0.3, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
                .call(() => {
                    this.panelNode.active = false;
                    this.panelNode.setScale(1, 1, 1);
                    
                    // 回调
                    if (success && this.onComplete) {
                        this.onComplete();
                    } else if (!success && this.onTimeout) {
                        this.onTimeout();
                    }
                })
                .start();
        }, 1.5);

        console.log(`[ProductionChallengeUI] 挑战${success ? '成功' : '失败'}`);
    }

    /**
     * 更新进度显示
     */
    private updateProgressDisplay() {
        if (!this.challenge) return;
        this.progressLabel.string = `进度: ${this.currentProgress}/${this.challenge.targetCount}`;
    }

    /**
     * 更新倒计时显示
     */
    private updateTimerDisplay() {
        const minutes = Math.floor(Math.max(0, this.remainingTime) / 60);
        const seconds = Math.floor(Math.max(0, this.remainingTime) % 60);
        const secondsStr = seconds < 10 ? '0' + seconds : '' + seconds;
        this.timerLabel.string = `⏱️ ${minutes}:${secondsStr}`;

        // 时间紧迫时变红
        if (this.remainingTime < 30) {
            this.timerLabel.color = new Color(255, 80, 80, 255);
        } else if (this.remainingTime < 60) {
            this.timerLabel.color = new Color(255, 180, 80, 255);
        } else {
            this.timerLabel.color = new Color(255, 255, 255, 255);
        }
    }

    /**
     * 更新进度条
     */
    private updateProgressBar() {
        if (!this.progressBar || !this.challenge) return;

        this.progressBar.clear();
        
        const progress = this.currentProgress / this.challenge.targetCount;
        const width = 240 * Math.min(1, progress);
        
        if (width > 0) {
            // 渐变色进度条
            const green = Math.floor(100 + 155 * progress);
            this.progressBar.fillColor = new Color(100, green, 100, 255);
            this.progressBar.roundRect(-120, -8, width, 16, 5);
            this.progressBar.fill();
        }
    }

    /**
     * 强制结束挑战
     */
    public forceEnd() {
        if (this.isActive) {
            this.isActive = false;
            this.panelNode.active = false;
        }
    }

    /**
     * 是否正在进行挑战
     */
    public isInChallenge(): boolean {
        return this.isActive;
    }

    /**
     * 获取当前进度
     */
    public getCurrentProgress(): number {
        return this.currentProgress;
    }
}
