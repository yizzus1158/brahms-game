class TransitionScene extends Phaser.Scene {
    constructor() {
        super('TransitionScene');
    }

    create() {
        // Pantalla en negro
        this.cameras.main.setBackgroundColor('#000000');
        
        // El texto que aparecerá
        const text = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            "Esa misma noche, en la taberna del puerto...",
            {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                fill: '#ffffff',
                align: 'center',
                wordWrap: { width: 600 }
            }
        ).setOrigin(0.5);
        text.setAlpha(0);

        // Timeline de transición:
        // 1. Esperar 1 segundo en negro
        // 2. Aparece el texto (fade in)
        // 3. Esperar 2.5 segundos
        // 4. Desaparece el texto y pasamos a Level1Scene
        
        this.time.delayedCall(1000, () => {
            this.tweens.add({
                targets: text,
                alpha: 1,
                duration: 1000, // 1 segundo para aparecer
                onComplete: () => {
                    this.time.delayedCall(2500, () => {
                        this.tweens.add({
                            targets: text,
                            alpha: 0,
                            duration: 1000,
                            onComplete: () => {
                                this.scene.start('Level1Scene');
                            }
                        });
                    });
                }
            });
        });
    }
}
