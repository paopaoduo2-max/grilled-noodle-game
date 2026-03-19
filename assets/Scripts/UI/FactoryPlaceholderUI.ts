import { _decorator, Button, Color, Component, Label, Node, Sprite, UITransform, Vec3 } from 'cc';
import { WORLD_MINIGAME_SAMPLE } from '../Data/WorldRuntimeConfig';
import { SceneRouteService } from '../Manager/SceneRouteService';
import { WorldProgressManager } from '../Manager/WorldProgressManager';

const { ccclass } = _decorator;

@ccclass('FactoryPlaceholderUI')
export class FactoryPlaceholderUI extends Component {
    private walletLabel: Label | null = null;
    private progressLabel: Label | null = null;
    private timerLabel: Label | null = null;
    private hintLabel: Label | null = null;

    private running = false;
    private clicks = 0;
    private timeLeft = 0;
    private readonly targetClicks = 12;
    private readonly durationSeconds = 20;

    onLoad(): void {
        WorldProgressManager.ensureInstance();
        this.buildUI();
        this.refreshWallet();
    }

    update(dt: number): void {
        if (!this.running) return;
        this.timeLeft -= dt;
        this.refreshRuntimeLabel();
        if (this.timeLeft <= 0) {
            this.finishMinigame(this.clicks >= this.targetClicks);
        }
    }

    private buildUI(): void {
        this.node.removeAllChildren();

        const title = this.createLabel(`🎮 ${WORLD_MINIGAME_SAMPLE.title}`, 40, new Color(241, 246, 255, 255), 980, 62);
        title.setPosition(0, 258, 0);
        this.node.addChild(title);

        const wallet = this.createLabel('', 28, new Color(166, 255, 166, 255), 580, 44);
        wallet.setPosition(0, 208, 0);
        this.walletLabel = wallet.getComponent(Label);
        this.node.addChild(wallet);

        const desc = this.createLabel('20秒内完成设备组装点击，达标后奖励回流主流程资金。', 22, new Color(220, 226, 236, 255), 980, 44);
        desc.setPosition(0, 152, 0);
        this.node.addChild(desc);

        const panel = this.createPanel(640, 300, new Color(33, 47, 70, 225));
        panel.setPosition(0, -6, 0);
        this.node.addChild(panel);

        const progress = this.createLabel('', 32, new Color(255, 244, 205, 255), 520, 54);
        progress.setPosition(0, 62, 0);
        this.progressLabel = progress.getComponent(Label);
        panel.addChild(progress);

        const timer = this.createLabel('', 30, new Color(187, 232, 255, 255), 520, 46);
        timer.setPosition(0, 10, 0);
        this.timerLabel = timer.getComponent(Label);
        panel.addChild(timer);

        const startBtn = this.createButton('开始挑战', new Color(55, 142, 89, 255), 180, 54, 24);
        startBtn.setPosition(-210, -78, 0);
        startBtn.on(Button.EventType.CLICK, this.startMinigame, this);
        panel.addChild(startBtn);

        const clickBtn = this.createButton('组装 +1', new Color(84, 128, 214, 255), 180, 54, 24);
        clickBtn.setPosition(0, -78, 0);
        clickBtn.on(Button.EventType.CLICK, this.onAssembleClick, this);
        panel.addChild(clickBtn);

        const settleBtn = this.createButton('结束并结算', new Color(169, 116, 66, 255), 180, 54, 24);
        settleBtn.setPosition(210, -78, 0);
        settleBtn.on(Button.EventType.CLICK, () => this.finishMinigame(this.clicks >= this.targetClicks), this);
        panel.addChild(settleBtn);

        const backBusiness = this.createButton('返回营业', new Color(74, 133, 84, 255), 220, 58, 24);
        backBusiness.setPosition(-130, -236, 0);
        backBusiness.on(Button.EventType.CLICK, () => SceneRouteService.goBusiness(), this);
        this.node.addChild(backBusiness);

        const backMenu = this.createButton('返回主菜单', new Color(108, 117, 134, 255), 220, 58, 24);
        backMenu.setPosition(130, -236, 0);
        backMenu.on(Button.EventType.CLICK, () => SceneRouteService.goMainMenu(), this);
        this.node.addChild(backMenu);

        const hint = this.createLabel('点击“开始挑战”后再进行组装。', 22, new Color(255, 230, 186, 255), 980, 40);
        hint.setPosition(0, -302, 0);
        this.hintLabel = hint.getComponent(Label);
        this.node.addChild(hint);

        this.refreshRuntimeLabel();
    }

    private startMinigame(): void {
        this.running = true;
        this.clicks = 0;
        this.timeLeft = this.durationSeconds;
        this.setHint(`挑战开始：20秒内达到 ${this.targetClicks} 次组装`);
        this.refreshRuntimeLabel();
    }

    private onAssembleClick(): void {
        if (!this.running) {
            this.setHint('请先点击“开始挑战”');
            return;
        }
        this.clicks += 1;
        this.refreshRuntimeLabel();
        if (this.clicks >= this.targetClicks) {
            this.finishMinigame(true);
        }
    }

    private finishMinigame(success: boolean): void {
        if (!this.running && !success) return;
        this.running = false;

        if (!success) {
            this.setHint('挑战失败：未达到目标组装次数');
            this.refreshRuntimeLabel();
            return;
        }

        const manager = WorldProgressManager.instance;
        if (!manager) return;

        const rewardFlag = `minigame.factory.reward.day.${manager.progress.dayIndex}`;
        if (manager.progress.storyFlags[rewardFlag]) {
            this.setHint('今日奖励已领取，可继续练习');
            this.refreshRuntimeLabel();
            return;
        }

        manager.progress.storyFlags[rewardFlag] = true;
        manager.addMoney(WORLD_MINIGAME_SAMPLE.rewardMoney);
        this.setHint(`挑战成功：+${WORLD_MINIGAME_SAMPLE.rewardMoney} 资金`);
        this.refreshWallet();
        this.refreshRuntimeLabel();
    }

    private refreshRuntimeLabel(): void {
        if (this.progressLabel) {
            this.progressLabel.string = `组装进度 ${this.clicks} / ${this.targetClicks}`;
        }
        if (this.timerLabel) {
            const timer = this.running ? Math.max(0, Math.ceil(this.timeLeft)) : this.durationSeconds;
            this.timerLabel.string = `剩余时间 ${timer}s`;
        }
    }

    private refreshWallet(): void {
        const manager = WorldProgressManager.instance;
        if (!manager || !this.walletLabel) return;
        this.walletLabel.string = `💰 当前资金: ${manager.progress.totalMoney}`;
    }

    private setHint(text: string): void {
        if (this.hintLabel) this.hintLabel.string = text;
    }

    private createPanel(width: number, height: number, color: Color): Node {
        const node = new Node('Panel');
        node.addComponent(UITransform).setContentSize(width, height);
        const sprite = node.addComponent(Sprite);
        sprite.color = color;
        return node;
    }

    private createButton(text: string, color: Color, width: number, height: number, fontSize: number): Node {
        const node = this.createPanel(width, height, color);
        node.addComponent(Button);
        const labelNode = this.createLabel(text, fontSize, new Color(255, 255, 255, 255), width - 16, height - 8, true);
        labelNode.setPosition(Vec3.ZERO);
        node.addChild(labelNode);
        return node;
    }

    private createLabel(
        text: string,
        fontSize: number,
        color: Color,
        width: number,
        height: number,
        bold: boolean = false
    ): Node {
        const node = new Node('Text');
        node.addComponent(UITransform).setContentSize(width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.color = color;
        label.isBold = bold;
        label.enableWrapText = true;
        return node;
    }
}

