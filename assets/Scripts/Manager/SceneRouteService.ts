import { director } from 'cc';

export class SceneRouteService {
    public static readonly SCENES = {
        mainMenu: 'MainMenu',
        shop: 'ShopScene',
        prep: 'ProcessingScene',
        business: 'Level1CookingScene',
        minigameFactory: 'FactoryScene'
    } as const;

    private static load(sceneName: string): void {
        director.loadScene(sceneName);
    }

    public static goMainMenu(): void {
        this.load(this.SCENES.mainMenu);
    }

    public static goShop(): void {
        this.load(this.SCENES.shop);
    }

    public static goPrep(): void {
        this.load(this.SCENES.prep);
    }

    public static goBusiness(): void {
        this.load(this.SCENES.business);
    }

    public static goMinigameFactory(): void {
        this.load(this.SCENES.minigameFactory);
    }
}
