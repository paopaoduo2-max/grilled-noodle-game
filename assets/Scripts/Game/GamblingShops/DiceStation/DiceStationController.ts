import {
    _decorator,
    BlockInputEvents,
    Button,
    Color,
    Component,
    Graphics,
    Label,
    Node,
    UITransform,
    Vec3,
    director,
    sys,
    tween
} from 'cc';
import { InventoryManager } from '../../../Manager/InventoryManager';
import { DICE_SHOP_ITEMS, DICE_SUM_ODDS, DICE_SUM_RANGE_OPTIONS } from './DiceConfig';

const { ccclass, property } = _decorator;

type DicePhase = 'betting' | 'revealed';

type BetType = 'small' | 'big' | 'sum' | 'pair' | 'any-triple';

interface BetData {
    type: BetType;
    label: string;
    odds: number;
    amount: number;
    value?: number;
}

type InfoType =
    | 'sumRange'
    | 'sumLock'
    | 'pairPresence'
    | 'pairValue'
    | 'triplePresence'
    | 'revealDie';

interface InfoCard {
    id: string;
    type: InfoType;
    title: string;
    description: string;
    reliability: number;
    price: number;
    payload: any;
    special?: boolean;
    purchased?: boolean;
}

interface DiceAnalysis {
    sum: number;
    counts: number[];
    isTriple: boolean;
    tripleValue: number | null;
    pairValues: number[];
    hasPair: boolean;
}

@ccclass('DiceStationController')
export class DiceStationController extends Component {
    @property(Node)
    shopButton: Node | null = null;

    @property(Node)
    panelRoot: Node | null = null;

    @property(Node)
    modalBg: Node | null = null;

    @property(Node)
    closeButton: Node | null = null;

    @property(Node)
    walletLabel: Node | null = null;

    @property(Node)
    resultLabel: Node | null = null;

    private readonly SAVE_KEY = 'dice_station_level5_state';
    private readonly CASHOUT_FEE_RATE = 0.12;

    private isOpen = false;
    private phase: DicePhase = 'betting';
    private dice: number[] = [1, 1, 1];
    private bets: Map<string, BetData> = new Map();
    private infoCards: InfoCard[] = [];
    private purchasedCards: InfoCard[] = [];
    private purchaseCount = 0;
    private inventory: string[] = [];
    private discountTokens = 0;
    private forceRevealDie = 0;
    private balance = 500;
    private round = 0;
    private currentBetAmount = 10;
    private cashoutAmount = 100;
    private buyinAmount = 100;

    private statusLabels: {
        balance?: Label;
        cash?: Label;
        totalBet?: Label;
        round?: Label;
    } = {};
    private messageLabel: Label | null = null;
    private betAmountLabel: Label | null = null;
    private betListLabel: Label | null = null;
    private cashoutHintLabel: Label | null = null;
    private cashoutAmountLabel: Label | null = null;
    private buyinAmountLabel: Label | null = null;
    private infoHintLabel: Label | null = null;
    private inventoryLabel: Label | null = null;
    private feeLabel: Label | null = null;
    private buyinHintLabel: Label | null = null;
    private infoListNode: Node | null = null;
    private infoContentNode: Node | null = null;
    private ownedContentNode: Node | null = null;
    private shopListNode: Node | null = null;
    private shopContentNode: Node | null = null;
    private betAreaNode: Node | null = null;
    private cashoutAreaNode: Node | null = null;
    private diceLabels: Label[] = [];
    private controls: {
        reveal?: Button;
        next?: Button;
        clear?: Button;
    } = {};
    private betAmountButtons: Array<{ amount: number; node: Node; label: Label; button: Button }> = [];
    private cashoutButtons: Array<{ amount: number; node: Node; label: Label; button: Button }> = [];
    private buyinButtons: Array<{ amount: number; node: Node; label: Label; button: Button }> = [];

    private rollCallback: (() => void) | null = null;
    private clearMessageCallback = () => {
        if (this.messageLabel) {
            this.messageLabel.string = '';
        }
    };

    start() {
        this.cacheNodes();
        this.buildStaticUI();
        this.bindControlButtons();
        this.loadPersistentState();
        if (this.round === 0) {
            this.startRound();
        }
        this.updateUI();
        this.setPanelVisible(false);

        if (this.shopButton) {
            this.shopButton.on(Node.EventType.TOUCH_END, this.openPanel, this);
        }
        if (this.closeButton) {
            this.closeButton.on(Node.EventType.TOUCH_END, this.closePanel, this);
        }

        director.on('LOTTERY_MONEY_CHANGED', this.updateWalletDisplay, this);
        this.updateWalletDisplay();
    }

    onDestroy() {
        director.off('LOTTERY_MONEY_CHANGED', this.updateWalletDisplay, this);
        if (this.rollCallback) {
            this.unschedule(this.rollCallback);
            this.rollCallback = null;
        }
        this.unschedule(this.clearMessageCallback);
    }

    private cacheNodes() {
        if (!this.panelRoot) {
            this.panelRoot = this.node.getChildByName('PanelRoot');
        }
        if (!this.modalBg) {
            this.modalBg = this.node.getChildByName('ModalBg');
        }
        if (!this.betAreaNode && this.panelRoot) {
            this.betAreaNode = this.panelRoot.getChildByName('BetArea');
        }
        if (!this.infoListNode && this.panelRoot) {
            this.infoListNode = this.panelRoot.getChildByName('InfoList');
        }
        if (!this.shopListNode && this.panelRoot) {
            this.shopListNode = this.panelRoot.getChildByName('ShopList');
        }
        if (!this.cashoutAreaNode && this.panelRoot) {
            this.cashoutAreaNode = this.panelRoot.getChildByName('CashoutArea');
        }

        if (this.panelRoot) {
            const diceRow = this.panelRoot.getChildByPath('DiceArea/DiceRow');
            if (diceRow) {
                this.diceLabels = [];
                ['Dice1', 'Dice2', 'Dice3'].forEach((name) => {
                    const node = diceRow.getChildByName(name);
                    const label = node?.getComponent(Label);
                    if (label) {
                        this.diceLabels.push(label);
                    }
                });
            }

            const revealNode = this.panelRoot.getChildByPath('Controls/RevealButton');
            const nextNode = this.panelRoot.getChildByPath('Controls/NextRoundButton');
            const clearNode = this.panelRoot.getChildByPath('Controls/ClearBetsButton');
            this.controls.reveal = revealNode?.getComponent(Button) ?? undefined;
            this.controls.next = nextNode?.getComponent(Button) ?? undefined;
            this.controls.clear = clearNode?.getComponent(Button) ?? undefined;
        }
    }

    private buildStaticUI() {
        this.layoutNodes();
        this.drawModalBg();
        this.drawPanelBg();
        this.drawButtonBg(this.shopButton, new Color(122, 30, 47, 255));
        this.drawButtonBg(this.closeButton, new Color(50, 40, 32, 255));
        this.drawButtonBg(this.controls.reveal?.node, new Color(122, 30, 47, 255));
        this.drawButtonBg(this.controls.next?.node, new Color(40, 34, 26, 255));
        this.drawButtonBg(this.controls.clear?.node, new Color(0, 0, 0, 0), new Color(80, 60, 50, 255));

        this.buildStatusRow();
        this.buildMessageLabel();
        this.buildBetArea();
        this.buildInfoList();
        this.buildShopList();
        this.buildCashoutArea();

        this.layoutNodes();
        this.drawModalBg();
        this.drawPanelBg();
        this.drawButtonBg(this.shopButton, new Color(122, 30, 47, 255));
        this.drawButtonBg(this.closeButton, new Color(50, 40, 32, 255));
        this.drawButtonBg(this.controls.reveal?.node, new Color(122, 30, 47, 255));
        this.drawButtonBg(this.controls.next?.node, new Color(40, 34, 26, 255));
        this.drawButtonBg(this.controls.clear?.node, new Color(0, 0, 0, 0), new Color(80, 60, 50, 255));
        this.buildStatusRow();
    }

    private bindControlButtons() {
        this.controls.reveal?.node.on(Node.EventType.TOUCH_END, this.onReveal, this);
        this.controls.next?.node.on(Node.EventType.TOUCH_END, this.onNextRound, this);
        this.controls.clear?.node.on(Node.EventType.TOUCH_END, this.onClearBets, this);
    }

    private openPanel() {
        this.isOpen = true;
        this.setPanelVisible(true);
        this.updateWalletDisplay();
        this.updateUI();
    }

    private closePanel() {
        this.isOpen = false;
        this.setPanelVisible(false);
        this.savePersistentState();
    }

    private setPanelVisible(visible: boolean) {
        if (this.panelRoot) {
            this.panelRoot.active = visible;
        }
        if (this.modalBg) {
            this.modalBg.active = visible;
        }
        const blocker = this.node.getComponent(BlockInputEvents);
        if (blocker) {
            blocker.enabled = visible;
        }
    }

    private updateWalletDisplay() {
        const label = this.walletLabel?.getComponent(Label);
        if (!label) return;
        const wallet = InventoryManager.instance?.globalWallet ?? 0;
        label.string = `钱包 ${wallet}`;
    }

    private getWalletAmount(): number {
        return InventoryManager.instance?.globalWallet ?? 0;
    }

    private setWalletAmount(amount: number) {
        if (InventoryManager.instance) {
            InventoryManager.instance.setWallet(amount);
        }
        director.emit('LOTTERY_MONEY_CHANGED');
    }

    private addWalletAmount(amount: number) {
        if (InventoryManager.instance) {
            InventoryManager.instance.addMoney(amount);
        }
        director.emit('LOTTERY_MONEY_CHANGED');
    }

    private startRound() {
        this.dice = [this.randInt(1, 6), this.randInt(1, 6), this.randInt(1, 6)];
        this.phase = 'betting';
        this.bets.clear();
        this.purchasedCards = [];
        this.purchaseCount = 0;
        this.round += 1;
        const analysis = this.analyzeDice(this.dice);
        this.infoCards = this.generateInfoCards(analysis);
        this.setResultText('点击“开锅结算”揭示结果。');
        this.updateUI();
    }

    private onNextRound() {
        if (this.phase !== 'revealed') return;
        this.startRound();
    }

    private onClearBets() {
        if (this.phase !== 'betting') return;
        this.clearBets();
    }

    private onReveal() {
        if (this.phase !== 'betting') return;
        this.revealRound();
    }

    private placeBet(type: BetType, label: string, odds: number, value?: number) {
        if (this.phase !== 'betting') {
            this.showMessage('已结算，点击“下一局”继续。');
            return;
        }
        const amount = Math.floor(this.currentBetAmount);
        if (!amount || amount <= 0) {
            this.showMessage('请输入有效下注金额。');
            return;
        }
        if (this.balance < amount) {
            this.showMessage('筹码不足。');
            return;
        }
        this.balance -= amount;
        const key = `${type}-${value ?? ''}`;
        const existing = this.bets.get(key);
        if (!existing) {
            this.bets.set(key, { type, label, odds, amount: 0, value });
        }
        const bet = this.bets.get(key);
        if (bet) {
            bet.amount += amount;
        }
        this.updateUI();
    }

    private clearBets() {
        if (this.phase !== 'betting') return;
        this.bets.forEach((bet) => {
            this.balance += bet.amount;
        });
        this.bets.clear();
        this.updateUI();
    }

    private revealRound() {
        if (this.phase !== 'betting') return;
        this.phase = 'revealed';
        const analysis = this.analyzeDice(this.dice);
        let totalWin = 0;
        this.bets.forEach((bet) => {
            if (this.isBetWin(bet, analysis)) {
                const payout = bet.amount * bet.odds;
                totalWin += payout;
                this.balance += payout;
            }
        });
        const nearMiss = totalWin === 0 ? this.getNearMissHint(analysis) : '';
        this.setResultText(
            `结果：${this.dice.join('、')} | 总和 ${analysis.sum} | 对子 ${analysis.hasPair ? '有' : '无'} | 豹子 ${
                analysis.isTriple ? '有' : '无'
            } | 赢取 ${Math.floor(totalWin)} 筹码${nearMiss ? ` | ${nearMiss}` : ''}`
        );
        this.playDicePulse();
        this.updateUI();
        this.savePersistentState();
    }

    private isBetWin(bet: BetData, analysis: DiceAnalysis): boolean {
        if (bet.type === 'small') {
            return analysis.sum >= 4 && analysis.sum <= 10 && !analysis.isTriple;
        }
        if (bet.type === 'big') {
            return analysis.sum >= 11 && analysis.sum <= 17 && !analysis.isTriple;
        }
        if (bet.type === 'sum') {
            return analysis.sum === bet.value;
        }
        if (bet.type === 'pair') {
            if (analysis.isTriple) {
                return analysis.tripleValue === bet.value;
            }
            return analysis.hasPair && analysis.pairValues.includes(bet.value ?? 0);
        }
        if (bet.type === 'any-triple') {
            return analysis.isTriple;
        }
        return false;
    }

    private buyInfo(cardId: string) {
        if (this.phase !== 'betting') {
            this.showMessage('本局已结算，无法购买情报。');
            return;
        }
        if (this.purchaseCount >= 2) {
            this.showMessage('本局已买满 2 条情报。');
            return;
        }
        const card = this.infoCards.find((item) => item.id === cardId);
        if (!card || card.purchased) return;
        const price = this.getInfoPrice(card);
        if (this.balance < price) {
            this.showMessage('筹码不足。');
            return;
        }
        this.balance -= price;
        this.purchaseCount += 1;
        card.purchased = true;
        this.purchasedCards.push(card);
        if (this.discountTokens > 0) {
            this.discountTokens -= 1;
        }
        this.updateUI();
        this.savePersistentState();
    }

    private redeemItem(name: string, price: number) {
        if (this.balance < price) {
            this.showMessage('筹码不足，无法兑换。');
            return;
        }
        this.balance -= price;
        this.inventory.push(name);
        if (name === '情报折扣券') {
            this.discountTokens += 1;
        }
        if (name === '透骰优先券') {
            this.forceRevealDie += 1;
        }
        this.updateUI();
        this.savePersistentState();
    }

    private cashout() {
        const amount = Math.floor(this.cashoutAmount);
        if (!amount || amount <= 0) {
            this.showMessage('请输入有效兑换金额。');
            return;
        }
        if (this.balance < amount) {
            this.showMessage('筹码不足，无法兑换。');
            return;
        }
        const net = Math.floor(amount * (1 - this.CASHOUT_FEE_RATE));
        this.balance -= amount;
        this.addWalletAmount(net);
        this.showMessage(`兑换成功 +${net} 现金`);
        this.updateUI();
        this.savePersistentState();
    }

    private setCashoutAmount(amount: number) {
        const next = Math.max(10, Math.floor(amount));
        this.cashoutAmount = next;
        this.updateCashoutHint();
        this.updateCashoutButtons();
    }

    private buyin() {
        const amount = Math.floor(this.buyinAmount);
        if (!amount || amount <= 0) {
            this.showMessage('请输入有效兑换金额。');
            return;
        }
        const wallet = this.getWalletAmount();
        if (wallet < amount) {
            this.showMessage('现金不足，无法兑换。');
            return;
        }
        this.setWalletAmount(wallet - amount);
        this.balance += amount;
        this.showMessage(`兑换成功 +${amount} 筹码`);
        this.updateUI();
        this.savePersistentState();
    }

    private setBuyinAmount(amount: number) {
        const next = Math.max(10, Math.floor(amount));
        this.buyinAmount = next;
        this.updateCashoutHint();
        this.updateBuyinButtons();
    }

    private updateUI() {
        this.updateStatusRow();
        this.updateDiceUI();
        this.updateBetsUI();
        this.updateInfoUI();
        this.updateShopUI();
        this.updateCashoutHint();
        this.updateControls();
        this.updateBetAmountButtons();
        this.updateCashoutButtons();
        this.updateBuyinButtons();
    }

    private updateStatusRow() {
        const totalBet = Array.from(this.bets.values()).reduce((sum, bet) => sum + bet.amount, 0);
        if (this.statusLabels.balance) {
            this.statusLabels.balance.string = `筹码 ${Math.floor(this.balance)}`;
        }
        if (this.statusLabels.cash) {
            this.statusLabels.cash.string = `现金 ${Math.floor(this.getWalletAmount())}`;
        }
        if (this.statusLabels.totalBet) {
            this.statusLabels.totalBet.string = `下注 ${Math.floor(totalBet)}`;
        }
        if (this.statusLabels.round) {
            this.statusLabels.round.string = `局数 ${this.round}`;
        }
    }

    private updateDiceUI() {
        const hidden = this.phase === 'betting';
        this.diceLabels.forEach((label, index) => {
            label.string = hidden ? '?' : `${this.dice[index]}`;
            label.fontSize = 30;
            label.lineHeight = 40;
            label.color = hidden ? new Color(245, 230, 200, 255) : new Color(122, 30, 47, 255);
        });
    }

    private updateBetsUI() {
        if (!this.betListLabel) return;
        const bets = Array.from(this.bets.values());
        if (bets.length === 0) {
            this.betListLabel.string = '暂无下注';
            return;
        }
        this.betListLabel.string = bets
            .map((bet) => `${bet.label}：${bet.amount}（赔率 ${bet.odds}x）`)
            .join('\n');
    }

    private updateInfoUI() {
        if (!this.infoContentNode) return;
        this.infoContentNode.removeAllChildren();
        this.ownedContentNode?.removeAllChildren();

        const width = this.infoContentNode.getComponent(UITransform)?.contentSize.width ?? 320;
        const cardHeight = 60;
        const gap = 6;
        let startY = (this.infoContentNode.getComponent(UITransform)?.contentSize.height ?? 200) / 2 - cardHeight / 2;

        this.infoCards.forEach((card, index) => {
            const cardNode = new Node(`InfoCard_${index}`);
            this.infoContentNode?.addChild(cardNode);
            this.ensureUITransform(cardNode, width, cardHeight);
            cardNode.setPosition(0, startY - index * (cardHeight + gap), 0);
            const gfx = cardNode.addComponent(Graphics);
            this.drawRoundedRectGfx(gfx, width, cardHeight, 10, new Color(255, 244, 223, 255), new Color(203, 183, 163, 255), 1);

            const title = this.createLabelNode(cardNode, 'Title', card.title, 14, new Color(70, 50, 35, 255), width - 110, 18);
            title.node.setPosition(-width / 2 + (width - 110) / 2 + 8, 18, 0);

            const desc = this.createLabelNode(cardNode, 'Desc', card.description, 12, new Color(85, 65, 50, 255), width - 110, 16);
            desc.node.setPosition(-width / 2 + (width - 110) / 2 + 8, -2, 0);

            const rel = this.createLabelNode(
                cardNode,
                'Reliability',
                `可信度 ${(card.reliability * 100).toFixed(0)}%${card.special ? ' 特供' : ''}`,
                11,
                new Color(120, 90, 70, 255),
                width - 110,
                14
            );
            rel.node.setPosition(-width / 2 + (width - 110) / 2 + 8, -20, 0);

            const price = this.getInfoPrice(card);
            const btnText = card.purchased ? '已购买' : `购买 ${price}`;
            const btn = this.createButtonNode(cardNode, 'BuyBtn', btnText, 90, 28);
            btn.node.setPosition(width / 2 - 50, -2, 0);
            const disabled = card.purchased || this.purchaseCount >= 2 || this.phase !== 'betting';
            btn.button.interactable = !disabled;
            this.drawButtonBg(
                btn.node,
                disabled ? new Color(120, 110, 100, 200) : new Color(122, 30, 47, 255),
                disabled ? new Color(80, 70, 60, 200) : new Color(30, 20, 15, 255)
            );
            btn.label.color = new Color(250, 236, 210, 255);
            if (!disabled) {
                btn.node.off(Node.EventType.TOUCH_END);
                btn.node.on(Node.EventType.TOUCH_END, () => this.buyInfo(card.id), this);
            }
        });

        if (!this.ownedContentNode) return;
        const ownedWidth = this.ownedContentNode.getComponent(UITransform)?.contentSize.width ?? 320;
        if (this.purchasedCards.length === 0) {
            const emptyLabel = this.createLabelNode(
                this.ownedContentNode,
                'Empty',
                '暂无情报',
                12,
                new Color(120, 100, 85, 255),
                ownedWidth,
                18
            );
            emptyLabel.node.setPosition(0, 0, 0);
            return;
        }
        const analysis = this.analyzeDice(this.dice);
        const rowHeight = 22;
        const topY = (this.ownedContentNode.getComponent(UITransform)?.contentSize.height ?? 80) / 2 - rowHeight / 2;
        this.purchasedCards.forEach((card, index) => {
            const accurate = this.phase === 'revealed' ? this.evaluateInfoCard(card, analysis) : null;
            const badge = accurate === null ? '' : accurate ? '（核对：正确）' : '（核对：偏差）';
            const label = this.createLabelNode(
                this.ownedContentNode as Node,
                `Owned_${index}`,
                `${card.title}：${card.description}${badge}`,
                12,
                new Color(40, 60, 50, 255),
                ownedWidth,
                18
            );
            label.node.setPosition(0, topY - index * rowHeight, 0);
        });
    }

    private updateShopUI() {
        if (!this.shopContentNode) return;
        this.shopContentNode.removeAllChildren();
        const width = this.shopContentNode.getComponent(UITransform)?.contentSize.width ?? 320;
        const rowHeight = 54;
        const gap = 8;
        let startY = (this.shopContentNode.getComponent(UITransform)?.contentSize.height ?? 160) / 2 - rowHeight / 2;
        DICE_SHOP_ITEMS.forEach((item, index) => {
            const row = new Node(`ShopItem_${index}`);
            this.shopContentNode?.addChild(row);
            this.ensureUITransform(row, width, rowHeight);
            row.setPosition(0, startY - index * (rowHeight + gap), 0);
            const gfx = row.addComponent(Graphics);
            this.drawRoundedRectGfx(gfx, width, rowHeight, 10, new Color(255, 241, 217, 255), new Color(203, 183, 163, 255), 1);

            const title = this.createLabelNode(row, 'Name', item.name, 13, new Color(70, 50, 35, 255), width - 90, 16);
            title.node.setPosition(-width / 2 + (width - 90) / 2 + 8, 12, 0);
            const desc = this.createLabelNode(
                row,
                'Desc',
                `价格 ${item.price} | ${item.desc}`,
                11,
                new Color(120, 90, 70, 255),
                width - 90,
                16
            );
            desc.node.setPosition(-width / 2 + (width - 90) / 2 + 8, -10, 0);

            const btn = this.createButtonNode(row, 'RedeemBtn', '兑换', 72, 28);
            btn.node.setPosition(width / 2 - 45, 0, 0);
            this.drawButtonBg(btn.node, new Color(40, 34, 26, 255), new Color(30, 22, 16, 255));
            btn.label.color = new Color(245, 232, 210, 255);
            btn.node.off(Node.EventType.TOUCH_END);
            btn.node.on(Node.EventType.TOUCH_END, () => this.redeemItem(item.name, item.price), this);
        });

        if (this.inventoryLabel) {
            const toolText = `折扣券 x${this.discountTokens}，透骰券 x${this.forceRevealDie}`;
            const bagText = this.inventory.length === 0 ? '已兑换：暂无' : `已兑换：${this.inventory.join('、')}`;
            this.inventoryLabel.string = `${bagText} | 道具库存：${toolText}`;
        }
    }

    private updateCashoutHint() {
        const amount = Math.floor(this.cashoutAmount);
        if (this.cashoutAmountLabel) {
            this.cashoutAmountLabel.string = `筹码：${amount}`;
        }
        if (this.feeLabel) {
            this.feeLabel.string = `手续费 ${Math.round(this.CASHOUT_FEE_RATE * 100)}%`;
        }
        if (this.cashoutHintLabel) {
            if (!amount || amount <= 0) {
                this.cashoutHintLabel.string = '输入筹码金额可换算到手现金。';
            } else {
                const net = Math.floor(amount * (1 - this.CASHOUT_FEE_RATE));
                this.cashoutHintLabel.string = `预计到手 ${net} 现金`;
            }
        }

        const buyinAmount = Math.floor(this.buyinAmount);
        if (this.buyinAmountLabel) {
            this.buyinAmountLabel.string = `现金：${buyinAmount}`;
        }
        if (this.buyinHintLabel) {
            if (!buyinAmount || buyinAmount <= 0) {
                this.buyinHintLabel.string = '输入现金金额可换筹码。';
            } else {
                this.buyinHintLabel.string = `预计获得 ${buyinAmount} 筹码`;
            }
        }
    }

    private updateControls() {
        const revealEnabled = this.phase === 'betting';
        const nextEnabled = this.phase === 'revealed';
        const clearEnabled = this.phase === 'betting';
        if (this.controls.reveal) {
            this.controls.reveal.interactable = revealEnabled;
            this.drawButtonBg(
                this.controls.reveal.node,
                revealEnabled ? new Color(122, 30, 47, 255) : new Color(110, 100, 90, 200),
                new Color(30, 20, 15, 255)
            );
        }
        if (this.controls.next) {
            this.controls.next.interactable = nextEnabled;
            this.drawButtonBg(
                this.controls.next.node,
                nextEnabled ? new Color(40, 34, 26, 255) : new Color(110, 100, 90, 200),
                new Color(30, 20, 15, 255)
            );
        }
        if (this.controls.clear) {
            this.controls.clear.interactable = clearEnabled;
            this.drawButtonBg(
                this.controls.clear.node,
                clearEnabled ? new Color(250, 242, 226, 255) : new Color(210, 200, 190, 200),
                new Color(90, 70, 60, 255)
            );
        }
    }

    private updateBetAmountButtons() {
        this.betAmountButtons.forEach((entry) => {
            const active = entry.amount === this.currentBetAmount;
            this.drawButtonBg(
                entry.node,
                active ? new Color(122, 30, 47, 255) : new Color(70, 55, 40, 255),
                new Color(30, 20, 15, 255)
            );
            entry.label.color = new Color(245, 232, 210, 255);
        });
        if (this.betAmountLabel) {
            this.betAmountLabel.string = `下注金额：${this.currentBetAmount}`;
        }
    }

    private updateCashoutButtons() {
        this.cashoutButtons.forEach((entry) => {
            const active = entry.amount === this.cashoutAmount;
            this.drawButtonBg(
                entry.node,
                active ? new Color(122, 30, 47, 255) : new Color(70, 55, 40, 255),
                new Color(30, 20, 15, 255)
            );
            entry.label.color = new Color(245, 232, 210, 255);
        });
    }

    private updateBuyinButtons() {
        this.buyinButtons.forEach((entry) => {
            const active = entry.amount === this.buyinAmount;
            this.drawButtonBg(
                entry.node,
                active ? new Color(122, 30, 47, 255) : new Color(70, 55, 40, 255),
                new Color(30, 20, 15, 255)
            );
            entry.label.color = new Color(245, 232, 210, 255);
        });
    }

    private setResultText(text: string) {
        const label = this.resultLabel?.getComponent(Label);
        if (!label) return;
        label.string = text;
    }

    private showMessage(text: string) {
        if (!this.messageLabel) return;
        this.messageLabel.string = text;
        this.unschedule(this.clearMessageCallback);
        this.scheduleOnce(this.clearMessageCallback, 1.6);
    }

    private getInfoPrice(card: InfoCard): number {
        const multiplier = this.purchaseCount === 1 ? 1.5 : 1;
        let price = Math.ceil(card.price * multiplier);
        if (this.discountTokens > 0) {
            price = Math.ceil(price * 0.8);
        }
        return price;
    }

    private loadPersistentState() {
        const raw = sys.localStorage.getItem(this.SAVE_KEY);
        if (!raw) return;
        try {
            const data = JSON.parse(raw);
            if (typeof data.balance === 'number') this.balance = data.balance;
            if (typeof data.round === 'number') this.round = data.round;
            if (Array.isArray(data.inventory)) this.inventory = data.inventory;
            if (typeof data.discountTokens === 'number') this.discountTokens = data.discountTokens;
            if (typeof data.forceRevealDie === 'number') this.forceRevealDie = data.forceRevealDie;
            if (typeof data.cashoutAmount === 'number') this.cashoutAmount = data.cashoutAmount;
            if (typeof data.currentBetAmount === 'number') this.currentBetAmount = data.currentBetAmount;
            if (typeof data.buyinAmount === 'number') this.buyinAmount = data.buyinAmount;
        } catch (err) {
            console.warn('[DiceStation] 存档读取失败', err);
        }
    }

    private savePersistentState() {
        const data = {
            balance: this.balance,
            round: this.round,
            inventory: this.inventory,
            discountTokens: this.discountTokens,
            forceRevealDie: this.forceRevealDie,
            cashoutAmount: this.cashoutAmount,
            currentBetAmount: this.currentBetAmount,
            buyinAmount: this.buyinAmount
        };
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    private generateInfoCards(analysis: DiceAnalysis): InfoCard[] {
        let pool: InfoType[] = this.shuffle(['sumRange', 'sumLock', 'pairPresence', 'pairValue', 'triplePresence', 'revealDie']);
        const cards: InfoCard[] = [];
        if (this.forceRevealDie > 0) {
            cards.push(this.buildInfoCard('revealDie', analysis));
            this.forceRevealDie -= 1;
            pool = pool.filter((type) => type !== 'revealDie');
        }
        pool.slice(0, 3 - cards.length).forEach((type) => cards.push(this.buildInfoCard(type, analysis)));
        if (Math.random() < 0.35 && cards.length > 0) {
            const special = cards[this.randInt(0, cards.length - 1)];
            special.special = true;
            special.reliability = Math.min(0.95, special.reliability + 0.05);
            special.price += 20;
        }
        return cards;
    }

    private buildInfoCard(type: InfoType, analysis: DiceAnalysis): InfoCard {
        const info: InfoCard = {
            id: `${type}-${Date.now()}-${Math.random()}`,
            type,
            title: '',
            description: '',
            reliability: 0,
            price: 0,
            payload: {}
        };
        if (type === 'sumRange') {
            info.title = '点数区间票';
            info.reliability = 0.7;
            info.price = 35;
            let truthful = Math.random() < info.reliability;
            const matchRange = DICE_SUM_RANGE_OPTIONS.some(
                (range) => analysis.sum >= range.low && analysis.sum <= range.high
            );
            const nonMatchRange = DICE_SUM_RANGE_OPTIONS.some(
                (range) => analysis.sum < range.low || analysis.sum > range.high
            );
            if (truthful && !matchRange) truthful = false;
            if (!truthful && !nonMatchRange) truthful = true;
            const range = this.pickRange(truthful, analysis.sum);
            info.payload = { low: range.low, high: range.high };
            info.description = `总和在 ${range.low}-${range.high}`;
            return info;
        }
        if (type === 'sumLock') {
            info.title = '点数锁定票';
            info.reliability = 0.8;
            info.price = 60;
            const candidateCount = Math.random() < 0.5 ? 2 : 3;
            let truthful = Math.random() < info.reliability;
            const candidates = new Set<number>();
            if (truthful) {
                candidates.add(analysis.sum);
                let guard = 0;
                while (candidates.size < candidateCount && guard < 20) {
                    const offset = this.randInt(-2, 2);
                    if (offset === 0) {
                        guard += 1;
                        continue;
                    }
                    const value = Math.min(18, Math.max(3, analysis.sum + offset));
                    candidates.add(value);
                    guard += 1;
                }
                while (candidates.size < candidateCount) {
                    candidates.add(this.randInt(3, 18));
                }
            } else {
                const shift = analysis.sum >= 10 ? -2 : 2;
                const base = Math.min(18, Math.max(3, analysis.sum + shift));
                while (candidates.size < candidateCount) {
                    const offset = this.randInt(-1, 1);
                    const value = Math.min(18, Math.max(3, base + offset));
                    if (value !== analysis.sum) {
                        candidates.add(value);
                    }
                }
            }
            const list = [...candidates].sort((a, b) => a - b);
            info.payload = { candidates: list };
            info.description = `总和锁定：${list.join(' / ')}`;
            return info;
        }
        if (type === 'pairPresence') {
            info.title = '对子线报';
            info.reliability = 0.75;
            info.price = 55;
            const actual = analysis.hasPair;
            const truthful = Math.random() < info.reliability;
            const statement = truthful ? actual : !actual;
            info.payload = { hasPair: statement };
            info.description = statement ? '本局有对子' : '本局无对子';
            return info;
        }
        if (type === 'pairValue') {
            info.title = '指定对子线报';
            info.reliability = 0.8;
            info.price = 70;
            const actualPair = analysis.isTriple ? analysis.tripleValue : analysis.pairValues[0] || null;
            let truthful = Math.random() < info.reliability;
            if (!actualPair) truthful = false;
            const candidates = new Set<number>();
            if (truthful) {
                candidates.add(actualPair);
                while (candidates.size < 2) {
                    candidates.add(this.randInt(1, 6));
                }
            } else {
                while (candidates.size < 2) {
                    const value = this.randInt(1, 6);
                    if (value !== actualPair) {
                        candidates.add(value);
                    }
                }
            }
            const list = [...candidates];
            info.payload = { candidates: list };
            info.description = `对子点数倾向：${list.join(' / ')}`;
            return info;
        }
        if (type === 'triplePresence') {
            info.title = '豹子风向';
            info.reliability = 0.75;
            info.price = 65;
            const actual = analysis.isTriple;
            const truthful = Math.random() < info.reliability;
            const statement = truthful ? actual : !actual;
            info.payload = { isTriple: statement };
            info.description = statement ? '本局有豹子' : '本局无豹子';
            return info;
        }
        if (type === 'revealDie') {
            info.title = '透骰票';
            info.reliability = 1;
            info.price = 90;
            const index = this.randInt(0, 2);
            const value = this.dice[index];
            info.payload = { index, value };
            info.description = `第${index + 1}颗骰子 = ${value}`;
            return info;
        }
        return info;
    }

    private evaluateInfoCard(card: InfoCard, analysis: DiceAnalysis): boolean {
        if (card.type === 'sumRange') {
            return analysis.sum >= card.payload.low && analysis.sum <= card.payload.high;
        }
        if (card.type === 'sumLock') {
            return card.payload.candidates.includes(analysis.sum);
        }
        if (card.type === 'pairPresence') {
            return card.payload.hasPair === analysis.hasPair;
        }
        if (card.type === 'pairValue') {
            const value = analysis.isTriple ? analysis.tripleValue : analysis.pairValues[0];
            return analysis.hasPair && value && card.payload.candidates.includes(value);
        }
        if (card.type === 'triplePresence') {
            return card.payload.isTriple === analysis.isTriple;
        }
        if (card.type === 'revealDie') {
            return this.dice[card.payload.index] === card.payload.value;
        }
        return false;
    }

    private analyzeDice(dice: number[]): DiceAnalysis {
        const counts = new Array(7).fill(0);
        dice.forEach((value) => {
            counts[value] += 1;
        });
        const isTriple = counts.some((count) => count === 3);
        const tripleValue = isTriple ? counts.findIndex((count) => count === 3) : null;
        const pairValues: number[] = [];
        for (let value = 1; value <= 6; value += 1) {
            if (counts[value] === 2) {
                pairValues.push(value);
            }
        }
        return {
            sum: dice.reduce((a, b) => a + b, 0),
            counts,
            isTriple,
            tripleValue,
            pairValues,
            hasPair: pairValues.length > 0 || isTriple
        };
    }

    private pickRange(includeSum: boolean, sum: number) {
        const matching = DICE_SUM_RANGE_OPTIONS.filter((range) => sum >= range.low && sum <= range.high);
        const nonMatching = DICE_SUM_RANGE_OPTIONS.filter((range) => sum < range.low || sum > range.high);
        if (includeSum && matching.length > 0) {
            return matching[this.randInt(0, matching.length - 1)];
        }
        if (!includeSum && nonMatching.length > 0) {
            return nonMatching.sort(
                (a, b) =>
                    Math.abs(sum - (a.low + a.high) / 2) - Math.abs(sum - (b.low + b.high) / 2)
            )[0];
        }
        return matching[0] || DICE_SUM_RANGE_OPTIONS[0];
    }

    private getNearMissHint(analysis: DiceAnalysis): string {
        const sumBets = Array.from(this.bets.values()).filter((bet) => bet.type === 'sum');
        if (sumBets.length === 0) return '';
        let closest = Infinity;
        sumBets.forEach((bet) => {
            if (typeof bet.value !== 'number') return;
            closest = Math.min(closest, Math.abs(analysis.sum - bet.value));
        });
        if (closest === 1) return '差一点就中';
        if (closest === 2) return '就差两点';
        return '';
    }

    private buildStatusRow() {
        if (!this.panelRoot) return;
        const row = this.getOrCreateChild(this.panelRoot, 'StatusRow');
        this.ensureUITransform(row);
        const rowSize = row.getComponent(UITransform)?.contentSize;
        const items = [
            { key: 'balance', label: '筹码' },
            { key: 'cash', label: '现金' },
            { key: 'totalBet', label: '下注' },
            { key: 'round', label: '局数' }
        ] as const;
        const gap = 8;
        const availableWidth = rowSize?.width && rowSize.width > 200 ? rowSize.width : 560;
        const itemWidth = Math.min(120, Math.floor((availableWidth - gap * (items.length - 1)) / items.length));
        const itemHeight = 32;
        const totalWidth = items.length * itemWidth + (items.length - 1) * gap;
        let startX = -totalWidth / 2 + itemWidth / 2;
        items.forEach((item, index) => {
            const chip = this.getOrCreateChild(row, `StatusChip_${item.key}`);
            this.ensureUITransform(chip, itemWidth, itemHeight);
            chip.setPosition(startX + index * (itemWidth + gap), 0, 0);
            const gfx = chip.getComponent(Graphics) || chip.addComponent(Graphics);
            this.drawRoundedRectGfx(gfx, itemWidth, itemHeight, 8, new Color(255, 243, 221, 255), new Color(203, 183, 163, 255), 1);
            const labelNode = this.getOrCreateChild(chip, 'Label');
            const label = labelNode.getComponent(Label) || labelNode.addComponent(Label);
            label.string = `${item.label} 0`;
            label.fontSize = 13;
            label.lineHeight = 16;
            label.color = new Color(60, 45, 35, 255);
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            this.ensureUITransform(labelNode, itemWidth - 6, itemHeight - 4);
            labelNode.setPosition(0, 0, 0);
            this.statusLabels[item.key] = label;
        });
    }

    private buildMessageLabel() {
        if (!this.panelRoot) return;
        const messageNode = this.getOrCreateChild(this.panelRoot, 'MessageLabel');
        const label = messageNode.getComponent(Label) || messageNode.addComponent(Label);
        label.string = '';
        label.fontSize = 13;
        label.lineHeight = 18;
        label.color = new Color(120, 45, 40, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(messageNode, 560, 24);
        messageNode.setPosition(-360, 70, 0);
        this.messageLabel = label;
    }

    private buildBetArea() {
        if (!this.betAreaNode) return;
        this.ensureUITransform(this.betAreaNode, 1040, 550);
        const betSize = this.betAreaNode.getComponent(UITransform)?.contentSize;
        const width = betSize?.width ?? 1040;
        const height = betSize?.height ?? 550;
        const halfW = width / 2;
        const halfH = height / 2;
        const leftMargin = 28;
        const leftX = -halfW + leftMargin;
        const topY = halfH - 28;
        const gfx = this.betAreaNode.getComponent(Graphics) || this.betAreaNode.addComponent(Graphics);
        this.drawRoundedRectGfx(gfx, width, height, 12, new Color(255, 248, 236, 255), new Color(203, 183, 163, 255), 1);

        const title = this.getOrCreateChild(this.betAreaNode, 'BetTitle');
        const titleLabel = title.getComponent(Label) || title.addComponent(Label);
        titleLabel.string = '下注区';
        titleLabel.fontSize = 16;
        titleLabel.color = new Color(122, 30, 47, 255);
        titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        titleLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(title, 200, 22);
        title.setPosition(leftX + 100, topY, 0);

        const amountRow = this.getOrCreateChild(this.betAreaNode, 'BetAmountRow');
        this.ensureUITransform(amountRow, 520, 32);
        amountRow.setPosition(leftX + 260, topY - 42, 0);
        const amountLabelNode = this.getOrCreateChild(amountRow, 'AmountLabel');
        const amountLabel = amountLabelNode.getComponent(Label) || amountLabelNode.addComponent(Label);
        amountLabel.fontSize = 13;
        amountLabel.color = new Color(70, 50, 35, 255);
        amountLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        amountLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(amountLabelNode, 150, 22);
        amountLabelNode.setPosition(-210, 0, 0);
        this.betAmountLabel = amountLabel;

        const amounts = [10, 50, 100, 200];
        this.betAmountButtons = [];
        amounts.forEach((amt, index) => {
            const btn = this.createButtonNode(amountRow, `BetAmount_${amt}`, `${amt}`, 60, 28);
            btn.node.setPosition(-40 + index * 70, 0, 0);
            btn.node.on(Node.EventType.TOUCH_END, () => {
                this.currentBetAmount = amt;
                this.updateBetAmountButtons();
                this.savePersistentState();
            });
            this.betAmountButtons.push({ amount: amt, node: btn.node, label: btn.label, button: btn.button });
        });

        const smallTitleNode = this.getOrCreateChild(this.betAreaNode, 'SmallBigTitle');
        const smallTitle = smallTitleNode.getComponent(Label) || smallTitleNode.addComponent(Label);
        smallTitle.string = '大小';
        smallTitle.fontSize = 13;
        smallTitle.color = new Color(80, 60, 45, 255);
        smallTitle.horizontalAlign = Label.HorizontalAlign.LEFT;
        smallTitle.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(smallTitleNode, 200, 18);
        smallTitleNode.setPosition(leftX + 100, topY - 90, 0);

        const smallBtn = this.createButtonNode(this.betAreaNode, 'SmallBtn', '小 4-10 (1x)', 160, 30);
        smallBtn.node.setPosition(leftX + 80, topY - 126, 0);
        smallBtn.node.on(Node.EventType.TOUCH_END, () => this.placeBet('small', '小 4-10', 1));

        const bigBtn = this.createButtonNode(this.betAreaNode, 'BigBtn', '大 11-17 (1x)', 160, 30);
        bigBtn.node.setPosition(leftX + 80 + 176, topY - 126, 0);
        bigBtn.node.on(Node.EventType.TOUCH_END, () => this.placeBet('big', '大 11-17', 1));

        const sumTitleNode = this.getOrCreateChild(this.betAreaNode, 'SumTitle');
        const sumTitle = sumTitleNode.getComponent(Label) || sumTitleNode.addComponent(Label);
        sumTitle.string = '点数总和';
        sumTitle.fontSize = 13;
        sumTitle.color = new Color(80, 60, 45, 255);
        sumTitle.horizontalAlign = Label.HorizontalAlign.LEFT;
        sumTitle.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(sumTitleNode, 200, 18);
        sumTitleNode.setPosition(leftX + 100, topY - 170, 0);

        const sums = Object.keys(DICE_SUM_ODDS)
            .map(Number)
            .sort((a, b) => a - b);
        const sumRowY = topY - 208;
        const sumButtonWidth = 56;
        const sumButtonHeight = 26;
        sums.forEach((sum, index) => {
            const odds = DICE_SUM_ODDS[sum];
            const row = index < 8 ? 0 : 1;
            const col = index % 8;
            const btn = this.createButtonNode(this.betAreaNode as Node, `Sum_${sum}`, `${sum}\n${odds}x`, sumButtonWidth, sumButtonHeight);
            btn.label.fontSize = 10;
            btn.label.lineHeight = 12;
            btn.label.enableWrapText = true;
            const startX = leftX + sumButtonWidth / 2;
            const x = startX + col * (sumButtonWidth + 8);
            const y = sumRowY - row * 40;
            btn.node.setPosition(x, y, 0);
            btn.node.on(Node.EventType.TOUCH_END, () => this.placeBet('sum', `点数 ${sum}`, odds, sum));
        });

        const pairTitleNode = this.getOrCreateChild(this.betAreaNode, 'PairTitle');
        const pairTitle = pairTitleNode.getComponent(Label) || pairTitleNode.addComponent(Label);
        pairTitle.string = '对子 / 豹子';
        pairTitle.fontSize = 13;
        pairTitle.color = new Color(80, 60, 45, 255);
        pairTitle.horizontalAlign = Label.HorizontalAlign.LEFT;
        pairTitle.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(pairTitleNode, 200, 18);
        pairTitleNode.setPosition(leftX + 100, topY - 270, 0);

        const tripleBtn = this.createButtonNode(this.betAreaNode, 'TripleBtn', '任意豹子 (24x)', 140, 28);
        tripleBtn.node.setPosition(leftX + 70, topY - 304, 0);
        tripleBtn.node.on(Node.EventType.TOUCH_END, () => this.placeBet('any-triple', '任意豹子', 24));

        for (let i = 1; i <= 6; i += 1) {
            const btn = this.createButtonNode(this.betAreaNode as Node, `Pair_${i}`, `${i}-${i} (8x)`, 70, 26);
            btn.label.fontSize = 10;
            const startX = leftX + 220;
            btn.node.setPosition(startX + (i - 1) * 80, topY - 304, 0);
            btn.node.on(Node.EventType.TOUCH_END, () => this.placeBet('pair', `对子 ${i}-${i}`, 8, i));
        }

        const betListNode = this.getOrCreateChild(this.betAreaNode, 'BetList');
        const betList = betListNode.getComponent(Label) || betListNode.addComponent(Label);
        betList.fontSize = 12;
        betList.lineHeight = 16;
        betList.color = new Color(90, 70, 55, 255);
        betList.horizontalAlign = Label.HorizontalAlign.LEFT;
        betList.verticalAlign = Label.VerticalAlign.TOP;
        betList.enableWrapText = true;
        const listWidth = Math.min(900, width - 80);
        this.ensureUITransform(betListNode, listWidth, 90);
        betListNode.setPosition(-halfW + 40 + listWidth / 2, -halfH + 70, 0);
        this.betListLabel = betList;
    }

    private buildInfoList() {
        if (!this.infoListNode) return;
        this.ensureUITransform(this.infoListNode, 680, 360);
        const infoSize = this.infoListNode.getComponent(UITransform)?.contentSize;
        const width = infoSize?.width ?? 680;
        const height = infoSize?.height ?? 360;
        const halfW = width / 2;
        const halfH = height / 2;
        const gfx = this.infoListNode.getComponent(Graphics) || this.infoListNode.addComponent(Graphics);
        this.drawRoundedRectGfx(gfx, width, height, 12, new Color(255, 248, 236, 255), new Color(203, 183, 163, 255), 1);

        const titleNode = this.getOrCreateChild(this.infoListNode, 'InfoTitle');
        const titleLabel = titleNode.getComponent(Label) || titleNode.addComponent(Label);
        titleLabel.string = '黑衣人情报';
        titleLabel.fontSize = 15;
        titleLabel.color = new Color(122, 30, 47, 255);
        titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        titleLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(titleNode, 260, 20);
        titleNode.setPosition(-halfW + 20 + 130, halfH - 26, 0);

        const hintNode = this.getOrCreateChild(this.infoListNode, 'InfoHint');
        const hintLabel = hintNode.getComponent(Label) || hintNode.addComponent(Label);
        hintLabel.string = '本局最多买 2 条，第二条 +50% 价格';
        hintLabel.fontSize = 11;
        hintLabel.color = new Color(120, 90, 70, 255);
        hintLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        hintLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(hintNode, 420, 16);
        hintNode.setPosition(-halfW + 20 + 210, halfH - 48, 0);
        this.infoHintLabel = hintLabel;

        const infoContent = this.getOrCreateChild(this.infoListNode, 'InfoContent');
        this.ensureUITransform(infoContent, width - 60, Math.max(160, height - 160));
        infoContent.setPosition(0, 20, 0);
        this.infoContentNode = infoContent;

        const ownedTitleNode = this.getOrCreateChild(this.infoListNode, 'OwnedTitle');
        const ownedTitle = ownedTitleNode.getComponent(Label) || ownedTitleNode.addComponent(Label);
        ownedTitle.string = '已购情报';
        ownedTitle.fontSize = 13;
        ownedTitle.color = new Color(70, 55, 40, 255);
        ownedTitle.horizontalAlign = Label.HorizontalAlign.LEFT;
        ownedTitle.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(ownedTitleNode, 200, 18);
        ownedTitleNode.setPosition(-halfW + 20 + 100, -halfH + 90, 0);

        const ownedContent = this.getOrCreateChild(this.infoListNode, 'OwnedContent');
        this.ensureUITransform(ownedContent, width - 60, 90);
        ownedContent.setPosition(0, -halfH + 40, 0);
        this.ownedContentNode = ownedContent;
    }

    private buildShopList() {
        if (!this.shopListNode) return;
        this.ensureUITransform(this.shopListNode, 680, 220);
        const shopSize = this.shopListNode.getComponent(UITransform)?.contentSize;
        const width = shopSize?.width ?? 680;
        const height = shopSize?.height ?? 220;
        const halfW = width / 2;
        const halfH = height / 2;
        const gfx = this.shopListNode.getComponent(Graphics) || this.shopListNode.addComponent(Graphics);
        this.drawRoundedRectGfx(gfx, width, height, 12, new Color(255, 248, 236, 255), new Color(203, 183, 163, 255), 1);

        const titleNode = this.getOrCreateChild(this.shopListNode, 'ShopTitle');
        const titleLabel = titleNode.getComponent(Label) || titleNode.addComponent(Label);
        titleLabel.string = '赌场商店';
        titleLabel.fontSize = 14;
        titleLabel.color = new Color(122, 30, 47, 255);
        titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        titleLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(titleNode, 240, 20);
        titleNode.setPosition(-halfW + 20 + 120, halfH - 25, 0);

        const content = this.getOrCreateChild(this.shopListNode, 'ShopContent');
        this.ensureUITransform(content, width - 60, Math.max(100, height - 100));
        content.setPosition(0, 10, 0);
        this.shopContentNode = content;

        const invNode = this.getOrCreateChild(this.shopListNode, 'InventoryLabel');
        const invLabel = invNode.getComponent(Label) || invNode.addComponent(Label);
        invLabel.string = '';
        invLabel.fontSize = 11;
        invLabel.color = new Color(120, 90, 70, 255);
        invLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        invLabel.verticalAlign = Label.VerticalAlign.CENTER;
        invLabel.enableWrapText = true;
        this.ensureUITransform(invNode, width - 60, 28);
        invNode.setPosition(0, -halfH + 25, 0);
        this.inventoryLabel = invLabel;
    }

    private buildCashoutArea() {
        if (!this.cashoutAreaNode) return;
        this.ensureUITransform(this.cashoutAreaNode, 680, 320);
        const cashoutSize = this.cashoutAreaNode.getComponent(UITransform)?.contentSize;
        const width = cashoutSize?.width ?? 680;
        const height = cashoutSize?.height ?? 320;
        const halfW = width / 2;
        const halfH = height / 2;
        const gfx = this.cashoutAreaNode.getComponent(Graphics) || this.cashoutAreaNode.addComponent(Graphics);
        this.drawRoundedRectGfx(gfx, width, height, 12, new Color(255, 248, 236, 255), new Color(203, 183, 163, 255), 1);

        const titleNode = this.getOrCreateChild(this.cashoutAreaNode, 'CashoutTitle');
        const titleLabel = titleNode.getComponent(Label) || titleNode.addComponent(Label);
        titleLabel.string = '兑换区';
        titleLabel.fontSize = 14;
        titleLabel.color = new Color(122, 30, 47, 255);
        titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        titleLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(titleNode, 200, 18);
        titleNode.setPosition(-halfW + 20 + 100, halfH - 30, 0);

        const cashoutTitle = this.getOrCreateChild(this.cashoutAreaNode, 'CashoutSectionTitle');
        const cashoutTitleLabel = cashoutTitle.getComponent(Label) || cashoutTitle.addComponent(Label);
        cashoutTitleLabel.string = '筹码→现金';
        cashoutTitleLabel.fontSize = 12;
        cashoutTitleLabel.color = new Color(80, 60, 45, 255);
        cashoutTitleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        cashoutTitleLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(cashoutTitle, 200, 16);
        cashoutTitle.setPosition(-halfW + 20 + 100, halfH - 56, 0);

        const feeNode = this.getOrCreateChild(this.cashoutAreaNode, 'FeeLabel');
        const feeLabel = feeNode.getComponent(Label) || feeNode.addComponent(Label);
        feeLabel.fontSize = 11;
        feeLabel.color = new Color(120, 90, 70, 255);
        feeLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        feeLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(feeNode, 200, 16);
        feeNode.setPosition(-halfW + 20 + 100, halfH - 74, 0);
        this.feeLabel = feeLabel;

        const amountNode = this.getOrCreateChild(this.cashoutAreaNode, 'CashoutAmountLabel');
        const amountLabel = amountNode.getComponent(Label) || amountNode.addComponent(Label);
        amountLabel.fontSize = 12;
        amountLabel.color = new Color(70, 50, 35, 255);
        amountLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        amountLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(amountNode, 200, 18);
        amountNode.setPosition(-halfW + 20 + 100, halfH - 94, 0);
        this.cashoutAmountLabel = amountLabel;

        const hintNode = this.getOrCreateChild(this.cashoutAreaNode, 'CashoutHint');
        const hintLabel = hintNode.getComponent(Label) || hintNode.addComponent(Label);
        hintLabel.fontSize = 11;
        hintLabel.color = new Color(120, 90, 70, 255);
        hintLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        hintLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(hintNode, 240, 18);
        hintNode.setPosition(-halfW + 20 + 120, halfH - 114, 0);
        this.cashoutHintLabel = hintLabel;

        const amounts = [50, 100, 200, 500];
        this.cashoutButtons = [];
        amounts.forEach((amt, index) => {
            const btn = this.createButtonNode(this.cashoutAreaNode as Node, `Cashout_${amt}`, `${amt}`, 50, 24);
            btn.node.setPosition(-160 + index * 58, 0, 0);
            btn.node.on(Node.EventType.TOUCH_END, () => this.setCashoutAmount(amt), this);
            this.cashoutButtons.push({ amount: amt, node: btn.node, label: btn.label, button: btn.button });
        });

        const cashoutBtn = this.createButtonNode(this.cashoutAreaNode, 'CashoutBtn', '兑换现金', 90, 26);
        cashoutBtn.node.setPosition(220, 0, 0);
        cashoutBtn.node.on(Node.EventType.TOUCH_END, this.cashout, this);
        this.drawButtonBg(cashoutBtn.node, new Color(40, 34, 26, 255), new Color(30, 22, 16, 255));
        cashoutBtn.label.color = new Color(245, 232, 210, 255);

        const buyinTitle = this.getOrCreateChild(this.cashoutAreaNode, 'BuyinTitle');
        const buyinTitleLabel = buyinTitle.getComponent(Label) || buyinTitle.addComponent(Label);
        buyinTitleLabel.string = '现金→筹码';
        buyinTitleLabel.fontSize = 12;
        buyinTitleLabel.color = new Color(80, 60, 45, 255);
        buyinTitleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        buyinTitleLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(buyinTitle, 200, 16);
        buyinTitle.setPosition(-halfW + 20 + 100, -halfH + 90, 0);

        const buyinAmountNode = this.getOrCreateChild(this.cashoutAreaNode, 'BuyinAmountLabel');
        const buyinAmountLabel = buyinAmountNode.getComponent(Label) || buyinAmountNode.addComponent(Label);
        buyinAmountLabel.fontSize = 12;
        buyinAmountLabel.color = new Color(70, 50, 35, 255);
        buyinAmountLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        buyinAmountLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(buyinAmountNode, 200, 18);
        buyinAmountNode.setPosition(-halfW + 20 + 100, -halfH + 72, 0);
        this.buyinAmountLabel = buyinAmountLabel;

        const buyinHintNode = this.getOrCreateChild(this.cashoutAreaNode, 'BuyinHint');
        const buyinHintLabel = buyinHintNode.getComponent(Label) || buyinHintNode.addComponent(Label);
        buyinHintLabel.fontSize = 11;
        buyinHintLabel.color = new Color(120, 90, 70, 255);
        buyinHintLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        buyinHintLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.ensureUITransform(buyinHintNode, 240, 18);
        buyinHintNode.setPosition(-halfW + 20 + 120, -halfH + 54, 0);
        this.buyinHintLabel = buyinHintLabel;

        const buyinAmounts = [50, 100, 200, 500];
        this.buyinButtons = [];
        buyinAmounts.forEach((amt, index) => {
            const btn = this.createButtonNode(this.cashoutAreaNode as Node, `Buyin_${amt}`, `${amt}`, 50, 24);
            btn.node.setPosition(-160 + index * 58, -halfH + 30, 0);
            btn.node.on(Node.EventType.TOUCH_END, () => this.setBuyinAmount(amt), this);
            this.buyinButtons.push({ amount: amt, node: btn.node, label: btn.label, button: btn.button });
        });

        const buyinBtn = this.createButtonNode(this.cashoutAreaNode, 'BuyinBtn', '换筹码', 90, 26);
        buyinBtn.node.setPosition(220, -halfH + 30, 0);
        buyinBtn.node.on(Node.EventType.TOUCH_END, this.buyin, this);
        this.drawButtonBg(buyinBtn.node, new Color(40, 34, 26, 255), new Color(30, 22, 16, 255));
        buyinBtn.label.color = new Color(245, 232, 210, 255);
    }

    private layoutNodes() {
        if (!this.panelRoot) return;
        const panelTransform = this.ensureUITransform(this.panelRoot, 1920, 1080);
        const panelSize = panelTransform.contentSize;
        if (this.modalBg) {
            this.ensureUITransform(this.modalBg, panelSize.width, panelSize.height);
        }

        const padding = 28;
        const topPadding = 18;
        const topBarHeight = 70;
        const gap = 16;
        const leftWidth = 1040;
        const rightWidth = 680;
        const columnGap = 32;
        const leftX = -(rightWidth + columnGap) / 2;
        const rightX = (leftWidth + columnGap) / 2;
        const columnTop = panelSize.height / 2 - topPadding - topBarHeight - gap;

        const topBar = this.panelRoot.getChildByName('TopBar');
        if (topBar) {
            this.ensureUITransform(topBar, panelSize.width - padding * 2, topBarHeight);
            topBar.setPosition(0, panelSize.height / 2 - topBarHeight / 2 - topPadding, 0);
            const topSize = topBar.getComponent(UITransform)?.contentSize;
            const titleNode = topBar.getChildByName('TitleLabel');
            if (titleNode) {
                const label = titleNode.getComponent(Label) || titleNode.addComponent(Label);
                label.string = '骰子赌局';
                label.fontSize = 22;
                label.color = new Color(241, 195, 106, 255);
                label.horizontalAlign = Label.HorizontalAlign.LEFT;
                label.verticalAlign = Label.VerticalAlign.CENTER;
                this.ensureUITransform(titleNode, 260, 32);
                if (topSize) {
                    titleNode.setPosition(-topSize.width / 2 + 140, 0, 0);
                }
            }
            if (this.walletLabel) {
                const walletLabel = this.walletLabel.getComponent(Label) || this.walletLabel.addComponent(Label);
                walletLabel.fontSize = 14;
                walletLabel.color = new Color(240, 230, 200, 255);
                walletLabel.horizontalAlign = Label.HorizontalAlign.RIGHT;
                walletLabel.verticalAlign = Label.VerticalAlign.CENTER;
                this.ensureUITransform(this.walletLabel, 240, 24);
                if (topSize) {
                    this.walletLabel.setPosition(topSize.width / 2 - 220, 0, 0);
                }
            }
            if (this.closeButton) {
                this.ensureUITransform(this.closeButton, 90, 34);
                if (topSize) {
                    this.closeButton.setPosition(topSize.width / 2 - 60, 0, 0);
                }
                const labelNode = this.closeButton.getChildByName('Label');
                const label = labelNode?.getComponent(Label) || labelNode?.addComponent(Label);
                if (label) {
                    label.string = '关闭';
                    label.fontSize = 12;
                    label.color = new Color(240, 230, 200, 255);
                    label.horizontalAlign = Label.HorizontalAlign.CENTER;
                    label.verticalAlign = Label.VerticalAlign.CENTER;
                    this.ensureUITransform(label.node, 80, 20);
                    label.node.setPosition(0, 0, 0);
                }
            }
        }

        if (this.shopButton) {
            this.ensureUITransform(this.shopButton, 160, 46);
            const labelNode = this.shopButton.getChildByName('ButtonLabel');
            const label = labelNode?.getComponent(Label) || labelNode?.addComponent(Label);
            if (label) {
                label.string = '🎲 骰子赌局';
                label.fontSize = 16;
                label.color = new Color(245, 232, 210, 255);
                label.horizontalAlign = Label.HorizontalAlign.CENTER;
                label.verticalAlign = Label.VerticalAlign.CENTER;
                this.ensureUITransform(label.node, 150, 30);
            }
        }

        const diceArea = this.panelRoot.getChildByName('DiceArea');
        const controlsNode = this.panelRoot.getChildByName('Controls');
        const statusRow = this.panelRoot.getChildByName('StatusRow');
        const messageNode = this.panelRoot.getChildByName('MessageLabel');
        const betArea = this.panelRoot.getChildByName('BetArea');
        const infoList = this.panelRoot.getChildByName('InfoList');
        const shopList = this.panelRoot.getChildByName('ShopList');
        const cashoutArea = this.panelRoot.getChildByName('CashoutArea');

        const diceHeight = 220;
        const controlsHeight = 50;
        const statusHeight = 40;
        const messageHeight = 24;
        const betHeight = 550;

        let leftY = columnTop;
        if (statusRow) {
            this.ensureUITransform(statusRow, leftWidth, statusHeight);
            statusRow.setPosition(leftX, leftY - statusHeight / 2, 0);
            leftY -= statusHeight + gap;
        }

        if (diceArea) {
            this.ensureUITransform(diceArea, leftWidth, diceHeight);
            diceArea.setPosition(leftX, leftY - diceHeight / 2, 0);
            const diceRow = diceArea.getChildByName('DiceRow');
            if (diceRow) {
                const rowY = Math.max(40, diceHeight / 2 - 70);
                this.ensureUITransform(diceRow, 320, 90);
                diceRow.setPosition(0, rowY, 0);
                const diceNodes = ['Dice1', 'Dice2', 'Dice3'];
                diceNodes.forEach((name, index) => {
                    const node = diceRow.getChildByName(name);
                    if (node) {
                        this.ensureUITransform(node, 80, 80);
                        node.setPosition(-100 + index * 100, 0, 0);
                    }
                });
            }
            const resultNode = diceArea.getChildByName('ResultLabel');
            if (resultNode) {
                const label = resultNode.getComponent(Label) || resultNode.addComponent(Label);
                label.fontSize = 12;
                label.lineHeight = 18;
                label.color = new Color(240, 230, 200, 255);
                label.horizontalAlign = Label.HorizontalAlign.CENTER;
                label.verticalAlign = Label.VerticalAlign.CENTER;
                label.enableWrapText = true;
                this.ensureUITransform(resultNode, leftWidth - 40, 70);
                resultNode.setPosition(0, -diceHeight / 2 + 40, 0);
            }
            leftY -= diceHeight + gap;
        }

        if (controlsNode) {
            this.ensureUITransform(controlsNode, leftWidth, controlsHeight);
            controlsNode.setPosition(leftX, leftY - controlsHeight / 2, 0);
            const revealWidth = 170;
            const nextWidth = 140;
            const clearWidth = 140;
            const buttonGap = 30;
            const totalWidth = revealWidth + nextWidth + clearWidth + buttonGap * 2;
            let startX = -totalWidth / 2 + revealWidth / 2;
            if (this.controls.reveal) {
                this.ensureUITransform(this.controls.reveal.node, revealWidth, 40);
                this.controls.reveal.node.setPosition(startX, 0, 0);
                const label = this.controls.reveal.node.getChildByName('Label')?.getComponent(Label);
                if (label) {
                    label.string = '开锅结算';
                    label.fontSize = 13;
                    label.color = new Color(245, 232, 210, 255);
                }
            }
            const nextX = startX + revealWidth / 2 + buttonGap + nextWidth / 2;
            if (this.controls.next) {
                this.ensureUITransform(this.controls.next.node, nextWidth, 40);
                this.controls.next.node.setPosition(nextX, 0, 0);
                const label = this.controls.next.node.getChildByName('Label')?.getComponent(Label);
                if (label) {
                    label.string = '下一局';
                    label.fontSize = 13;
                    label.color = new Color(245, 232, 210, 255);
                }
            }
            const clearX = nextX + nextWidth / 2 + buttonGap + clearWidth / 2;
            if (this.controls.clear) {
                this.ensureUITransform(this.controls.clear.node, clearWidth, 40);
                this.controls.clear.node.setPosition(clearX, 0, 0);
                const label = this.controls.clear.node.getChildByName('Label')?.getComponent(Label);
                if (label) {
                    label.string = '清空下注';
                    label.fontSize = 13;
                    label.color = new Color(90, 70, 55, 255);
                }
            }
            leftY -= controlsHeight + gap;
        }

        if (messageNode) {
            this.ensureUITransform(messageNode, leftWidth, messageHeight);
            messageNode.setPosition(leftX, leftY - messageHeight / 2, 0);
            leftY -= messageHeight + gap;
        }

        if (betArea) {
            this.ensureUITransform(betArea, leftWidth, betHeight);
            betArea.setPosition(leftX, leftY - betHeight / 2, 0);
        }

        const infoHeight = 360;
        const shopHeight = 220;
        const cashoutHeight = 320;
        let rightY = columnTop;
        if (infoList) {
            this.ensureUITransform(infoList, rightWidth, infoHeight);
            infoList.setPosition(rightX, rightY - infoHeight / 2, 0);
            rightY -= infoHeight + gap;
        }
        if (shopList) {
            this.ensureUITransform(shopList, rightWidth, shopHeight);
            shopList.setPosition(rightX, rightY - shopHeight / 2, 0);
            rightY -= shopHeight + gap;
        }
        if (cashoutArea) {
            this.ensureUITransform(cashoutArea, rightWidth, cashoutHeight);
            cashoutArea.setPosition(rightX, rightY - cashoutHeight / 2, 0);
        }
    }

    private drawModalBg() {
        if (!this.modalBg) return;
        const gfx = this.modalBg.getComponent(Graphics) || this.modalBg.addComponent(Graphics);
        const size = this.modalBg.getComponent(UITransform)?.contentSize;
        if (!size) return;
        gfx.clear();
        gfx.fillColor = new Color(0, 0, 0, 170);
        gfx.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        gfx.fill();
    }

    private drawPanelBg() {
        if (!this.panelRoot) return;
        const gfx = this.panelRoot.getComponent(Graphics) || this.panelRoot.addComponent(Graphics);
        const size = this.panelRoot.getComponent(UITransform)?.contentSize;
        if (!size) return;
        this.drawRoundedRectGfx(gfx, size.width, size.height, 18, new Color(42, 34, 26, 245), new Color(20, 15, 10, 255), 3);

        const diceArea = this.panelRoot.getChildByName('DiceArea');
        if (diceArea) {
            const diceGfx = diceArea.getComponent(Graphics) || diceArea.addComponent(Graphics);
            const diceSize = diceArea.getComponent(UITransform)?.contentSize;
            if (diceSize) {
                this.drawRoundedRectGfx(
                    diceGfx,
                    diceSize.width,
                    diceSize.height,
                    14,
                    new Color(49, 35, 28, 245),
                    new Color(120, 90, 60, 200),
                    2
                );
            }
        }
        const topBar = this.panelRoot.getChildByName('TopBar');
        if (topBar) {
            const topGfx = topBar.getComponent(Graphics) || topBar.addComponent(Graphics);
            const topSize = topBar.getComponent(UITransform)?.contentSize;
            if (topSize) {
                this.drawRoundedRectGfx(
                    topGfx,
                    topSize.width,
                    topSize.height,
                    14,
                    new Color(48, 40, 32, 255),
                    new Color(20, 15, 10, 255),
                    2
                );
            }
        }
    }

    private drawButtonBg(node: Node | null, fill: Color, stroke?: Color) {
        if (!node) return;
        const gfx = node.getComponent(Graphics) || node.addComponent(Graphics);
        const size = node.getComponent(UITransform)?.contentSize;
        if (!size) return;
        gfx.clear();
        gfx.fillColor = fill;
        gfx.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, 8);
        gfx.fill();
        if (stroke) {
            gfx.strokeColor = stroke;
            gfx.lineWidth = 2;
            gfx.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, 8);
            gfx.stroke();
        }
    }

    private drawRoundedRectGfx(
        gfx: Graphics,
        width: number,
        height: number,
        radius: number,
        fill: Color,
        stroke?: Color,
        strokeWidth: number = 1
    ) {
        gfx.clear();
        gfx.fillColor = fill;
        gfx.roundRect(-width / 2, -height / 2, width, height, radius);
        gfx.fill();
        if (stroke) {
            gfx.strokeColor = stroke;
            gfx.lineWidth = strokeWidth;
            gfx.roundRect(-width / 2, -height / 2, width, height, radius);
            gfx.stroke();
        }
    }

    private ensureUITransform(node: Node, width?: number, height?: number): UITransform {
        const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
        if (width !== undefined && height !== undefined) {
            transform.setContentSize(width, height);
        }
        return transform;
    }

    private getOrCreateChild(parent: Node, name: string): Node {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new Node(name);
            parent.addChild(node);
        }
        return node;
    }

    private createLabelNode(
        parent: Node,
        name: string,
        text: string,
        fontSize: number,
        color: Color,
        width: number,
        height: number
    ): Label {
        const node = this.getOrCreateChild(parent, name);
        const label = node.getComponent(Label) || node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.max(fontSize + 2, Math.round(fontSize * 1.2));
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableWrapText = true;
        this.ensureUITransform(node, width, height);
        return label;
    }

    private createButtonNode(parent: Node, name: string, text: string, width: number, height: number) {
        const node = new Node(name);
        parent.addChild(node);
        this.ensureUITransform(node, width, height);
        const button = node.addComponent(Button);
        const labelNode = new Node('Label');
        node.addChild(labelNode);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 12;
        label.lineHeight = 14;
        label.color = new Color(245, 232, 210, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableWrapText = true;
        this.ensureUITransform(labelNode, width - 6, height - 4);
        labelNode.setPosition(0, 0, 0);
        this.drawButtonBg(node, new Color(70, 55, 40, 255), new Color(30, 20, 15, 255));
        return { node, button, label };
    }

    private playDicePulse() {
        this.diceLabels.forEach((label) => {
            const node = label.node;
            node.setScale(new Vec3(1, 1, 1));
            tween(node)
                .to(0.08, { scale: new Vec3(1.2, 1.2, 1) })
                .to(0.12, { scale: new Vec3(1, 1, 1) })
                .start();
        });
    }

    private randInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private shuffle<T>(list: T[]): T[] {
        const result = list.slice();
        for (let i = result.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}
