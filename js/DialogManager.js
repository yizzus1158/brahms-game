class DialogManager {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        
        // Contenedor principal UI
        this.container = this.scene.add.container(0, 0).setScrollFactor(0);
        this.container.setDepth(1000); // Asegurarse de que esté por encima de todo
        this.container.setVisible(false);

        const width = this.scene.sys.game.config.width;
        const height = this.scene.sys.game.config.height;

        // Caja negra con borde blanco
        const boxHeight = 150;
        const boxY = height - boxHeight - 20;
        this.bg = this.scene.add.rectangle(width/2, boxY + boxHeight/2, width - 40, boxHeight, 0x000000);
        this.bg.setStrokeStyle(4, 0xffffff);
        this.container.add(this.bg);

        // Retrato (cuadro de fondo)
        this.portraitBg = this.scene.add.rectangle(80, boxY + boxHeight/2, 100, 100, 0x222222);
        this.portraitBg.setStrokeStyle(2, 0xffffff);
        this.container.add(this.portraitBg);

        // Sprite del retrato (Busto)
        // Shifteamos el Y en +30 para compensar el origin interno de Phaser tras aplicar setCrop, 
        // logrando que el busto quede anclado a la parte inferior del recuadro (sin huecos abajo).
        this.portraitSprite = this.scene.add.sprite(80, boxY + boxHeight/2 + 30, 'brahms_joven');
        this.portraitSprite.setScale(5); // Escala 5x (20px * 5 = 100px)
        this.portraitSprite.setCrop(6, 0, 20, 20); // Recorte centrado de la parte superior (cabeza y torso)
        this.container.add(this.portraitSprite);

        // Texto del nombre
        this.nameText = this.scene.add.text(150, boxY + 20, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#ffff00'
        });
        this.container.add(this.nameText);

        // Texto del diálogo
        this.dialogText = this.scene.add.text(150, boxY + 50, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            fill: '#ffffff',
            wordWrap: { width: width - 200 }
        });
        this.container.add(this.dialogText);

        // Indicador de avance (?)
        this.indicator = this.scene.add.text(width - 50, boxY + boxHeight - 30, '?', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#ffffff'
        });
        this.container.add(this.indicator);
        this.indicator.setVisible(false);

        // Animación de parpadeo para el indicador
        this.scene.tweens.add({
            targets: this.indicator,
            alpha: 0,
            duration: 400,
            yoyo: true,
            repeat: -1
        });

        // Controles de diálogo
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.leftKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        
        this.lines = [];
        this.currentLineIndex = 0;
        this.isTyping = false;
        this.typeTimer = null;
        this.onCompleteCallback = null;

        // Estado para elecciones
        this.isAwaitingChoice = false;
        this.currentChoices = null;
        this.selectedChoiceIndex = 0;

        // Escuchar teclas
        this.spaceKey.on('down', () => this.handleInput());
        this.leftKey.on('down', () => this.handleChoiceMove(-1));
        this.rightKey.on('down', () => this.handleChoiceMove(1));
    }

    startDialog(name, portraitColor, lines, onComplete) {
        if (this.isActive) return;
        
        // Protección: Si no hay líneas de diálogo, terminar de inmediato.
        if (!lines || lines.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        this.isActive = true;
        this.lines = lines;
        this.currentLineIndex = 0;
        this.onCompleteCallback = onComplete;
        
        this.defaultName = name;
        this.nameText.setText(name);
        this.container.setVisible(true);

        // Limpiar para prevenir que se presione espacio residual
        this.spaceKey.reset(); 
        
        this.showLine();
    }

    showLine() {
        this.isTyping = true;
        this.indicator.setVisible(false);
        this.dialogText.setText('');
        
        const lineData = this.lines[this.currentLineIndex];
        let line = "";
        let currentName = "";
        
        if (typeof lineData === 'string') {
            line = lineData;
            currentName = this.defaultName;
        } else {
            line = lineData.text;
            currentName = lineData.name || this.defaultName;
        }

        this.nameText.setText(currentName);

        // Mapear el nombre al sprite correspondiente
        let spriteKey = null;
        if (currentName.includes('Johann Jakob')) spriteKey = 'padre';
        else if (currentName.includes('Johannes')) spriteKey = 'brahms_joven';
        else if (currentName.includes('Marinero')) spriteKey = 'marinero';
        else if (currentName.includes('Hans') || currentName.includes('Dueño')) spriteKey = 'dueno';

        if (spriteKey) {
            this.portraitSprite.setTexture(spriteKey);
            this.portraitSprite.setVisible(true);
            if (spriteKey === 'brahms_joven') {
                this.portraitSprite.setFrame(0); // Frame de idle
            }
            // Asegurar que use pixel art
            this.scene.textures.get(spriteKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
            
            // Re-aplicar crop por si el cambio de textura lo resetea
            this.portraitSprite.setCrop(6, 0, 20, 20);
        } else {
            this.portraitSprite.setVisible(false);
        }

        let charIndex = 0;

        this.typeTimer = this.scene.time.addEvent({
            delay: 40, // Velocidad del typewriter
            callback: () => {
                this.dialogText.text += line[charIndex];
                charIndex++;
                
                // Simulación visual de sonido (Aquí irá el blip de audio)
                
                if (charIndex === line.length) {
                    this.finishTyping();
                }
            },
            repeat: line.length - 1
        });
    }

    finishTyping() {
        if (this.typeTimer) this.typeTimer.remove();
        const lineData = this.lines[this.currentLineIndex];
        const line = typeof lineData === 'string' ? lineData : lineData.text;
        
        if (typeof lineData !== 'string' && lineData.choices) {
            this.isAwaitingChoice = true;
            this.currentChoices = lineData.choices;
            this.selectedChoiceIndex = 0;
            this.updateChoicesText(line);
            this.indicator.setVisible(false); // Ocultar flecha
        } else {
            this.dialogText.setText(line);
            this.isTyping = false;
            this.indicator.setVisible(true);
        }
    }

    updateChoicesText(baseText) {
        let text = baseText + "\n\n";
        this.currentChoices.forEach((choice, index) => {
            if (index === this.selectedChoiceIndex) {
                text += "[ " + choice + " ]   ";
            } else {
                text += "  " + choice + "     ";
            }
        });
        this.dialogText.setText(text);
        this.isTyping = false;
    }

    handleChoiceMove(dir) {
        if (!this.isActive || !this.isAwaitingChoice) return;
        this.selectedChoiceIndex += dir;
        if (this.selectedChoiceIndex < 0) this.selectedChoiceIndex = this.currentChoices.length - 1;
        if (this.selectedChoiceIndex >= this.currentChoices.length) this.selectedChoiceIndex = 0;
        
        const lineData = this.lines[this.currentLineIndex];
        this.updateChoicesText(lineData.text);
    }

    handleInput() {
        if (!this.isActive) return;

        if (this.isAwaitingChoice) {
            const lineData = this.lines[this.currentLineIndex];
            this.isAwaitingChoice = false;
            
            // Cerrar el diálogo primero para evitar conflictos
            this.closeDialog();
            
            if (lineData.onChoice) {
                lineData.onChoice(this.selectedChoiceIndex);
            }
            return;
        }

        if (this.isTyping) {
            // Saltarse la animación y mostrar todo el texto
            this.finishTyping();
        } else {
            // Avanzar a la siguiente línea
            this.currentLineIndex++;
            if (this.currentLineIndex < this.lines.length) {
                this.showLine();
            } else {
                this.closeDialog();
            }
        }
    }

    closeDialog() {
        this.isActive = false;
        this.container.setVisible(false);
        
        // Añadir un pequeño retraso antes de devolver el control para evitar saltos o re-interacciones
        this.scene.time.delayedCall(100, () => {
            if (this.onCompleteCallback) {
                this.onCompleteCallback();
            }
        });
    }
}
