import { _decorator, Color, Component, Label, Node, Sprite } from 'cc';
import { getWorldMapConfig, WorldMapId } from '../Data/WorldRuntimeConfig';
import { WorldProgressManager } from '../Manager/WorldProgressManager';

const { ccclass } = _decorator;

@ccclass('LocationRuntimeController')
export class LocationRuntimeController extends Component {
    onLoad() {
        const manager = WorldProgressManager.ensureInstance();
        const currentLocation = manager.progress.currentMapId as WorldMapId;
        this.applySceneTheme(currentLocation);
    }

    private applySceneTheme(locationId: WorldMapId): void {
        const config = getWorldMapConfig(locationId);
        if (!config) return;

        const bg = this.findBackgroundNode();
        if (bg) {
            const sp = bg.getComponent(Sprite) || bg.addComponent(Sprite);
            sp.color = new Color(config.visualProfile.bgTint.r, config.visualProfile.bgTint.g, config.visualProfile.bgTint.b, 255);
        }

        const titleNode = this.node.getChildByName('LocationHint') || new Node('LocationHint');
        if (!titleNode.parent) this.node.addChild(titleNode);
        const lbl = titleNode.getComponent(Label) || titleNode.addComponent(Label);
        lbl.string = `📍 当前地图：${config.mapName}`;
        lbl.fontSize = 22;
        lbl.color = new Color(255, 250, 220, 255);
        titleNode.setPosition(-460, 320, 0);
    }

    private findBackgroundNode(): Node | null {
        const names = ['Background', 'Bg', 'BG', 'MainBg'];
        for (const name of names) {
            const node = this.node.getChildByName(name);
            if (node) return node;
        }
        return null;
    }
}
