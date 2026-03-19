import { _decorator, Node, Label, UITransform, Vec3, input, Input, EventMouse, view, game, find, director, Button } from 'cc';
import { PREVIEW, EDITOR, DEV } from 'cc/env';
import { IngredientType } from '../Data/GameConfig';
import { InventoryManager } from '../Manager/InventoryManager';
import { GameProgressManager } from '../Manager/GameProgressManager';
import { BaseCookingController } from './Base/BaseCookingController';
import { CookingControllerV2 } from './CookingControllerV2';

const { ccclass, property } = _decorator;

type ToolType = 'chopsticks' | 'skimmer' | null;
type HandKind = 'fried' | 'cooked' | 'marinated' | 'ingredient';
type SauceType = 'classic' | 'ketchup';

interface HandItem {
    kind: HandKind;
    count: number;
    ingredientType?: IngredientType;
}

@ccclass('GuoBaoRouController')
export class GuoBaoRouController extends BaseCookingController {
    @property(Node)
    root: Node = null!;

    @property(Node)
    marinadeArea: Node = null!;

    @property(Node)
    marinadeProgressFill: Node = null!;

    @property(Label)
    marinadeStatusLabel: Label = null!;

    @property(Label)
    marinatedCountLabel: Label = null!;

    @property(Node)
    fryArea: Node = null!;

    @property(Node)
    fryProgressFill: Node = null!;

    @property(Label)
    fryStatusLabel: Label = null!;

    @property(Label)
    friedCountLabel: Label = null!;

    @property(Node)
    sauceArea: Node = null!;

    @property(Node)
    ketchupBowlArea: Node = null!;

    @property(Label)
    sauceStatusLabel: Label = null!;

    @property(Node)
    stirFryArea: Node = null!;

    @property(Node)
    stirFryProgressFill: Node = null!;

    @property(Label)
    stirFryStatusLabel: Label = null!;

    @property(Node)
    cookedTrayArea: Node = null!;

    @property(Label)
    cookedCountLabel: Label = null!;

    @property(Node)
    packagingArea: Node = null!;

    @property(Label)
    packagingCountLabel: Label = null!;

    @property(Label)
    packagingSizeLabel: Label = null!;

    @property(Label)
    instructionLabel: Label = null!;

    @property(Node)
    mouseFollower: Node = null!;

    // 食材按钮
    @property(Node)
    meatBtn: Node = null!;

    @property(Node)
    radishBtn: Node = null!;

    @property(Node)
    gingerBtn: Node = null!;

    @property(Node)
    greenOnionBtn: Node = null!;

    @property(Node)
    starchBtn: Node = null!;

    // 腌制调料按钮
    @property(Node)
    marinadeSaltBtn: Node = null!;

    @property(Node)
    marinadeSoyBtn: Node = null!;

    @property(Node)
    marinadePepperBtn: Node = null!;

    @property(Node)
    marinadeWaterBtn: Node = null!;

    // 调汁按钮
    @property(Node)
    sauceVinegarBtn: Node = null!;

    @property(Node)
    sauceSugarBtn: Node = null!;

    @property(Node)
    sauceWaterBtn: Node = null!;

    @property(Node)
    sauceKetchupBtn: Node = null!;

    // 工具与打包
    @property(Node)
    chopsticksBtn: Node = null!;

    @property(Node)
    skimmerBtn: Node = null!;

    @property(Node)
    smallPackBtn: Node = null!;

    @property(Node)
    largePackBtn: Node = null!;

    // ==================== 状态 ====================
    private activeTool: ToolType = null;
    private handItem: HandItem | null = null;

    private marinadeMeatCount: number = 0;
    private marinatedReadyCount: number = 0;
    private isMarinating: boolean = false;
    private marinateProgress: number = 0;
    private marinadeCondiments = { salt: false, soy: false, pepper: false, water: false, starch: false };

    private fryingPieces: number[] = [];
    private friedReadyCount: number = 0;

    private sauceBowls: Record<SauceType, { sugar: boolean; vinegar: boolean; water: boolean; ketchup: boolean }> = {
        classic: { sugar: false, vinegar: false, water: false, ketchup: false },
        ketchup: { sugar: false, vinegar: false, water: false, ketchup: false },
    };
    private selectedSauceType: SauceType | null = null;
    private stirFrySauceUsed: boolean = false;
    private lastSauceType: SauceType | null = null;

    private veggiesAdded = { radish: false, ginger: false, greenOnion: false };
    private stirFryMeatCount: number = 0;
    private stirFryClicks: number = 0;

    private cookedReadyCount: number = 0;
    private lastCookQuality: number = 80;

    private packSize: 'small' | 'large' = 'small';
    private packCount: number = 0;

    private readonly MARINATE_TIME = 3.0;
    private readonly FRY_TIME = 4.0;
    private readonly FRY_LIMIT = 30;
    private readonly STIR_FRY_TARGET = 6;
    private readonly PACK_TARGET_SMALL = 8;
    private readonly PACK_TARGET_LARGE = 12;
    private readonly MARINATE_MEAT_LIMIT = 30;

    private _nativeMouseMoveHandler: ((event: MouseEvent) => void) | null = null;
    private _uiHitTestDisabled: boolean = false;
    private _blockedHitTests: Map<Node, Function> = new Map();
    private _manualAreaClickEnabled: boolean = false;
    private _areaNodes: Node[] = [];

    protected getRecipe(): any {
        return {
            levelId: 3,
            name: '锅包肉',
            ingredients: [
                IngredientType.PORK,
                IngredientType.RADISH,
                IngredientType.GINGER,
                IngredientType.GREEN_ONION,
                IngredientType.POTATO_STARCH
            ]
        };
    }

    protected initCookingArea(): void {
        this.infiniteIngredients.add(IngredientType.SALT);
        this.infiniteIngredients.add(IngredientType.SOY_SAUCE);
        this.infiniteIngredients.add(IngredientType.PEPPER_POWDER);
        this.infiniteIngredients.add(IngredientType.WATER);
        this.infiniteIngredients.add(IngredientType.SUGAR);
        this.infiniteIngredients.add(IngredientType.VINEGAR);
        this.infiniteIngredients.add(IngredientType.KETCHUP);
        this.resolveNodes();
        this.bindButtons();
        this.bindAreas();
        this.setupMouseFollower();
        this.seedPreviewInventory();
        this.updateAllDisplays();
        this.showMessage('点击腌制区加入肉片与调料，完成后开始油炸与翻炒');
    }

    protected onIngredientClick(ingredientType: IngredientType): void {
        switch (ingredientType) {
            case IngredientType.PORK:
                this.startPickupIngredient(ingredientType);
                break;
            case IngredientType.RADISH:
                this.addVeggie('radish', ingredientType);
                break;
            case IngredientType.GINGER:
                this.addVeggie('ginger', ingredientType);
                break;
            case IngredientType.GREEN_ONION:
                this.addVeggie('greenOnion', ingredientType);
                break;
            case IngredientType.POTATO_STARCH:
                this.startPickupIngredient(ingredientType);
                break;
        }
    }

    protected checkFoodComplete(): any | null {
        return null;
    }

    protected calculateFoodQuality(): number {
        return this.lastCookQuality;
    }

    update(dt: number): void {
        if (this.fryingPieces.length === 0) return;
        for (let i = this.fryingPieces.length - 1; i >= 0; i--) {
            this.fryingPieces[i] += dt / this.FRY_TIME;
            if (this.fryingPieces[i] >= 1) {
                this.fryingPieces.splice(i, 1);
                this.friedReadyCount += 1;
            }
        }
        this.updateFryStatus();
    }

    onDestroy(): void {
        this.removeMouseListeners();
        if (input?.off) {
            input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
            input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        }
        this.enableUiHitTest();
    }

    // ==================== 初始化/绑定 ====================

    private resolveNodes(): void {
        if (!this.root) {
            this.root = find('Canvas/GuoBaoRouRoot') as Node;
        }

        this.marinadeArea = this.marinadeArea || this.findNode('MarinadePanel/MarinadeArea');
        this.marinadeProgressFill = this.marinadeProgressFill || this.findNode('MarinadePanel/MarinadeProgress/Fill');
        this.marinadeStatusLabel = this.marinadeStatusLabel || this.findLabel('MarinadePanel/MarinadeStatusLabel');
        this.marinatedCountLabel = this.marinatedCountLabel || this.findLabel('MarinadePanel/MarinatedCountLabel');

        this.fryArea = this.fryArea || this.findNode('FryPanel/FryArea');
        this.fryProgressFill = this.fryProgressFill || this.findNode('FryPanel/FryProgress/Fill');
        this.fryStatusLabel = this.fryStatusLabel || this.findLabel('FryPanel/FryStatusLabel');
        this.friedCountLabel = this.friedCountLabel || this.findLabel('FryPanel/FriedCountLabel');

        this.sauceArea = this.sauceArea || this.findNode('SaucePanel/ClassicBowlArea') || this.findNode('SaucePanel/SauceArea');
        this.ketchupBowlArea = this.ketchupBowlArea || this.findNode('SaucePanel/KetchupBowlArea');
        this.sauceStatusLabel = this.sauceStatusLabel || this.findLabel('SaucePanel/SauceStatusLabel');

        this.stirFryArea = this.stirFryArea || this.findNode('StirFryPanel/StirFryArea');
        this.stirFryProgressFill = this.stirFryProgressFill || this.findNode('StirFryPanel/StirFryProgress/Fill');
        this.stirFryStatusLabel = this.stirFryStatusLabel || this.findLabel('StirFryPanel/StirFryStatusLabel');

        this.cookedTrayArea = this.cookedTrayArea || this.findNode('CookedTrayArea');
        this.cookedCountLabel = this.cookedCountLabel || this.findLabel('CookedTrayArea/CookedCountLabel');

        this.packagingArea = this.packagingArea || this.findNode('PackagingPanel/PackagingArea');
        this.packagingCountLabel = this.packagingCountLabel || this.findLabel('PackagingPanel/PackagingCountLabel');
        this.packagingSizeLabel = this.packagingSizeLabel || this.findLabel('PackagingPanel/PackagingSizeLabel');

        this.instructionLabel = this.instructionLabel || this.findLabel('InstructionLabel');
        this.mouseFollower = this.mouseFollower || this.findNode('MouseFollower');

        this.meatBtn = this.meatBtn || this.findNode('MarinadePanel/MeatBtn') || this.findNode('IngredientsPanel/MeatBtn');
        this.radishBtn = this.radishBtn || this.findNode('StirFryPanel/RadishBtn') || this.findNode('IngredientsPanel/RadishBtn');
        this.gingerBtn = this.gingerBtn || this.findNode('StirFryPanel/GingerBtn') || this.findNode('IngredientsPanel/GingerBtn');
        this.greenOnionBtn = this.greenOnionBtn || this.findNode('StirFryPanel/GreenOnionBtn') || this.findNode('IngredientsPanel/GreenOnionBtn');
        this.starchBtn = this.starchBtn || this.findNode('MarinadePanel/StarchBtn') || this.findNode('IngredientsPanel/StarchBtn');

        this.marinadeSaltBtn = this.marinadeSaltBtn || this.findNode('MarinadePanel/SaltBtn');
        this.marinadeSoyBtn = this.marinadeSoyBtn || this.findNode('MarinadePanel/SoyBtn');
        this.marinadePepperBtn = this.marinadePepperBtn || this.findNode('MarinadePanel/PepperBtn');
        this.marinadeWaterBtn = this.marinadeWaterBtn || this.findNode('MarinadePanel/WaterBtn');

        this.sauceVinegarBtn = this.sauceVinegarBtn || this.findNode('SaucePanel/VinegarBtn');
        this.sauceSugarBtn = this.sauceSugarBtn || this.findNode('SaucePanel/SugarBtn');
        this.sauceWaterBtn = this.sauceWaterBtn || this.findNode('SaucePanel/WaterBtn');
        this.sauceKetchupBtn = this.sauceKetchupBtn || this.findNode('SaucePanel/KetchupBtn');

        this.chopsticksBtn = this.chopsticksBtn || this.findNode('ToolPanel/ChopsticksBtn');
        this.skimmerBtn = this.skimmerBtn || this.findNode('ToolPanel/SkimmerBtn');

        this.smallPackBtn = this.smallPackBtn || this.findNode('PackagingPanel/SmallPackBtn');
        this.largePackBtn = this.largePackBtn || this.findNode('PackagingPanel/LargePackBtn');

        this._areaNodes = [
            this.marinadeArea,
            this.fryArea,
            this.sauceArea,
            this.ketchupBowlArea,
            this.stirFryArea,
            this.cookedTrayArea,
            this.packagingArea,
        ].filter((node) => !!node) as Node[];
    }

    private findNode(path: string): Node | null {
        if (this.root) {
            const node = find(path, this.root) as Node;
            if (node) return node;
        }
        return find(`Canvas/${path}`) as Node;
    }

    private findLabel(path: string): Label | null {
        const node = this.findNode(path);
        return node ? node.getComponent(Label) : null;
    }

    private bindButtons(): void {
        this.bindNodeClick(this.meatBtn, () => this.startPickupIngredient(IngredientType.PORK));
        this.bindNodeClick(this.radishBtn, () => this.onIngredientClick(IngredientType.RADISH));
        this.bindNodeClick(this.gingerBtn, () => this.onIngredientClick(IngredientType.GINGER));
        this.bindNodeClick(this.greenOnionBtn, () => this.onIngredientClick(IngredientType.GREEN_ONION));
        this.bindNodeClick(this.starchBtn, () => this.startPickupIngredient(IngredientType.POTATO_STARCH));

        this.bindNodeClick(this.marinadeSaltBtn, () => this.startPickupIngredient(IngredientType.SALT));
        this.bindNodeClick(this.marinadeSoyBtn, () => this.startPickupIngredient(IngredientType.SOY_SAUCE));
        this.bindNodeClick(this.marinadePepperBtn, () => this.startPickupIngredient(IngredientType.PEPPER_POWDER));
        this.bindNodeClick(this.marinadeWaterBtn, () => this.startPickupIngredient(IngredientType.WATER));

        this.bindNodeClick(this.sauceSugarBtn, () => this.startPickupIngredient(IngredientType.SUGAR));
        this.bindNodeClick(this.sauceVinegarBtn, () => this.startPickupIngredient(IngredientType.VINEGAR));
        this.bindNodeClick(this.sauceWaterBtn, () => this.startPickupIngredient(IngredientType.WATER));
        this.bindNodeClick(this.sauceKetchupBtn, () => this.startPickupIngredient(IngredientType.KETCHUP));

        this.bindNodeClick(this.chopsticksBtn, () => this.toggleTool('chopsticks'));
        this.bindNodeClick(this.skimmerBtn, () => this.toggleTool('skimmer'));

        this.bindNodeClick(this.smallPackBtn, () => this.setPackSize('small'));
        this.bindNodeClick(this.largePackBtn, () => this.setPackSize('large'));
    }

    private bindAreas(): void {
        this.bindNodeClick(this.marinadeArea, () => this.handleMarinadeAreaClick());
        this.bindNodeClick(this.fryArea, () => this.handleFryAreaClick());
        this.bindNodeClick(this.sauceArea, () => this.handleSauceBowlClick('classic'));
        this.bindNodeClick(this.ketchupBowlArea, () => this.handleSauceBowlClick('ketchup'));
        this.bindNodeClick(this.stirFryArea, () => this.handleStirFryAreaClick());
        this.bindNodeClick(this.cookedTrayArea, () => this.handleCookedTrayClick());
        this.bindNodeClick(this.packagingArea, () => this.handlePackagingClick());
    }

    private bindNodeClick(node: Node, handler: () => void): void {
        if (!node) return;
        const button = node.getComponent(Button);
        if (button) {
            node.on(Button.EventType.CLICK, handler, this);
            return;
        }
        node.on(Node.EventType.TOUCH_END, handler, this);
    }

    private handleMarinadeAreaClick(): void {
        if (this.tryDropIngredientToMarinade()) {
            return;
        }
        if (this.activeTool === 'chopsticks' && this.marinatedReadyCount > 0) {
            this.pickMarinatedMeat();
            return;
        }
        this.tryStartMarinating();
    }

    private pickMarinatedMeat(): void {
        if (this.marinatedReadyCount <= 0) {
            this.showMessage('?? 没有腌制好的肉片');
            return;
        }
        if (this.handItem && this.handItem.kind !== 'marinated') {
            this.showMessage('?? 手上有其他食材');
            return;
        }
        if (this.handItem && this.handItem.count >= 1) {
            this.showMessage('?? 一次最多夹一片');
            return;
        }
        this.marinatedReadyCount -= 1;
        this.handItem = { kind: 'marinated', count: 1 };
        this.updateMarinadeStatus();
        this.updateHandFollower();
    }

    private handleSauceBowlClick(type: SauceType): void {
        if (this.tryDropIngredientToSauce(type)) {
            return;
        }
        if (!this.handItem && this.isSauceReady(type)) {
            this.selectedSauceType = type;
            const label = type === 'classic' ? '糖醋' : '番茄';
            this.showMessage(`🍲 已选择${label}料汁`);
            this.updateSauceStatus();
            return;
        }
        this.updateSauceStatus();
    }

    private startPickupIngredient(type: IngredientType): void {
        if (this.handItem && this.handItem.kind !== 'ingredient') {
            this.showMessage('🧺 请先放下手中物品');
            return;
        }
        if (this.handItem && this.handItem.kind === 'ingredient') {
            this.showMessage('🧺 手上已有食材');
            return;
        }
        if (!this.hasIngredientStock(type)) {
            this.showMessage('❌ 食材不足');
            return;
        }
        if (this.activeTool) {
            this.activeTool = null;
            this.updateToolButtons();
        }
        this.handItem = { kind: 'ingredient', count: 1, ingredientType: type };
        this.updateHandFollower();
    }

    private tryDropIngredientToMarinade(): boolean {
        if (!this.handItem || this.handItem.kind !== 'ingredient' || !this.handItem.ingredientType) {
            return false;
        }

        const type = this.handItem.ingredientType;
        if (type === IngredientType.PORK) {
            if (this.addMeatToMarinade()) {
                this.handItem = null;
                this.updateHandFollower();
            }
            return true;
        }

        if (type === IngredientType.SALT ||
            type === IngredientType.SOY_SAUCE ||
            type === IngredientType.PEPPER_POWDER ||
            type === IngredientType.WATER ||
            type === IngredientType.POTATO_STARCH) {
            const key = type === IngredientType.SALT
                ? 'salt'
                : type === IngredientType.SOY_SAUCE
                    ? 'soy'
                    : type === IngredientType.PEPPER_POWDER
                        ? 'pepper'
                        : type === IngredientType.WATER
                            ? 'water'
                            : 'starch';
            if (this.addMarinadeCondiment(key, type)) {
                this.handItem = null;
                this.updateHandFollower();
            }
            return true;
        }

        return false;
    }

    // ==================== 调味/腌制 ====================

    private addMeatToMarinade(): boolean {
        if (this.isMarinating) {
            this.showMessage('? 正在腌制中，稍等完成');
            return false;
        }
        if (this.marinadeMeatCount >= this.MARINATE_MEAT_LIMIT) {
            this.showMessage('?? 腌制碗已满（最多30片）');
            return false;
        }
        if (!this.consumeIngredientFromInventory(IngredientType.PORK, 1)) {
            this.showMessage('?? 没有里脊肉了');
            return false;
        }
        this.marinadeMeatCount += 1;
        this.updateMarinadeStatus();
        this.updateIngredientButtonLabels();
        return true;
    }

    private addMarinadeCondiment(key: 'salt' | 'soy' | 'pepper' | 'water' | 'starch', type: IngredientType): boolean {
        if (this.isMarinating) return false;
        if (this.marinadeCondiments[key]) {
            this.showMessage('?? 该调料已添加');
            return false;
        }
        if (!this.consumeIngredientFromInventory(type, 1)) {
            this.showMessage(key === 'starch' ? '?? 土豆淀粉不足' : '?? 调料不足');
            return false;
        }
        this.marinadeCondiments[key] = true;
        this.updateMarinadeStatus();
        this.updateIngredientButtonLabels();
        return true;
    }

    private tryStartMarinating(): void {
        if (this.isMarinating) return;
        if (this.marinadeMeatCount <= 0) {
            this.showMessage('⚠️ 先放入肉片');
            return;
        }
        if (!this.isMarinadeReady()) {
            this.showMessage('⚠️ 腌制调料还没齐');
            return;
        }
        this.isMarinating = true;
        this.marinateProgress = 0;
        this.updateMarinadeProgress();
        this.schedule(this.tickMarinate, 0.1);
        this.showMessage('🥣 腌制中...');
    }

    private tickMarinate(): void {
        this.marinateProgress += 0.1 / this.MARINATE_TIME;
        this.updateMarinadeProgress();
        if (this.marinateProgress >= 1) {
            this.unschedule(this.tickMarinate);
            this.finishMarinate();
        }
    }

    private finishMarinate(): void {
        this.isMarinating = false;
        this.marinateProgress = 1;
        this.marinatedReadyCount += this.marinadeMeatCount;
        this.marinadeMeatCount = 0;
        this.marinadeCondiments = { salt: false, soy: false, pepper: false, water: false, starch: false };
        this.updateMarinadeProgress();
        this.updateMarinadeStatus();
        this.showMessage('✅ 腌制完成，可用筷子下锅油炸');
    }

    private isMarinadeReady(): boolean {
        return this.marinadeCondiments.salt
            && this.marinadeCondiments.soy
            && this.marinadeCondiments.pepper
            && this.marinadeCondiments.water
            && this.marinadeCondiments.starch;
    }

    private updateMarinadeProgress(): void {
        if (!this.marinadeProgressFill) return;
        const progress = Math.max(0, Math.min(1, this.marinateProgress));
        const transform = this.marinadeProgressFill.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(180 * progress, transform.contentSize.height);
        }
    }

    // ==================== 调汁 ====================

    private tryDropIngredientToSauce(type: SauceType): boolean {
        if (!this.handItem || this.handItem.kind !== 'ingredient' || !this.handItem.ingredientType) {
            return false;
        }

        const ingredientType = this.handItem.ingredientType;
        const key = ingredientType === IngredientType.SUGAR
            ? 'sugar'
            : ingredientType === IngredientType.VINEGAR
                ? 'vinegar'
                : ingredientType === IngredientType.WATER
                    ? 'water'
                    : ingredientType === IngredientType.KETCHUP
                        ? 'ketchup'
                        : null;
        if (!key) {
            return false;
        }
        if (type === 'classic' && key === 'ketchup') {
            this.showMessage('🍅 番茄酱只用于番茄口味');
            return true;
        }
        if (this.addSauceCondiment(type, key, ingredientType)) {
            this.handItem = null;
            this.updateHandFollower();
        }
        return true;
    }

    private addSauceCondiment(type: SauceType, key: 'sugar' | 'vinegar' | 'water' | 'ketchup', ingredientType: IngredientType): boolean {
        const bowl = this.sauceBowls[type];
        if (bowl[key]) {
            this.showMessage('?? 料汁已加过该调料');
            return false;
        }
        if (!this.consumeIngredientFromInventory(ingredientType, 1)) {
            this.showMessage('?? 调料不足');
            return false;
        }
        bowl[key] = true;
        this.updateSauceStatus();
        return true;
    }

    private isSauceReady(type: SauceType): boolean {
        const bowl = this.sauceBowls[type];
        if (type === 'classic') {
            return bowl.sugar && bowl.vinegar && bowl.water;
        }
        return bowl.sugar && bowl.vinegar && bowl.water && bowl.ketchup;
    }

    private updateSauceStatus(): void {
        const classic = this.sauceBowls.classic;
        const ketchup = this.sauceBowls.ketchup;
        const classicCount = [classic.sugar, classic.vinegar, classic.water].filter(v => v).length;
        const ketchupCount = [ketchup.sugar, ketchup.vinegar, ketchup.water, ketchup.ketchup].filter(v => v).length;
        const classicReady = this.isSauceReady('classic');
        const ketchupReady = this.isSauceReady('ketchup');
        const classicSelected = this.selectedSauceType === 'classic';
        const ketchupSelected = this.selectedSauceType === 'ketchup';

        const classicText = `糖醋:${classicReady ? '✅' : `${classicCount}/3`}${classicSelected ? '⭐' : ''}`;
        const ketchupText = `番茄:${ketchupReady ? '✅' : `${ketchupCount}/4`}${ketchupSelected ? '⭐' : ''}`;
        this.setLabel(this.sauceStatusLabel, `${classicText}  ${ketchupText}`);
    }

    private consumeSelectedSauce(): void {
        if (!this.selectedSauceType) return;
        const bowl = this.sauceBowls[this.selectedSauceType];
        bowl.sugar = false;
        bowl.vinegar = false;
        bowl.water = false;
        bowl.ketchup = false;
        this.lastSauceType = this.selectedSauceType;
        this.selectedSauceType = null;
        this.updateSauceStatus();
    }

    // ==================== 油炸 ====================

    private handleFryAreaClick(): void {
        if (this.activeTool === 'chopsticks') {
            if (this.handItem?.kind === 'marinated') {
                if (this.fryingPieces.length >= this.FRY_LIMIT) {
                    this.showMessage('?? 油锅最多30片');
                    return;
                }
                this.handItem.count -= 1;
                if (this.handItem.count <= 0) {
                    this.handItem = null;
                }
                this.fryingPieces.push(0);
                this.updateHandFollower();
                this.updateFryStatus();
                return;
            }
            if (!this.handItem) {
                if (this.marinatedReadyCount > 0) {
                    this.showMessage('?? 先在腌制区夹肉再下锅');
                    return;
                }
                if (this.friedReadyCount <= 0) {
                    this.showMessage('?? 没有炸好的肉片');
                    return;
                }
                this.friedReadyCount -= 1;
                this.handItem = { kind: 'fried', count: 1 };
                this.updateFryStatus();
                this.updateHandFollower();
                return;
            }
            if (this.handItem.kind !== 'fried') {
                this.showMessage('?? 手上有其他食材');
            }
            return;
        }

        if (this.activeTool === 'skimmer') {
            if (this.friedReadyCount <= 0) {
                this.showMessage('?? 没有炸好的肉片');
                return;
            }
            if (this.handItem && this.handItem.kind !== 'fried') {
                this.showMessage('?? 手上有其他食材');
                return;
            }
            const pickCount = this.friedReadyCount;
            if (pickCount <= 0) {
                return;
            }
            if (this.handItem && this.handItem.kind === 'fried') {
                this.handItem.count += pickCount;
            } else {
                this.handItem = { kind: 'fried', count: pickCount };
            }
            this.friedReadyCount = 0;
            this.updateFryStatus();
            this.updateHandFollower();
            return;
        }

        this.showMessage('?? 需要筷子或漏网操作');
    }

    // ==================== 翻炒 ====================

    private addVeggie(key: 'radish' | 'ginger' | 'greenOnion', type: IngredientType): void {
        if (this.veggiesAdded[key]) return;
        if (!this.consumeIngredientFromInventory(type, 1)) {
            this.showMessage('⚠️ 备菜不足');
            return;
        }
        this.veggiesAdded[key] = true;
        this.updateStirFryStatus();
        this.updateIngredientButtonLabels();
    }

    private handleStirFryAreaClick(): void {
        if ((this.activeTool === 'skimmer' || this.activeTool === 'chopsticks') && this.handItem?.kind === 'fried') {
            this.stirFryMeatCount += this.handItem.count;
            this.handItem = null;
            this.updateHandFollower();
            this.updateStirFryStatus();
            return;
        }

        if (this.stirFryMeatCount <= 0) {
            this.showMessage('⚠️ 先用漏网捞肉入锅');
            return;
        }
        if (!this.stirFrySauceUsed) {
            if (!this.selectedSauceType || !this.isSauceReady(this.selectedSauceType)) {
                this.showMessage('?? 还没调好料汁');
                return;
            }
            this.consumeSelectedSauce();
            this.stirFrySauceUsed = true;
        }
        if (!this.veggiesAdded.radish || !this.veggiesAdded.ginger || !this.veggiesAdded.greenOnion) {
            this.showMessage('⚠️ 配料还没放齐');
            return;
        }
        this.stirFryClicks += 1;
        this.updateStirFryProgress();
        if (this.stirFryClicks >= this.STIR_FRY_TARGET) {
            this.finishStirFry();
        }
    }

    private finishStirFry(): void {
        this.cookedReadyCount += this.stirFryMeatCount;
        this.stirFryMeatCount = 0;
        this.stirFryClicks = 0;
        this.veggiesAdded = { radish: false, ginger: false, greenOnion: false };
        this.stirFrySauceUsed = false;
        this.lastCookQuality = 90;
        this.updateStirFryProgress();
        this.updateStirFryStatus();
        this.updateCookedStatus();
        this.showMessage('✅ 炒制完成，筷子夹入打包盒');
    }

    private updateStirFryProgress(): void {
        if (!this.stirFryProgressFill) return;
        const progress = Math.max(0, Math.min(1, this.stirFryClicks / this.STIR_FRY_TARGET));
        const transform = this.stirFryProgressFill.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(180 * progress, transform.contentSize.height);
        }
        this.updateStirFryStatus();
    }

    // ==================== 打包 ====================

    private handleCookedTrayClick(): void {
        if (this.activeTool !== 'chopsticks') {
            this.showMessage('⚠️ 需要筷子夹取');
            return;
        }
        if (this.cookedReadyCount <= 0) {
            this.showMessage('⚠️ 没有炒好的锅包肉');
            return;
        }
        if (this.handItem && this.handItem.kind !== 'cooked') {
            this.showMessage('⚠️ 手上有其他食材');
            return;
        }
        if (!this.handItem) {
            this.handItem = { kind: 'cooked', count: 0 };
        }
        if (this.handItem.count >= 2) {
            this.showMessage('⚠️ 一次最多夹两片');
            return;
        }
        this.handItem.count += 1;
        this.cookedReadyCount -= 1;
        this.updateCookedStatus();
        this.updateHandFollower();
    }

    private handlePackagingClick(): void {
        if (!this.handItem || this.handItem.kind !== 'cooked') {
            this.showMessage('⚠️ 先夹好肉片');
            return;
        }
        const capacity = this.packSize === 'small' ? this.PACK_TARGET_SMALL : this.PACK_TARGET_LARGE;
        let remaining = this.handItem.count;
        while (remaining > 0 && this.packCount < capacity) {
            this.packCount += 1;
            remaining -= 1;
        }
        this.handItem.count = remaining;
        if (this.handItem.count <= 0) {
            this.handItem = null;
        }
        this.updateHandFollower();
        this.updatePackagingStatus();

        if (this.packCount >= capacity) {
            this.finalizePackage();
        }
    }

    private finalizePackage(): void {
        const sauceLabel = this.lastSauceType === 'ketchup' ? '番茄' : '糖醋';
        const label = this.packSize === 'small'
            ? `锅包肉·${sauceLabel}·小份`
            : `锅包肉·${sauceLabel}·大份`;
        const cookingController = this.getCookingController();
        if (!cookingController) {
            this.showMessage('⚠️ 打包盒系统未就绪');
            return;
        }
        const success = cookingController.packExternalFood(label, this.lastCookQuality);
        if (!success) {
            this.showMessage('⚠️ 打包盒已满');
            return;
        }
        this.packCount = 0;
        this.updatePackagingStatus();
        this.showMessage(`📦 ${label}已装盒`);
    }

    private setPackSize(size: 'small' | 'large'): void {
        if (this.packCount > 0) {
            this.showMessage('⚠️ 当前打包中，无法切换规格');
            return;
        }
        this.packSize = size;
        this.updatePackagingStatus();
    }

    // ==================== 工具/跟随 ====================

    private toggleTool(tool: ToolType): void {
        if (this.activeTool === tool) {
            this.activeTool = null;
        } else {
            this.activeTool = tool;
        }
        this.updateToolButtons();
        this.updateHandFollower();
    }

    private onMouseDown(event: EventMouse): void {
        if (event.getButton() === EventMouse.BUTTON_RIGHT) {
            this.returnHandItem();
            return;
        }
        if (event.getButton() !== EventMouse.BUTTON_LEFT) return;
        if (!this._manualAreaClickEnabled) return;

        const uiPos = event.getUILocation();
        this.tryHandleAreaClick(uiPos.x, uiPos.y);
    }

    private returnHandItem(): void {
        if (this.handItem) {
            if (this.handItem.kind === 'fried') {
                this.friedReadyCount += this.handItem.count;
                this.updateFryStatus();
            } else if (this.handItem.kind === 'marinated') {
                this.marinatedReadyCount += this.handItem.count;
                this.updateMarinadeStatus();
            } else if (this.handItem.kind === 'cooked') {
                this.cookedReadyCount += this.handItem.count;
                this.updateCookedStatus();
            }
            this.handItem = null;
        }
        this.activeTool = null;
        this.updateToolButtons();
        this.updateHandFollower();
    }

    private setupMouseFollower(): void {
        if (!this.mouseFollower) return;
        this.mouseFollower.active = false;

        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        this.setupNativeMouseListener();
    }

    private onMouseMove(event: EventMouse): void {
        const uiPos = event.getUILocation();
        this.updateFollowerFromUILocation(uiPos.x, uiPos.y);
    }

    private updateFollowerFromUILocation(uiX: number, uiY: number): void {
        if (!this.mouseFollower) return;
        const followParent = this.mouseFollower.parent;
        if (!followParent) return;
        const canvasTransform = followParent.getComponent(UITransform);
        if (!canvasTransform) return;

        const designSize = view.getDesignResolutionSize();
        const canvasSize = canvasTransform.contentSize;
        const scaleX = canvasSize.width / designSize.width;
        const scaleY = canvasSize.height / designSize.height;
        const localPos = new Vec3(
            uiX * scaleX - canvasSize.width / 2,
            uiY * scaleY - canvasSize.height / 2,
            0
        );
        const worldPos = canvasTransform.convertToWorldSpaceAR(localPos);
        this.applyFollowerWorldPosition(worldPos);
    }

    private applyFollowerWorldPosition(worldPos: Vec3): void {
        if (!this.mouseFollower) return;
        this.mouseFollower.setWorldPosition(worldPos);
    }

    private setupNativeMouseListener(): void {
        let canvas = game.canvas;
        if (!canvas) {
            canvas = document.querySelector('canvas') as HTMLCanvasElement;
        }
        if (!canvas) return;

        this.removeMouseListeners();

        this._nativeMouseMoveHandler = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right ||
                event.clientY < rect.top || event.clientY > rect.bottom) {
                return;
            }

            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const nativeX = (event.clientX - rect.left) * scaleX;
            const nativeY = (event.clientY - rect.top) * scaleY;

            const designSize = view.getDesignResolutionSize();
            const uiX = nativeX * designSize.width / canvas.width;
            const uiY = designSize.height - (nativeY * designSize.height / canvas.height);

            this.updateFollowerFromUILocation(uiX, uiY);
        };

        window.addEventListener('mousemove', this._nativeMouseMoveHandler);
    }

    private removeMouseListeners(): void {
        if (this._nativeMouseMoveHandler) {
            window.removeEventListener('mousemove', this._nativeMouseMoveHandler);
            this._nativeMouseMoveHandler = null;
        }
    }

    // ==================== 状态显示 ====================

    private updateAllDisplays(): void {
        this.updateIngredientButtonLabels();
        this.updateToolButtons();
        this.updateMarinadeStatus();
        this.updateFryStatus();
        this.updateSauceStatus();
        this.updateStirFryStatus();
        this.updateCookedStatus();
        this.updatePackagingStatus();
        this.updateHandFollower();
    }

    private updateIngredientButtonLabels(): void {
        if (EDITOR && !PREVIEW) return;
        this.setButtonLabel(this.meatBtn, `🥩 里脊肉 x${this.getAvailableCount(IngredientType.PORK)}`);
        this.setButtonLabel(this.radishBtn, `🥕 萝卜 x${this.getAvailableCount(IngredientType.RADISH)}`);
        this.setButtonLabel(this.gingerBtn, `🫚 姜 x${this.getAvailableCount(IngredientType.GINGER)}`);
        this.setButtonLabel(this.greenOnionBtn, `🧅 大葱 x${this.getAvailableCount(IngredientType.GREEN_ONION)}`);
        this.setButtonLabel(this.starchBtn, `🥔 淀粉 x${this.getAvailableCount(IngredientType.POTATO_STARCH)}`);

        this.setButtonLabel(this.marinadeSaltBtn, '🧂 盐');
        this.setButtonLabel(this.marinadeSoyBtn, '🥣 酱油');
        this.setButtonLabel(this.marinadePepperBtn, '🌶️ 花椒面');
        this.setButtonLabel(this.marinadeWaterBtn, '💧 水');

        this.setButtonLabel(this.sauceSugarBtn, '?? 糖');
        this.setButtonLabel(this.sauceVinegarBtn, '?? 醋');
        this.setButtonLabel(this.sauceWaterBtn, '?? 水');
        this.setButtonLabel(this.sauceKetchupBtn, '?? 番茄酱');
    }

    private updateToolButtons(): void {
        if (EDITOR && !PREVIEW) return;
        this.setButtonLabel(this.chopsticksBtn, this.activeTool === 'chopsticks' ? '🥢 筷子✅' : '🥢 筷子');
        this.setButtonLabel(this.skimmerBtn, this.activeTool === 'skimmer' ? '🥄 漏网✅' : '🥄 漏网');
    }

    private updateMarinadeStatus(): void {
        const condiments = Object.values(this.marinadeCondiments).filter(v => v).length;
        const status = this.isMarinating
            ? `🥣 腌制中...`
            : `🥣 肉片:${this.marinadeMeatCount} 调料:${condiments}/5`;
        this.setLabel(this.marinadeStatusLabel, status);
        this.setLabel(this.marinatedCountLabel, `腌好:${this.marinatedReadyCount}`);
    }

    private updateFryStatus(): void {
        this.setLabel(this.fryStatusLabel, `?? 油炸中:${this.fryingPieces.length}/${this.FRY_LIMIT}`);
        this.setLabel(this.friedCountLabel, `炸好:${this.friedReadyCount}`);
        this.updateFryProgress();
    }

    private updateFryProgress(): void {
        if (!this.fryProgressFill) return;
        const total = this.fryingPieces.length;
        const progress = total > 0
            ? this.fryingPieces.reduce((sum, value) => sum + value, 0) / total
            : 0;
        const transform = this.fryProgressFill.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(180 * Math.max(0, Math.min(1, progress)), transform.contentSize.height);
        }
    }

    private updateStirFryStatus(): void {
        const vegCount = Object.values(this.veggiesAdded).filter(v => v).length;
        const status = `🔥 锅内:${this.stirFryMeatCount} 配料:${vegCount}/3`;
        this.setLabel(this.stirFryStatusLabel, status);
    }

    private updateCookedStatus(): void {
        this.setLabel(this.cookedCountLabel, `已炒:${this.cookedReadyCount}`);
    }

    private updatePackagingStatus(): void {
        const target = this.packSize === 'small' ? this.PACK_TARGET_SMALL : this.PACK_TARGET_LARGE;
        this.setLabel(this.packagingCountLabel, `装盒:${this.packCount}/${target}`);
        const sizeLabel = this.packSize === 'small' ? '小份(8)' : '大份(12)';
        this.setLabel(this.packagingSizeLabel, `规格:${sizeLabel}`);
        this.setButtonLabel(this.smallPackBtn, this.packSize === 'small' ? '小份✅' : '小份');
        this.setButtonLabel(this.largePackBtn, this.packSize === 'large' ? '大份✅' : '大份');
    }

    private updateHandFollower(): void {
        if (!this.mouseFollower) return;
        const label = this.mouseFollower.getComponent(Label) || this.mouseFollower.addComponent(Label);
        label.fontSize = 40;
        label.lineHeight = 45;

        let showFollower = false;
        if (this.handItem) {
            if (this.handItem.kind === 'ingredient') {
                const type = this.handItem.ingredientType;
                const emoji = type === IngredientType.PORK
                    ? '🥩'
                    : type === IngredientType.POTATO_STARCH
                        ? '🥣'
                        : type === IngredientType.SOY_SAUCE
                            ? '🧴'
                            : type === IngredientType.PEPPER_POWDER
                                ? '🌶️'
                                : type === IngredientType.SALT
                                    ? '🧂'
                                    : type === IngredientType.WATER
                                        ? '💧'
                                        : type === IngredientType.SUGAR
                                            ? '🍬'
                                            : type === IngredientType.VINEGAR
                                                ? '🍶'
                                                : type === IngredientType.KETCHUP
                                                    ? '🍅'
                                                    : '🧂';
                label.string = this.handItem.count > 1 ? `${emoji}${this.handItem.count}` : emoji;
            } else if (this.handItem.kind === 'fried') {
                label.string = this.handItem.count > 1 ? `🍗${this.handItem.count}` : '🍗';
            } else if (this.handItem.kind === 'cooked') {
                label.string = this.handItem.count > 1 ? `🍖${this.handItem.count}` : '🍖';
            } else if (this.handItem.kind === 'marinated') {
                label.string = this.handItem.count > 1 ? `🥩${this.handItem.count}` : '🥩';
            }
            showFollower = true;
        } else if (this.activeTool) {
            label.string = this.activeTool === 'chopsticks' ? '🥢' : '🧺';
            showFollower = true;
        }

        this.mouseFollower.active = showFollower;
        this.updateUiHitTestState();
    }

    private updateUiHitTestState(): void {
        const shouldDisable = !!this.handItem || !!this.activeTool;
        if (shouldDisable) {
            this.disableUiHitTest();
            this.disableAreaHitTest();
            this._manualAreaClickEnabled = true;
        } else {
            this.enableUiHitTest();
            this._manualAreaClickEnabled = false;
        }
    }

    private disableUiHitTest(): void {
        if (this._uiHitTestDisabled) return;
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;

        this._uiHitTestDisabled = true;
        for (const child of canvas.children) {
            if (child.name === 'GuoBaoRouRoot' || child.name === 'FollowOverlay' || child.name === 'MouseFollower') {
                continue;
            }
            this.disableNodeAndChildrenHitTest(child);
        }
    }

    private disableAreaHitTest(): void {
        if (!this._areaNodes.length) return;
        for (const node of this._areaNodes) {
            this.disableNodeAndChildrenHitTest(node);
        }
    }

    private enableUiHitTest(): void {
        if (!this._uiHitTestDisabled) return;
        for (const [node, originalHitTest] of this._blockedHitTests) {
            if (node && node.isValid) {
                const transform = node.getComponent(UITransform);
                if (transform) {
                    transform.hitTest = originalHitTest as any;
                }
            }
        }
        this._blockedHitTests.clear();
        this._uiHitTestDisabled = false;
    }

    private disableNodeAndChildrenHitTest(node: Node): void {
        const transform = node.getComponent(UITransform);
        if (transform && !this._blockedHitTests.has(node)) {
            this._blockedHitTests.set(node, transform.hitTest.bind(transform));
            transform.hitTest = () => false;
        }
        for (const child of node.children) {
            this.disableNodeAndChildrenHitTest(child);
        }
    }

    private tryHandleAreaClick(uiX: number, uiY: number): void {
        const worldPos = this.uiLocationToWorld(uiX, uiY);
        if (!worldPos) return;

        if (this.isWorldPointInside(this.marinadeArea, worldPos)) {
            this.handleMarinadeAreaClick();
            return;
        }
        if (this.isWorldPointInside(this.fryArea, worldPos)) {
            this.handleFryAreaClick();
            return;
        }
        if (this.isWorldPointInside(this.sauceArea, worldPos)) {
            this.handleSauceBowlClick('classic');
            return;
        }
        if (this.isWorldPointInside(this.ketchupBowlArea, worldPos)) {
            this.handleSauceBowlClick('ketchup');
            return;
        }
        if (this.isWorldPointInside(this.stirFryArea, worldPos)) {
            this.handleStirFryAreaClick();
            return;
        }
        if (this.isWorldPointInside(this.cookedTrayArea, worldPos)) {
            this.handleCookedTrayClick();
            return;
        }
        if (this.isWorldPointInside(this.packagingArea, worldPos)) {
            this.handlePackagingClick();
        }
    }

    private uiLocationToWorld(uiX: number, uiY: number): Vec3 | null {
        const canvas = this.root?.parent || this.node.scene?.getChildByName('Canvas');
        if (!canvas) return null;
        const canvasTransform = canvas.getComponent(UITransform);
        if (!canvasTransform) return null;

        const designSize = view.getDesignResolutionSize();
        const canvasSize = canvasTransform.contentSize;
        const scaleX = canvasSize.width / designSize.width;
        const scaleY = canvasSize.height / designSize.height;
        const localPos = new Vec3(
            uiX * scaleX - canvasSize.width / 2,
            uiY * scaleY - canvasSize.height / 2,
            0
        );
        return canvasTransform.convertToWorldSpaceAR(localPos);
    }

    private isWorldPointInside(node: Node | null, worldPos: Vec3): boolean {
        if (!node) return false;
        const transform = node.getComponent(UITransform);
        if (!transform) return false;
        const rect = transform.getBoundingBoxToWorld();
        return worldPos.x >= rect.x &&
            worldPos.x <= rect.x + rect.width &&
            worldPos.y >= rect.y &&
            worldPos.y <= rect.y + rect.height;
    }

    // ==================== 辅助 ====================

    private getAvailableCount(type: IngredientType): number {
        const inventory = InventoryManager.instance;
        if (!inventory) return 0;
        return inventory.getAvailableCount(type);
    }

    private seedPreviewInventory(): void {
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        if (PREVIEW || EDITOR || DEV) {
            if (inventory.currentLevel?.levelId !== 3) {
                inventory.initLevel(3);
            }
        }
        inventory.debugSeedGuoBaoRouInventoryIfEmpty();
    }

    private getCookingController(): CookingControllerV2 | null {
        const canvas = this.node.scene?.getChildByName('Canvas');
        if (!canvas) return null;
        return canvas.getComponent(CookingControllerV2);
    }

    private setButtonLabel(btn: Node, text: string): void {
        if (!btn) return;
        const labelNode = btn.getChildByName('BtnLabel') || btn.getChildByName('Label');
        const label = labelNode ? labelNode.getComponent(Label) : btn.getComponent(Label);
        if (label) {
            label.string = text;
        }
    }

    private setLabel(label: Label | null, text: string): void {
        if (!label) return;
        label.string = text;
    }

    private showMessage(message: string): void {
        if (this.instructionLabel) {
            this.instructionLabel.string = message;
        } else {
            console.log(`[GuoBaoRouController] ${message}`);
        }
    }
}






















