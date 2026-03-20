import { _decorator, Component, Node, Label, Color, UITransform, Graphics, director, Director, Vec3, UIOpacity, find, Button, isValid } from 'cc';
import { InventoryManager } from '../Manager/InventoryManager';
import { GameProgressManager } from '../Manager/GameProgressManager';
import { IngredientType } from '../Data/GameConfig';
import { EventManager } from '../Utils/EventManager';
import { GuideEvents } from './GuideEvents';
import { CookingControllerV2 } from '../Game/CookingControllerV2';
import { SceneRouteService } from '../Manager/SceneRouteService';

const { ccclass } = _decorator;

type GuideStep = {
    id: string;
    scene: string;
    text: string;
    minStay?: number;
    position?: Vec3;
    expectShopRequired?: boolean;
    expectShopConfirm?: boolean;
    expectProcessingType?: string;
    expectProcessingComplete?: boolean;
    expectCookingAction?: string[];
    mismatchHint?: string;
    praise?: string;
    autoSkip?: () => boolean;
};

@ccclass('GuideManager')
export class GuideManager extends Component {
    public static instance: GuideManager | null = null;

    private active = false;
    private steps: GuideStep[] = [];
    private currentIndex = 0;
    private stepStartAt = 0;
    private pendingAdvance = false;
    private currentScene = '';

    private guidePanel: Node | null = null;
    private guideLabel: Label | null = null;
    private guideLabelNode: Node | null = null;
    private guideLabelTransform: UITransform | null = null;
    private guideBubbleGraphics: Graphics | null = null;
    private guideBubbleTransform: UITransform | null = null;
    private guideSkipButton: Button | null = null;

    private lotteryButtonStates: Array<{ node: Node; active: boolean; interactable?: boolean; enabled?: boolean }> = [];

    private lastShopCounts: Record<string, number> = {};
    private sessionStarted = false;
    private readonly mentorName = '王师傅';

    onLoad() {
        if (GuideManager.instance && GuideManager.instance !== this) {
            this.node.destroy();
            return;
        }
        GuideManager.instance = this;
        director.addPersistRootNode(this.node);
        this.bindEvents();
        this.buildSteps();
        director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this.onSceneChange, this);
    }

    start() {
        this.refreshActiveState();
        this.onSceneChange();
    }

    onDestroy() {
        if (GuideManager.instance === this) {
            director.off(Director.EVENT_AFTER_SCENE_LAUNCH, this.onSceneChange, this);
            GuideManager.instance = null;
        }
        this.unbindEvents();
    }

    public isTutorialActive(): boolean {
        return this.active;
    }

    public shouldStartTutorial(): boolean {
        return this.active;
    }

    public skipTutorial() {
        this.completeTutorial();
    }

    public onCookingAction(action: string, _data?: any) {
        if (!this.active) return;
        this.handleCookingAction(action);
    }

    private bindEvents() {
        EventManager.Instance.on(GuideEvents.SHOP_ENTER, this.onShopEnter);
        EventManager.Instance.on(GuideEvents.SHOP_CART_CHANGE, this.onShopCartChange);
        EventManager.Instance.on(GuideEvents.SHOP_QUICK_BUY, this.onShopCartChange);
        EventManager.Instance.on(GuideEvents.SHOP_CONFIRM, this.onShopConfirm);
        EventManager.Instance.on(GuideEvents.PROCESSING_ENTER, this.onProcessingEnter);
        EventManager.Instance.on(GuideEvents.PROCESSING_CHOP, this.onProcessingChop);
        EventManager.Instance.on(GuideEvents.PROCESSING_COMPLETE, this.onProcessingComplete);
        EventManager.Instance.on(GuideEvents.PROCESSING_NEXT, this.onProcessingNext);
        EventManager.Instance.on(GuideEvents.COOKING_ENTER, this.onCookingEnter);
        EventManager.Instance.on(GuideEvents.COOKING_ACTION, this.onCookingActionEvent);
        EventManager.Instance.on(GuideEvents.COOKING_COMPLETE, this.onCookingComplete);
        EventManager.Instance.on(GuideEvents.GUIDE_SKIP, this.onGuideSkip);
    }

    private unbindEvents() {
        EventManager.Instance.off(GuideEvents.SHOP_ENTER, this.onShopEnter);
        EventManager.Instance.off(GuideEvents.SHOP_CART_CHANGE, this.onShopCartChange);
        EventManager.Instance.off(GuideEvents.SHOP_QUICK_BUY, this.onShopCartChange);
        EventManager.Instance.off(GuideEvents.SHOP_CONFIRM, this.onShopConfirm);
        EventManager.Instance.off(GuideEvents.PROCESSING_ENTER, this.onProcessingEnter);
        EventManager.Instance.off(GuideEvents.PROCESSING_CHOP, this.onProcessingChop);
        EventManager.Instance.off(GuideEvents.PROCESSING_COMPLETE, this.onProcessingComplete);
        EventManager.Instance.off(GuideEvents.PROCESSING_NEXT, this.onProcessingNext);
        EventManager.Instance.off(GuideEvents.COOKING_ENTER, this.onCookingEnter);
        EventManager.Instance.off(GuideEvents.COOKING_ACTION, this.onCookingActionEvent);
        EventManager.Instance.off(GuideEvents.COOKING_COMPLETE, this.onCookingComplete);
        EventManager.Instance.off(GuideEvents.GUIDE_SKIP, this.onGuideSkip);
    }

    private refreshActiveState() {
        const progress = GameProgressManager.instance?.progress;
        if (!progress) {
            this.active = false;
            return;
        }
        if (progress.tutorialCompleted) {
            this.active = false;
            return;
        }
        const levelOk = progress.currentLevel === 1;
        const dayOk = progress.currentDay === 1;
        this.active = levelOk && dayOk && this.sessionStarted;
        if (!this.active) {
            this.hideGuide();
        }
    }

    private buildSteps() {
        this.steps = [
            {
                id: 'shop_intro',
                scene: 'ShopScene',
                text: '南方来的小子，先别慌开火。\n我是王师傅，你先照着买料，边做边学，不顺手就直接跳过教学。',
                minStay: 1.2
            },
            {
                id: 'shop_required',
                scene: 'ShopScene',
                text: '起手别整花活，先把面饼、鸡蛋、香肠、洋葱、香菜备齐。\n带 🔪 的料后面去备菜，今天我只动嘴不动手。',
                expectShopRequired: true,
                minStay: 1.2,
                mismatchHint: '料还没齐。别怕慢，缺啥补啥，买错了也不耽误你继续做。',
                autoSkip: () => this.hasRequiredShopItems(),
                praise: '行，基本盘先稳住。'
            },
            {
                id: 'shop_confirm',
                scene: 'ShopScene',
                text: '买够了就走流程，点“购买并开始营业”。\n你也可以现在跳过教学，直接进正式营业。',
                expectShopConfirm: true,
                minStay: 1.0
            },
            {
                id: 'processing_intro',
                scene: 'ProcessingScene',
                text: '进后厨了。洋葱和香菜该切就切，我在旁边盯着，不会锁你操作。',
                minStay: 1.0
            },
            {
                id: 'processing_onion',
                scene: 'ProcessingScene',
                text: '先拿洋葱练手：上砧板，切够三下就算过。',
                expectProcessingType: 'onion',
                minStay: 1.0,
                autoSkip: () => !this.hasRawIngredient(IngredientType.ONION),
                mismatchHint: '别急，切错了就再来一份，今天不扣分。'
            },
            {
                id: 'processing_cilantro',
                scene: 'ProcessingScene',
                text: '再把香菜过一遍刀。东北客人嘴刁，配料得利索。',
                expectProcessingType: 'cilantro',
                minStay: 1.0,
                autoSkip: () => !this.hasRawIngredient(IngredientType.CILANTRO),
                mismatchHint: '香菜没切好也没事，重新放上砧板继续。'
            },
            {
                id: 'processing_complete',
                scene: 'ProcessingScene',
                text: '备菜差不多了，点“开始营业”上炉。真正的手感得到铁板上练。',
                expectProcessingComplete: true,
                minStay: 1.0
            },
            {
                id: 'cooking_intro',
                scene: 'Level1CookingScene',
                text: '上炉第一件事先润锅。喷油后再落面，动作慢点没事。',
                expectCookingAction: ['oil_applied'],
                minStay: 1.0,
                mismatchHint: '先喷油，再放面饼。做废了就扔掉重来，别硬交。'
            },
            {
                id: 'cooking_dough',
                scene: 'Level1CookingScene',
                text: '把面饼落到有油的位置，别甩偏了。',
                expectCookingAction: ['dough_placed'],
                minStay: 1.0
            },
            {
                id: 'cooking_egg',
                scene: 'Level1CookingScene',
                text: '先给它打一颗蛋，起码得像个样子。',
                expectCookingAction: ['egg_added'],
                minStay: 1.0
            },
            {
                id: 'cooking_flip',
                scene: 'Level1CookingScene',
                text: '铲子拿稳，翻面别怂。',
                expectCookingAction: ['flipped'],
                minStay: 1.0
            },
            {
                id: 'cooking_sauce',
                scene: 'Level1CookingScene',
                text: '刷酱。东北摊子讲究这个味儿。',
                expectCookingAction: ['sauce_applied'],
                minStay: 1.0
            },
            {
                id: 'cooking_toppings',
                scene: 'Level1CookingScene',
                text: '把香肠、洋葱、香菜补齐。做错了我只提醒，你自己重来。',
                expectCookingAction: ['sausage_added', 'onion_added', 'cilantro_added'],
                minStay: 1.0
            },
            {
                id: 'cooking_roll',
                scene: 'Level1CookingScene',
                text: '差不多了就卷。别怕慢，卷散了还能再做。',
                expectCookingAction: ['rolled'],
                minStay: 1.0
            },
            {
                id: 'cooking_cut',
                scene: 'Level1CookingScene',
                text: '切三刀，别省这手工。',
                expectCookingAction: ['cut'],
                minStay: 1.0
            },
            {
                id: 'cooking_pack',
                scene: 'Level1CookingScene',
                text: '点面饼打包。要是配料不对，我只吐槽，你继续返工。',
                expectCookingAction: ['packed'],
                minStay: 1.0
            },
            {
                id: 'cooking_deliver',
                scene: 'Level1CookingScene',
                text: '交出去这单，你这摊子就算正式开张。',
                expectCookingAction: ['delivered'],
                minStay: 1.0,
                praise: '✅ 行，第一份算立住了。'
            }
        ];
    }

    private onSceneChange = () => {
        this.currentScene = director.getScene()?.name || '';
        if (!this.active) {
            this.hideGuide();
            this.setLotteryButtonsEnabled(true);
            return;
        }
        this.ensureGuideUI();
        this.syncStepToScene();
        this.showCurrentStep();
        this.updateLotteryButtonState();
    };

    private ensureGuideUI() {
        const canvas = find('Canvas') || director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;
        let panel = canvas.getChildByName('GuidePanel');
        if (!panel) {
            panel = new Node('GuidePanel');
            const transform = panel.addComponent(UITransform);
            transform.setContentSize(520, 140);
            panel.addComponent(UIOpacity).opacity = 230;

            const bubbleNode = new Node('GuideBubble');
            const bubbleTransform = bubbleNode.addComponent(UITransform);
            bubbleTransform.setContentSize(520, 140);
            const bubbleGraphics = bubbleNode.addComponent(Graphics);

            const labelNode = new Node('GuideLabel');
            const label = labelNode.addComponent(Label);
            label.fontSize = 20;
            label.lineHeight = 26;
            label.color = new Color(255, 255, 255, 255);
            label.horizontalAlign = Label.HorizontalAlign.LEFT;
            label.verticalAlign = Label.VerticalAlign.TOP;
            label.overflow = Label.Overflow.RESIZE_HEIGHT;

            const labelTransform = labelNode.getComponent(UITransform);
            if (labelTransform) {
                labelTransform.setAnchorPoint(0, 1);
                labelTransform.setContentSize(480, 90);
            }
            labelNode.setPosition(-240, 50, 0);

            bubbleNode.addChild(labelNode);
            panel.addChild(bubbleNode);

            const skipNode = new Node('GuideSkipButton');
            const skipTransform = skipNode.addComponent(UITransform);
            skipTransform.setContentSize(110, 34);
            const skipGraphics = skipNode.addComponent(Graphics);
            skipGraphics.fillColor = new Color(255, 183, 77, 235);
            skipGraphics.roundRect(-55, -17, 110, 34, 10);
            skipGraphics.fill();
            const skipButton = skipNode.addComponent(Button);

            const skipLabelNode = new Node('GuideSkipLabel');
            const skipLabel = skipLabelNode.addComponent(Label);
            skipLabel.string = '跳过教学';
            skipLabel.fontSize = 16;
            skipLabel.color = new Color(54, 33, 12, 255);
            skipLabelNode.setPosition(0, 0, 0);
            skipNode.addChild(skipLabelNode);
            skipNode.setPosition(180, -45, 0);
            skipNode.on(Button.EventType.CLICK, this.onGuideSkip, this);
            panel.addChild(skipNode);

            panel.setPosition(-250, 250, 0);
            canvas.addChild(panel);

            this.guidePanel = panel;
            this.guideLabel = label;
            this.guideLabelNode = labelNode;
            this.guideLabelTransform = labelTransform ?? null;
            this.guideBubbleGraphics = bubbleGraphics;
            this.guideBubbleTransform = bubbleTransform;
            this.guideSkipButton = skipButton;
            this.drawGuideBubble(520, 140);
        } else {
            this.guidePanel = panel;
            const bubbleNode = panel.getChildByName('GuideBubble');
            if (bubbleNode) {
                this.guideBubbleGraphics = bubbleNode.getComponent(Graphics);
                this.guideBubbleTransform = bubbleNode.getComponent(UITransform);
                const labelNode = bubbleNode.getChildByName('GuideLabel');
                this.guideLabelNode = labelNode;
                this.guideLabel = labelNode ? labelNode.getComponent(Label) : null;
                this.guideLabelTransform = labelNode ? labelNode.getComponent(UITransform) : null;
            } else {
                this.guideLabel = null;
            }
            const skipNode = panel.getChildByName('GuideSkipButton');
            this.guideSkipButton = skipNode ? skipNode.getComponent(Button) : null;
        }
    }

    private showCurrentStep() {
        const step = this.steps[this.currentIndex];
        if (!step || step.scene !== this.currentScene) {
            this.hideGuide();
            return;
        }

        if (step.autoSkip && step.autoSkip()) {
            this.advanceStep();
            return;
        }

        if (this.guidePanel) {
            this.guidePanel.active = true;
            if (step.position) {
                this.guidePanel.setPosition(step.position);
            }
        }
        if (this.guideLabel) {
            const content = `${this.mentorName}：${step.text}`;
            this.guideLabel.string = content;
            this.updateGuideLayout(content);
        }
        this.stepStartAt = Date.now();
        this.pendingAdvance = false;
        this.updateCookingNPC(step.text);
    }

    private updateCookingNPC(text: string) {
        if (this.currentScene !== 'Level1CookingScene') return;
        const controller = this.findCookingController();
        if (controller) {
            controller.showNPCDialogue(text, 0);
        }
    }

    private findCookingController(): CookingControllerV2 | null {
        const canvas = find('Canvas');
        if (!canvas) return null;
        const node = canvas.getChildByName('CookingController');
        if (!node) return null;
        return node.getComponent(CookingControllerV2);
    }

    private hideGuide() {
        if (this.guidePanel) {
            this.guidePanel.active = false;
        }
    }

    private syncStepToScene() {
        const step = this.steps[this.currentIndex];
        if (!step || step.scene === this.currentScene) return;
        const nextIndex = this.steps.findIndex((s, idx) => idx >= this.currentIndex && s.scene === this.currentScene);
        if (nextIndex >= 0) {
            this.currentIndex = nextIndex;
        }
    }

    private handleShopCartChange(counts: Record<string, number>) {
        this.lastShopCounts = counts || {};
        if (!this.active) return;
        const step = this.steps[this.currentIndex];
        if (!step || step.scene !== 'ShopScene') return;
        if (step.expectShopRequired && this.hasRequiredShopItems()) {
            this.markAdvance(step.praise || '✅ 选得不错！');
        }
    }

    private handleShopConfirm() {
        const step = this.steps[this.currentIndex];
        if (!step || step.scene !== 'ShopScene') return;
        if (step.expectShopConfirm) {
            this.markAdvance(step.praise || '✅ 准备出发！');
        }
    }

    private handleProcessingChop(type: string) {
        const step = this.steps[this.currentIndex];
        if (!step || step.scene !== 'ProcessingScene') return;
        if (step.expectProcessingType && step.expectProcessingType === type) {
            this.markAdvance(step.praise || '✅ 切得漂亮！');
        }
    }

    private handleProcessingComplete() {
        const step = this.steps[this.currentIndex];
        if (!step || step.scene !== 'ProcessingScene') return;
        if (step.expectProcessingComplete) {
            this.markAdvance(step.praise || '✅ 备菜完成！');
        }
    }

    private handleCookingAction(action: string) {
        const step = this.steps[this.currentIndex];
        if (!step || step.scene !== this.currentScene) return;
        if (step.expectCookingAction && step.expectCookingAction.indexOf(action) !== -1) {
            this.markAdvance(step.praise || '✅ 做得好！');
            if (action === 'delivered') {
                this.completeTutorial();
            }
            return;
        }
        if (step.mismatchHint) {
            this.showHint(step.mismatchHint);
        }
    }

    private markAdvance(praise: string) {
        this.pendingAdvance = true;
        if (praise) {
            this.showHint(praise);
        }
        this.scheduleOnce(this.tryAdvance, 0.2);
    }

    private tryAdvance = () => {
        if (!this.pendingAdvance) return;
        const step = this.steps[this.currentIndex];
        const minStay = step?.minStay ?? 0;
        const elapsed = (Date.now() - this.stepStartAt) / 1000;
        if (elapsed < minStay) {
            this.scheduleOnce(this.tryAdvance, minStay - elapsed);
            return;
        }
        this.advanceStep();
    };

    private advanceStep() {
        this.pendingAdvance = false;
        this.currentIndex += 1;
        if (this.currentIndex >= this.steps.length) {
            this.completeTutorial();
            return;
        }
        this.showCurrentStep();
    }

    private completeTutorial() {
        const progress = GameProgressManager.instance?.progress;
        if (progress) {
            progress.tutorialCompleted = true;
            progress.lastSaveTime = Date.now();
            GameProgressManager.instance.saveProgress();
        }
        this.active = false;
        this.hideGuide();
        this.setLotteryButtonsEnabled(true);
        const controller = this.findCookingController();
        if (controller && this.currentScene === 'Level1CookingScene') {
            controller.hideNPCDialogue();
            controller.startCustomerSystem();
            return;
        }
        SceneRouteService.goBusiness();
    }

    private showHint(text: string) {
        if (this.guideLabel) {
            const content = `${this.mentorName}：${text}`;
            this.guideLabel.string = content;
            this.updateGuideLayout(content);
        }
        this.updateCookingNPC(text);
    }

    public showDialogueByKey(key: string) {
        const textMap: Record<string, string> = {
            verify_burnt: '这张火大了，别硬卖。扔掉重做，手稳一点。',
            verify_no_egg: '你这南方摊子也得守规矩，这份没打蛋，补上再说。',
            verify_no_sauce: '酱还没刷，味儿没立住。补一遍继续做。',
            verify_no_condiments: '料太单薄了，至少再补两样调料。做坏了就返工。'
        };
        const text = textMap[key] || '手上这份还差点意思，照提示补一补就行。';
        this.showHint(text);
    }

    private updateGuideLayout(text: string) {
        if (!this.guidePanel || !this.guideLabelTransform || !this.guideBubbleTransform) return;
        const padding = 18;
        const lineHeight = this.guideLabel?.lineHeight ?? 26;
        const rawLines = text.split('\n').length;
        const estimateWrap = Math.ceil(text.replace(/\n/g, '').length / 18);
        const totalLines = Math.max(rawLines, estimateWrap);
        const targetWidth = 520;
        const targetHeight = Math.max(120, padding * 2 + totalLines * lineHeight + 6);
        const panelHeight = targetHeight + 44;

        this.guideBubbleTransform.setContentSize(targetWidth, targetHeight);
        const panelTransform = this.guidePanel.getComponent(UITransform);
        panelTransform?.setContentSize(targetWidth, panelHeight);

        this.guideLabelTransform.setContentSize(targetWidth - padding * 2, targetHeight - padding * 2);
        if (this.guideLabelNode) {
            this.guideLabelNode.setPosition(-targetWidth / 2 + padding, targetHeight / 2 - padding, 0);
        }
        const skipNode = this.guideSkipButton?.node;
        if (skipNode) {
            skipNode.setPosition(180, -targetHeight / 2 - 18, 0);
        }
        this.drawGuideBubble(targetWidth, targetHeight);
    }

    private drawGuideBubble(width: number, height: number) {
        if (!this.guideBubbleGraphics) return;
        const graphics = this.guideBubbleGraphics;
        const radius = 14;
        const tailWidth = 22;
        const tailHeight = 12;
        const tailOffset = 70;
        const left = -width / 2;
        const right = width / 2;
        const top = height / 2;
        const bottom = -height / 2;

        graphics.clear();
        graphics.fillColor = new Color(20, 20, 20, 220);
        graphics.moveTo(left + radius, top);
        graphics.lineTo(right - radius, top);
        graphics.quadraticCurveTo(right, top, right, top - radius);
        graphics.lineTo(right, bottom + radius);
        graphics.quadraticCurveTo(right, bottom, right - radius, bottom);
        graphics.lineTo(left + tailOffset + tailWidth, bottom);
        graphics.lineTo(left + tailOffset + tailWidth / 2, bottom - tailHeight);
        graphics.lineTo(left + tailOffset, bottom);
        graphics.lineTo(left + radius, bottom);
        graphics.quadraticCurveTo(left, bottom, left, bottom + radius);
        graphics.lineTo(left, top - radius);
        graphics.quadraticCurveTo(left, top, left + radius, top);
        graphics.close();
        graphics.fill();
    }

    private updateLotteryButtonState() {
        this.setLotteryButtonsEnabled(true);
    }

    private setLotteryButtonsEnabled(enabled: boolean) {
        if (enabled) {
            this.lotteryButtonStates.forEach(state => {
                if (!state.node || !isValid(state.node)) return;
                state.node.active = state.active;
                const btn = state.node.getComponent(Button);
                if (btn) {
                    if (typeof state.interactable === 'boolean') btn.interactable = state.interactable;
                    if (typeof state.enabled === 'boolean') btn.enabled = state.enabled;
                }
            });
            this.lotteryButtonStates = [];
            return;
        }

        // 非强制教学：不再在教程阶段禁用任何入口
    }

    private collectNodesByName(root: Node, names: string[], results: Node[]) {
        if (names.indexOf(root.name) >= 0) {
            results.push(root);
        }
        for (const child of root.children) {
            this.collectNodesByName(child, names, results);
        }
    }

    private hasRequiredShopItems(): boolean {
        const inventory = InventoryManager.instance;
        const required = [
            IngredientType.DOUGH,
            IngredientType.EGG,
            IngredientType.SAUSAGE,
            IngredientType.ONION,
            IngredientType.CILANTRO
        ];
        for (const type of required) {
            const owned = inventory ? inventory.getIngredientCount(type) : { raw: 0, processed: 0 };
            const cartCount = this.lastShopCounts[type] || 0;
            if ((owned.raw + owned.processed + cartCount) <= 0) {
                return false;
            }
        }
        return true;
    }

    private hasRawIngredient(type: IngredientType): boolean {
        const inventory = InventoryManager.instance;
        if (!inventory) return false;
        const count = inventory.getIngredientCount(type);
        return count.raw > 0;
    }

    // ======= Event callbacks =======
    private onShopEnter = () => {
        this.sessionStarted = true;
        this.currentIndex = 0;
        this.refreshActiveState();
        this.onSceneChange();
    };

    private onShopCartChange = (payload: any) => {
        this.handleShopCartChange(payload?.counts || {});
    };

    private onShopConfirm = () => {
        this.handleShopConfirm();
    };

    private onProcessingEnter = () => {
        this.refreshActiveState();
        this.onSceneChange();
    };

    private onProcessingChop = (payload: any) => {
        const type = payload?.ingredientType || payload;
        if (!type) return;
        this.handleProcessingChop(type);
    };

    private onProcessingComplete = () => {
        this.handleProcessingComplete();
    };

    private onProcessingNext = () => {
        this.handleProcessingComplete();
    };

    private onGuideSkip = () => {
        this.skipTutorial();
    };

    private onCookingEnter = () => {
        this.refreshActiveState();
        this.onSceneChange();
    };

    private onCookingActionEvent = (action: any) => {
        if (typeof action === 'string') {
            this.handleCookingAction(action);
        } else if (action?.action) {
            this.handleCookingAction(action.action);
        }
    };

    private onCookingComplete = () => {
        this.completeTutorial();
    };
}
