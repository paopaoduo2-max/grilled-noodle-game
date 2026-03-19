import { AudioManager } from '../../Utils/AudioManager';
import { AudioConfig } from '../../Config/AudioConfig';

export class AudioPort {
    private get audio(): AudioManager | null {
        return AudioManager.Instance || null;
    }

    public playPlace(): void {
        this.audio?.playCookingSound('PLACE_INGREDIENT');
    }

    public playSauce(): void {
        this.audio?.playCookingSound('BRUSH_SAUCE');
    }

    public playSpice(): void {
        this.audio?.playCookingSound('SPRINKLE');
    }

    public playServe(): void {
        this.audio?.playCookingSound('SERVE');
    }

    public playButtonClick(): void {
        this.audio?.playSFX(AudioConfig.SFX_UI.BUTTON_CLICK);
    }
}
