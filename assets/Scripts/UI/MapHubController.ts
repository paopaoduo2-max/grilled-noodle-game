import { _decorator, Button, Color, Component, Label, Node, Sprite, UITransform, Vec3 } from 'cc';
import { MapConfig, WORLD_MAP_CONFIGS, WorldMapId } from '../Data/WorldRuntimeConfig';
import { SceneRouteService } from '../Manager/SceneRouteService';
import { WorldProgressManager } from '../Manager/WorldProgressManager';

const { ccclass } = _decorator;

@ccclass('MapHubController')
export class MapHubController extends Component {
    private root: Node | null = null;
    private dayLabel: Label | null = null;
    private walletLabel: Label | null = null;
    private statusLabel: Label | null = null;
    private selectedMapId: WorldMapId = 'street';

    onLoad(): void {
        const manager = WorldProgressManager.ensureInstance();
        this.selectedMapId = manager.progress.currentMapId;
        this.buildUI();
        this.refreshUI();
    }

    private buildUI(): void {
        this.root = this.node.getChildByName('MapHubRoot');
        if (!this.root) {
            this.root = new Node('MapHubRoot');
            this.root.addComponent(UITransform).setContentSize(1080, 620);
            this.node.addChild(this.root);
        } else {
            this.root.removeAllChildren();
        }
        this.root.setPosition(new Vec3(0, -10, 0));

        const title = this.createLabel('烤冷面地图中枢', 42, new Color(255, 238, 205, 255), 480, 56, true);
        title.setPosition(0, 274, 0);
        this.root.addChild(title);

        const dayPill = this.createPill('', new Color(115, 86, 62, 255), 210, 42);
        dayPill.setPosition(-375, 222, 0);
        this.dayLabel = dayPill.getChildByName('Text')?.getComponent(Label) || null;
        this.root.addChild(dayPill);

        const walletPill = this.createPill('', new Color(79, 121, 79, 255), 210, 42);
        walletPill.setPosition(-145, 222, 0);
        this.walletLabel = walletPill.getChildByName('Text')?.getComponent(Label) || null;
        this.root.addChild(walletPill);

        const shopBtn = this.createButton('进入地图摊位商店', new Color(64, 127, 185, 255), 220, 50, 22);
        shopBtn.setPosition(175, 222, 0);
        shopBtn.on(Button.EventType.CLICK, () => SceneRouteService.goShop(), this);
        this.root.addChild(shopBtn);

        const factoryBtn = this.createButton('小游戏店', new Color(100, 124, 195, 255), 180, 50, 22);
        factoryBtn.setPosition(395, 222, 0);
        factoryBtn.on(Button.EventType.CLICK, () => SceneRouteService.goMinigameFactory(), this);
        this.root.addChild(factoryBtn);

        const listPanel = this.createPanel('ListPanel', 720, 430, new Color(250, 243, 228, 255));
        listPanel.setPosition(-132, -20, 0);
        this.root.addChild(listPanel);

        WORLD_MAP_CONFIGS.forEach((map, index) => {
            const card = this.createMapCard(map);
            card.setPosition(0, 130 - index * 190, 0);
            listPanel.addChild(card);
        });

        const rightPanel = this.createPanel('RightPanel', 300, 430, new Color(71, 57, 47, 235));
        rightPanel.setPosition(382, -20, 0);
        this.root.addChild(rightPanel);

        const rightTitle = this.createLabel('地图操作', 30, new Color(255, 238, 201, 255), 240, 44, true);
        rightTitle.setPosition(0, 176, 0);
        rightPanel.addChild(rightTitle);

        const enterBtn = this.createButton('进入营业', new Color(73, 132, 85, 255), 210, 58, 22);
        enterBtn.name = 'EnterButton';
        enterBtn.setPosition(0, 40, 0);
        enterBtn.on(Button.EventType.CLICK, this.onEnterBusiness, this);
        rightPanel.addChild(enterBtn);

        const setBtn = this.createButton('设为当前地图', new Color(186, 114, 58, 255), 210, 58, 22);
        setBtn.name = 'SetMapButton';
        setBtn.setPosition(0, -35, 0);
        setBtn.on(Button.EventType.CLICK, this.onSetCurrentMap, this);
        rightPanel.addChild(setBtn);

        const menuBtn = this.createButton('返回主菜单', new Color(109, 117, 134, 255), 210, 52, 21);
        menuBtn.setPosition(0, -112, 0);
        menuBtn.on(Button.EventType.CLICK, () => SceneRouteService.goMainMenu(), this);
        rightPanel.addChild(menuBtn);

        const resetBtn = this.createButton('重置世界进度', new Color(160, 73, 73, 255), 210, 52, 21);
        resetBtn.setPosition(0, -180, 0);
        resetBtn.on(Button.EventType.CLICK, this.onResetProgress, this);
        rightPanel.addChild(resetBtn);

        const status = this.createLabel('', 18, new Color(255, 233, 192, 255), 980, 40);
        status.name = 'StatusLabel';
        status.setPosition(0, -286, 0);
        this.statusLabel = status.getComponent(Label);
        this.root.addChild(status);
    }

    private createMapCard(map: MapConfig): Node {
        const card = this.createPanel(`${map.mapId}_Card`, 680, 160, new Color(255, 250, 242, 255));
        card.addComponent(Button);
        card.on(Button.EventType.CLICK, () => {
            this.selectedMapId = map.mapId;
            this.refreshUI();
        }, this);

        const accent = this.createPanel('Accent', 14, 120, new Color(map.visualProfile.bgTint.r, map.visualProfile.bgTint.g, map.visualProfile.bgTint.b, 255));
        accent.setPosition(-320, 0, 0);
        card.addChild(accent);

        const name = this.createLabel(map.mapName, 28, new Color(71, 48, 34, 255), 260, 40, true);
        name.setPosition(-150, 42, 0);
        card.addChild(name);

        const desc = this.createLabel(map.description, 17, new Color(106, 85, 70, 255), 300, 48);
        desc.setPosition(-140, 0, 0);
        card.addChild(desc);

        const tag = this.createLabel(`倍率 x${map.revenueMultiplier.toFixed(2)}`, 16, new Color(150, 90, 45, 255), 160, 32, true);
        tag.name = 'RateLabel';
        tag.setPosition(210, 44, 0);
        card.addChild(tag);

        const status = this.createLabel('', 16, new Color(119, 96, 77, 255), 180, 34, true);
        status.name = 'StatusLabel';
        status.setPosition(210, 8, 0);
        card.addChild(status);

        const unlock = this.createLabel(`解锁门槛 ${map.unlockMoney}`, 15, new Color(125, 102, 82, 255), 180, 30);
        unlock.name = 'UnlockLabel';
        unlock.setPosition(210, -26, 0);
        card.addChild(unlock);

        return card;
    }

    private createPanel(name: string, width: number, height: number, color: Color): Node {
        const node = new Node(name);
        node.addComponent(UITransform).setContentSize(width, height);
        const sprite = node.addComponent(Sprite);
        sprite.color = color;
        return node;
    }

    private createLabel(text: string, fontSize: number, color: Color, width: number, height: number, bold: boolean = false): Node {
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

    private createButton(text: string, color: Color, width: number, height: number, fontSize: number): Node {
        const node = this.createPanel('Button', width, height, color);
        node.addComponent(Button);
        const label = this.createLabel(text, fontSize, new Color(255, 255, 255, 255), width - 16, height - 8, true);
        label.setPosition(0, 0, 0);
        node.addChild(label);
        return node;
    }

    private createPill(text: string, color: Color, width: number, height: number): Node {
        const node = this.createPanel('Pill', width, height, color);
        const label = this.createLabel(text, 16, new Color(255, 249, 236, 255), width - 14, height - 8, true);
        label.name = 'Text';
        node.addChild(label);
        return node;
    }

    private onSetCurrentMap(): void {
        const manager = WorldProgressManager.instance;
        if (!manager) return;
        manager.refreshMapUnlocksByMoney();
        if (!manager.isMapUnlocked(this.selectedMapId)) {
            this.setStatus(`资金不足，尚未解锁 ${this.getMapName(this.selectedMapId)}`);
            return;
        }
        manager.enterMap(this.selectedMapId);
        this.setStatus(`已切换当前地图：${this.getMapName(this.selectedMapId)}`);
        this.refreshUI();
    }

    private onEnterBusiness(): void {
        const manager = WorldProgressManager.instance;
        if (!manager) return;
        manager.refreshMapUnlocksByMoney();
        if (!manager.isMapUnlocked(this.selectedMapId)) {
            this.setStatus('请先达到金额门槛解锁地图');
            return;
        }
        manager.enterMap(this.selectedMapId);
        SceneRouteService.goBusiness();
    }

    private onResetProgress(): void {
        const manager = WorldProgressManager.instance;
        if (!manager) return;
        manager.resetProgress();
        this.selectedMapId = manager.progress.currentMapId;
        this.setStatus('世界进度已重置');
        this.refreshUI();
    }

    private refreshUI(): void {
        const manager = WorldProgressManager.instance;
        if (!manager || !this.root) return;

        manager.refreshMapUnlocksByMoney(false);
        if (this.dayLabel) this.dayLabel.string = `第 ${manager.progress.dayIndex} 天`;
        if (this.walletLabel) this.walletLabel.string = `资金 ${manager.progress.totalMoney}`;

        const listPanel = this.root.getChildByName('ListPanel');
        if (listPanel) {
            WORLD_MAP_CONFIGS.forEach((map) => {
                const card = listPanel.getChildByName(`${map.mapId}_Card`);
                if (!card) return;

                const unlocked = manager.isMapUnlocked(map.mapId);
                const current = manager.progress.currentMapId === map.mapId;
                const selected = this.selectedMapId === map.mapId;

                const sprite = card.getComponent(Sprite);
                if (sprite) {
                    sprite.color = selected ? new Color(247, 235, 216, 255) : new Color(255, 250, 242, 255);
                }

                const status = card.getChildByName('StatusLabel')?.getComponent(Label);
                const unlock = card.getChildByName('UnlockLabel')?.getComponent(Label);
                if (status) {
                    status.string = current ? '当前地图' : (unlocked ? '已解锁' : '未解锁');
                    status.color = current ? new Color(67, 131, 68, 255) : (unlocked ? new Color(177, 112, 58, 255) : new Color(137, 110, 88, 255));
                }
                if (unlock) {
                    unlock.string = unlocked ? '已满足门槛' : `解锁门槛 ${map.unlockMoney}`;
                }
            });
        }

        const rightPanel = this.root.getChildByName('RightPanel');
        const setBtn = rightPanel?.getChildByName('SetMapButton');
        const enterBtn = rightPanel?.getChildByName('EnterButton');
        const unlocked = manager.isMapUnlocked(this.selectedMapId);
        if (setBtn) {
            const button = setBtn.getComponent(Button);
            if (button) button.interactable = unlocked && manager.progress.currentMapId !== this.selectedMapId;
        }
        if (enterBtn) {
            const button = enterBtn.getComponent(Button);
            if (button) button.interactable = unlocked;
        }
    }

    private getMapName(mapId: WorldMapId): string {
        return WORLD_MAP_CONFIGS.find((item) => item.mapId === mapId)?.mapName || mapId;
    }

    private setStatus(text: string): void {
        if (this.statusLabel) this.statusLabel.string = text;
    }
}

