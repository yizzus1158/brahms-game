class Level1Scene extends Phaser.Scene {
    constructor() {
        super('Level1Scene');
    }

    preload() {
        this.load.spritesheet('brahms_joven', 'assets/img/brahms_joven_sheet.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.image('marinero', 'assets/img/marinero_idle.png');
        this.load.image('dueno', 'assets/img/dueno_idle.png');
        this.load.image('piano', 'assets/img/piano.png');
        
        this.load.audio('polka', 'assets/audio/polka_paisana.mp3');
        this.load.on('loaderror', (fileObj) => {
            if (fileObj && fileObj.key === 'polka') {
                console.warn('polka_paisana.mp3 no encontrado. El minijuego correrá sin audio.');
            }
        });
    }

    create() {
        // Color de fondo: taberna iluminada con luz cálida
        this.cameras.main.setBackgroundColor('#5e3a21'); // Luz cálida
        
        // Ventanas oscuras al fondo
        this.add.rectangle(400, 300, 150, 150, 0x111122).setAlpha(0.8);
        this.add.rectangle(1200, 300, 150, 150, 0x111122).setAlpha(0.8);
        
        this.levelWidth = 2400; // Nivel más largo para exploración
        this.physics.world.setBounds(0, 0, this.levelWidth, 600);
        this.cameras.main.setBounds(0, 0, this.levelWidth, 600);

        // Suelo principal
        this.platforms = this.physics.add.staticGroup();
        this.createPlatform(this.levelWidth / 2, 580, this.levelWidth, 40, 0x4a3022); 
        
        // Configurar el filtrado para pixel art (Nearest Neighbor)
        this.textures.get("brahms_joven").setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get("marinero").setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get("dueno").setFilter(Phaser.Textures.FilterMode.NEAREST);

        // Generar texturas de flechas para el minijuego
        this.generateArrowTextures();

        // Animaciones
        this.anims.create({
            key: 'brahms_idle',
            frames: [{ key: 'brahms_joven', frame: 0 }],
            frameRate: 10
        });

        this.anims.create({
            key: 'brahms_walk',
            frames: this.anims.generateFrameNumbers('brahms_joven', { start: 1, end: 2 }),
            frameRate: 8,
            repeat: -1
        });

        // Crear al Jugador (Joven Brahms - Sprite)
        this.player = this.physics.add.sprite(100, 560, 'brahms_joven').setOrigin(0.5, 1);
        this.player.setScale(3); // Escalar a 3x
        
        // Ajustar el collider para que el personaje se hunda un poco en el suelo
        // quitando los píxeles transparentes de la parte inferior
        this.player.body.setSize(16, 30);
        this.player.body.setOffset(8, 0);
        
        this.player.body.setCollideWorldBounds(true);
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
        this.physics.add.collider(this.player, this.platforms);

        // Controles de movimiento e interacción
        this.cursors = this.input.keyboard.createCursorKeys();
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // Inicializar Gestor de Diálogos
        this.dialogManager = new DialogManager(this);

        // Configuración de NPCs
        this.npcs = [];
        this.currentInteractableNPC = null;

        // 1. Trabajador del Puerto (lo removemos por ahora, dejamos solo marinero y dueño)

        // 2. Marinero Borracho
        this.createNPC(
            900, 560, 0x226622, 'Marinero (cliente de la taberna)',
            [
                "Eh, niño! Tú vas a tocar el piano?",
                "Más te vale que sepas algo alegre.",
                "Nada de esa música rara de iglesia, oíste?"
            ],
            false,
            'marinero' // Sprite real del marinero
        );

        // 3. Dueño de la Taberna
        this.createNPC(
            1600, 560, 0x663333, 'Hans (dueño de la taberna)',
            [
                "Así que tú eres el hijo de Johann Jakob.",
                "Tu padre me habló mucho de ti.",
                "El piano está al fondo. Toca lo que quieras, pero ten cuidado, esta gente bebe mucho.",
                "Si lo haces bien, hay unas monedas para ti."
            ],
            false,
            'dueno' // Usamos el sprite real
        );

        // 4. Piano al fondo (Meta Final)
        this.createNPC(
            2200, 582, 0x000000, 'Piano',
            [
                { name: "Johannes", text: "El piano de la taberna...", color: 0x8888ff },
                { name: "Johannes", text: "Es viejo, pero parece que aún suena bien.", color: 0x8888ff },
                { name: "Johannes", text: "Tengo que hacer mi trabajo. Por mi familia.", color: 0x8888ff },
                { 
                    name: "Johannes", 
                    text: "Tocar el piano?", 
                    color: 0x8888ff,
                    choices: ["Sí", "Aún no"],
                    onChoice: (index) => {
                        if (index === 0) { // Sí
                            this.iniciarMinijuegoPiano();
                        } else { // Aún no
                            this.scene.time.delayedCall(500, () => {
                                this.eIndicator.setVisible(true);
                            });
                        }
                    }
                }
            ],
            false, // Ya no usa el isGoal original, el callback lo maneja
            'piano',
            { x: 60, y: -90 } // Offset personalizado para que no tape al piano
        );

        // Indicador "E" flotante (contenedor)
        this.eIndicator = this.add.container(0, 0);
        this.eIndicator.setDepth(100);
        
        const eBg = this.add.rectangle(0, 0, 24, 24, 0x000000, 0.7);
        eBg.setStrokeStyle(2, 0xffffff);
        const eText = this.add.text(0, 0, 'E', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#ffff00'
        }).setOrigin(0.5);
        
        this.eInner = this.add.container(0, 0, [eBg, eText]);
        this.eIndicator.add(this.eInner);
        this.eIndicator.setVisible(false);
        
        // Animación suave para el contenido interno
        this.tweens.add({
            targets: this.eInner,
            y: -8,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    createPlatform(x, y, width, height, color) {
        let plat = this.add.rectangle(x, y, width, height, color);
        this.physics.add.existing(plat, true);
        this.platforms.add(plat);
    }

    createNPC(x, y, color, name, dialogLines, isGoal = false, spriteKey = null, indicatorOffset = {x: 35, y: -70}) {
        let npc;
        
        if (spriteKey) {
            // Usar sprite si se proporciona
            npc = this.physics.add.sprite(x, y, spriteKey).setOrigin(0.5, 1);
            npc.setScale(3); // Escala 3x
            // Ajustar body para no flotar
            npc.body.setSize(npc.width, npc.height - 2);
            npc.body.setOffset(0, 0);
        } else {
            // Personaje base (placeholder)
            npc = this.add.rectangle(x, y, 32, 48, color).setOrigin(0.5, 1);
            
            // Si es el piano, lo hacemos más ancho y bajito
            if (isGoal) {
                npc.width = 60;
                npc.height = 40;
                npc.y = y; // ajustar al piso
            }
        }
        
        this.physics.add.existing(npc, true);

        // Hacer que el piano sea sólido para el jugador y no colisione con el suelo
        if (name === 'Piano') {
            npc.body.setImmovable(true);
            npc.body.setAllowGravity(false);
            this.physics.add.collider(this.player, npc);
            npc.body.updateFromGameObject();
        } else {
            this.physics.add.collider(npc, this.platforms);
        }

        // Guardar la data narrativa en el objeto
        npc.npcData = {
            name: name,
            color: color,
            lines: dialogLines,
            isGoal: isGoal,
            indicatorOffset: indicatorOffset
        };

        this.npcs.push(npc);
    }

    update() {
        // 1. Si hay un diálogo activo, el jugador no puede moverse.
        if (this.dialogManager.isActive) {
            this.player.body.setVelocityX(0);
            this.eIndicator.setVisible(false);
            return;
        }

        // 2. Movimiento normal
        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-200);
            this.player.setFlipX(true);
            this.player.anims.play('brahms_walk', true);
        } else if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(200);
            this.player.setFlipX(false);
            this.player.anims.play('brahms_walk', true);
        } else {
            this.player.body.setVelocityX(0);
            this.player.anims.play('brahms_idle', true);
        }

        // 3. Revisar si hay un NPC cerca
        this.checkNPCProximity();

        // 4. Iniciar diálogo si presiona E
        if (Phaser.Input.Keyboard.JustDown(this.interactKey) && this.currentInteractableNPC) {
            this.iniciarDialogo(this.currentInteractableNPC);
        }

        // 5. Cleanup de notas del minijuego
        if (this.minigameActive) {
            for (let i = this.mgNotes.length - 1; i >= 0; i--) {
                let note = this.mgNotes[i];
                if (note.y > 550) { // Salió de la pantalla por debajo
                    note.destroy();
                    this.mgNotes.splice(i, 1);
                    this.showFeedback("Fallo", '#ff0000');
                    this.mgApproval -= 5;
                    this.updateApprovalBar();
                }
            }
        }
    }

    checkNPCProximity() {
        let closestNPC = null;
        let minDistance = 120; // Aumentado para detectar el piano aunque la colisión bloquee de lejos

        for (let npc of this.npcs) {
            // Calculamos distancia al centro del NPC
            let dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y - (npc.height/2));
            if (dist < minDistance) {
                closestNPC = npc;
                break;
            }
        }

        this.currentInteractableNPC = closestNPC;

        if (closestNPC) {
            let offset = closestNPC.npcData.indicatorOffset;
            let targetX = closestNPC.x + offset.x;
            let targetY = closestNPC.y + offset.y; 
            this.eIndicator.setPosition(targetX, targetY);
            this.eIndicator.setVisible(true);
        } else {
            this.eIndicator.setVisible(false);
        }
    }

    iniciarDialogo(npc) {
        let data = npc.npcData;
        
        // Ocultar la E mientras hablan
        this.eIndicator.setVisible(false);
        this.currentInteractableNPC = null; 

        // Iniciar el gestor solo si hay líneas
        if (data.lines && data.lines.length > 0) {
            this.dialogManager.startDialog(data.name, data.color, data.lines, () => {
                // El isGoal se ha dejado de usar para el piano (lo maneja su callback), pero lo dejamos por si acaso
                if (data.isGoal) {
                    this.cameras.main.fade(1000, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        this.scene.start('MenuScene'); 
                    });
                }
            });
        } else {
            // Si no tiene líneas, simplemente restablecemos
            this.scene.time.delayedCall(500, () => {
                this.eIndicator.setVisible(true);
            });
        }
    }

    generateArrowTextures() {
        let g = this.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.lineStyle(2, 0x000000, 1);
        
        g.beginPath();
        g.moveTo(24, 4); 
        g.lineTo(44, 24); 
        g.lineTo(32, 24); 
        g.lineTo(32, 44); 
        g.lineTo(16, 44); 
        g.lineTo(16, 24); 
        g.lineTo(4, 24);  
        g.closePath();
        g.fillPath();
        g.strokePath();
        g.generateTexture('arrow_base', 48, 48);
        g.destroy();
        
        let gr = this.add.graphics();
        gr.lineStyle(4, 0x888888, 1);
        gr.beginPath();
        gr.moveTo(24, 4); 
        gr.lineTo(44, 24); 
        gr.lineTo(32, 24); 
        gr.lineTo(32, 44); 
        gr.lineTo(16, 44); 
        gr.lineTo(16, 24); 
        gr.lineTo(4, 24);  
        gr.closePath();
        gr.strokePath();
        gr.generateTexture('arrow_receptor', 48, 48);
        gr.destroy();
    }

    iniciarMinijuegoPiano() {
        this.dialogManager.isActive = true; 
        this.eIndicator.setVisible(false);
        this.player.body.setVelocityX(0);
        this.player.anims.play('brahms_idle', true);

        this.minigameActive = true;
        this.minigameScore = 0;
        this.minigameTotalNotes = 0;
        this.minigameHitNotes = 0;
        this.mgApproval = 50; 
        this.mgPaused = false;
        this.mgIsFadingOut = false;
        
        this.mgContainer = this.add.container(this.cameras.main.scrollX, 0);
        this.mgContainer.setDepth(200);

        let bg = this.add.rectangle(0, 0, this.levelWidth, 600, 0x000000, 0.85).setOrigin(0, 0);
        this.mgContainer.add(bg);

        this.mgScoreText = this.add.text(400, 50, "Puntos: 0", {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.mgContainer.add(this.mgScoreText);

        this.mgFeedbackText = this.add.text(400, 250, "", {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            fill: '#ffff00'
        }).setOrigin(0.5);
        this.mgContainer.add(this.mgFeedbackText);

        let infoText = this.add.text(400, 550, "Usa Flechas o WASD\nESC para salir - P para pausar", {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            fill: '#aaaaaa',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);
        this.mgContainer.add(infoText);

        this.mgApprovalBarBg = this.add.rectangle(400, 90, 400, 20, 0x444444).setOrigin(0.5);
        this.mgApprovalBar = this.add.rectangle(200, 90, 200, 20, 0x00ff00).setOrigin(0, 0.5);
        this.mgContainer.add([this.mgApprovalBarBg, this.mgApprovalBar]);

        this.receptors = [];
        const startX = 250;
        const spacing = 100;
        const targetY = 450;
        const colors = [0xff00ff, 0x00ffff, 0x00ff00, 0xff0000];
        const angles = [-90, 180, 0, 90]; 

        for (let i = 0; i < 4; i++) {
            let r = this.add.sprite(startX + (i * spacing), targetY, 'arrow_receptor');
            r.setAngle(angles[i]);
            r.dirIndex = i;
            this.mgContainer.add(r);
            this.receptors.push(r);
        }

        this.mgNotes = [];

        this.mgMusic = this.sound.add('polka');
        this.mgMusic.play({ volume: 1 });
        
        let duration = 30000; 
        if (this.mgMusic.duration) {
            duration = this.mgMusic.duration * 1000;
        }

        const pattern = [0, 2, 1, 3, 1, 2, 0, 3];
        let patternIdx = 0;
        
        this.mgSpawnTimer = this.time.addEvent({
            delay: 600,
            callback: () => {
                if (this.mgPaused || !this.minigameActive || this.mgIsFadingOut) return;
                let dir = pattern[patternIdx];
                patternIdx = (patternIdx + 1) % pattern.length;
                this.spawnNote(dir, startX + (dir * spacing), angles[dir], colors[dir]);
            },
            loop: true
        });

        // A los 8 segundos iniciamos el fade out de 2 segundos (Total: 10 segundos)
        this.mgFadeTimer = this.time.delayedCall(8000, () => {
            if(this.minigameActive && !this.mgPaused) {
                this.iniciarFadeOutMinijuego();
            }
        });

        this.input.keyboard.on('keydown', this.handleMinigameInput, this);
    }

    iniciarFadeOutMinijuego() {
        this.mgIsFadingOut = true;
        if (this.mgSpawnTimer) this.mgSpawnTimer.remove();
        
        // Fade out de la música
        if (this.mgMusic && this.mgMusic.isPlaying) {
            this.tweens.add({
                targets: this.mgMusic,
                volume: 0,
                duration: 2000
            });
        }

        // Fade out de las notas en pantalla
        this.mgNotes.forEach(note => {
            this.tweens.add({
                targets: note,
                alpha: 0,
                duration: 2000
            });
        });

        // Pantalla negra gradualmente (fade out visual)
        this.mgFadeOverlay = this.add.rectangle(this.cameras.main.scrollX, 0, this.levelWidth, 600, 0x000000).setOrigin(0,0).setAlpha(0);
        this.mgFadeOverlay.setDepth(300); // Encima de mgContainer
        
        this.tweens.add({
            targets: this.mgFadeOverlay,
            alpha: 1, 
            duration: 2000,
            onComplete: () => {
                if(this.minigameActive) this.finalizarMinijuego();
            }
        });
    }

    spawnNote(dir, x, angle, color) {
        let note = this.physics.add.sprite(x, -50, 'arrow_base');
        note.setAngle(angle);
        note.setTint(color);
        note.dirIndex = dir;
        note.body.setVelocityY(150); 
        
        this.mgContainer.add(note);
        this.mgNotes.push(note);
        this.minigameTotalNotes++;
    }

    handleMinigameInput(event) {
        if (!this.minigameActive) return;

        if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.ESC) {
            this.cancelarMinijuego();
            return;
        }

        if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.P) {
            if (this.mgIsFadingOut) return; // No pausar durante la transición cinematográfica final
            
            this.mgPaused = !this.mgPaused;
            if (this.mgPaused) {
                if (this.mgMusic.isPlaying) this.mgMusic.pause();
                this.mgSpawnTimer.paused = true;
                if (this.mgFadeTimer) this.mgFadeTimer.paused = true;
                this.mgNotes.forEach(n => n.body.setVelocityY(0));
                this.showFeedback("PAUSA", '#ffffff');
            } else {
                if (this.mgMusic.isPaused) this.mgMusic.resume();
                this.mgSpawnTimer.paused = false;
                if (this.mgFadeTimer) this.mgFadeTimer.paused = false;
                this.mgNotes.forEach(n => n.body.setVelocityY(150));
                this.mgFeedbackText.setAlpha(0);
            }
            return;
        }

        if (this.mgPaused) return;

        let dirPressed = -1;
        if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.LEFT || event.keyCode === Phaser.Input.Keyboard.KeyCodes.A) dirPressed = 0;
        if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.DOWN || event.keyCode === Phaser.Input.Keyboard.KeyCodes.S) dirPressed = 1;
        if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.UP || event.keyCode === Phaser.Input.Keyboard.KeyCodes.W) dirPressed = 2;
        if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.RIGHT || event.keyCode === Phaser.Input.Keyboard.KeyCodes.D) dirPressed = 3;

        if (dirPressed !== -1) {
            this.checkHit(dirPressed);
        }
    }

    checkHit(dirIndex) {
        let targetY = 450;
        let bestNote = null;
        let minDiff = 1000;

        for (let i = 0; i < this.mgNotes.length; i++) {
            let note = this.mgNotes[i];
            if (note.dirIndex === dirIndex && note.active !== false) {
                let diff = Math.abs(note.y - targetY);
                if (diff < minDiff && diff < 80) { 
                    minDiff = diff;
                    bestNote = note;
                }
            }
        }

        let rec = this.receptors[dirIndex];
        rec.setTint(0xaaaaaa);
        this.time.delayedCall(100, () => rec.clearTint());

        if (bestNote) {
            bestNote.active = false;
            bestNote.destroy();
            this.mgNotes = this.mgNotes.filter(n => n !== bestNote);
            this.minigameHitNotes++;

            if (minDiff < 30) {
                this.showFeedback("¡Perfecto!", '#00ff00');
                this.minigameScore += 100;
                this.mgApproval += 5;
            } else {
                this.showFeedback("¡Bien!", '#00ffff');
                this.minigameScore += 50;
                this.mgApproval += 2;
            }
        } else {
            this.mgApproval -= 2;
        }

        this.updateApprovalBar();
    }

    showFeedback(text, colorStr) {
        this.mgFeedbackText.setText(text);
        this.mgFeedbackText.setColor(colorStr);
        this.mgFeedbackText.setAlpha(1);
        this.mgScoreText.setText("Puntos: " + this.minigameScore);
        
        if (this.mgFeedbackTween) this.mgFeedbackTween.stop();
        this.mgFeedbackText.y = 280;
        this.mgFeedbackTween = this.tweens.add({
            targets: this.mgFeedbackText,
            alpha: 0,
            y: 250,
            duration: 500
        });
    }

    updateApprovalBar() {
        if (this.mgApproval > 100) this.mgApproval = 100;
        if (this.mgApproval < 0) this.mgApproval = 0;
        
        let percentage = this.mgApproval / 100;
        this.mgApprovalBar.width = 400 * percentage;
        
        if (this.mgApproval > 60) this.mgApprovalBar.fillColor = 0x00ff00;
        else if (this.mgApproval > 30) this.mgApprovalBar.fillColor = 0xffff00;
        else this.mgApprovalBar.fillColor = 0xff0000;
    }

    cancelarMinijuego() {
        this.input.keyboard.off('keydown', this.handleMinigameInput, this);
        this.minigameActive = false;
        if (this.mgMusic) this.mgMusic.stop();
        if (this.mgSpawnTimer) this.mgSpawnTimer.remove();
        if (this.mgFadeTimer) this.mgFadeTimer.remove();
        if (this.mgContainer) this.mgContainer.destroy();
        if (this.mgFadeOverlay) this.mgFadeOverlay.destroy();
        
        this.dialogManager.isActive = false;
        this.time.delayedCall(500, () => {
            this.eIndicator.setVisible(true);
        });
    }

    finalizarMinijuego() {
        this.input.keyboard.off('keydown', this.handleMinigameInput, this);
        this.minigameActive = false;
        if (this.mgSpawnTimer) this.mgSpawnTimer.remove();
        if (this.mgFadeTimer) this.mgFadeTimer.remove();
        if (this.mgMusic && this.mgMusic.isPlaying) this.mgMusic.stop();

        let percentage = 0;
        if (this.minigameTotalNotes > 0) {
            percentage = (this.minigameHitNotes / this.minigameTotalNotes) * 100;
        }

        let feedbackMsg = "";
        if (percentage >= 80) feedbackMsg = "¡La taberna estalla en aplausos!";
        else if (percentage >= 50) feedbackMsg = "El público aplaude educadamente.";
        else feedbackMsg = "El público parece confundido, pero aplauden de todas formas.";

        // Destruimos la UI subyacente del minijuego (el fondo, los puntos, flechas)
        if (this.mgContainer) this.mgContainer.destroy();
        
        // Creamos el texto de feedback y lo ponemos sobre la pantalla que ya está en negro puro
        let fbText = this.add.text(this.cameras.main.scrollX + 400, 300, feedbackMsg, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: '#ffffff',
            align: 'center',
            wordWrap: { width: 600 }
        }).setOrigin(0.5);
        fbText.setDepth(301);

        // Mostrar por 3 segundos, luego fade cruzado in hacia la taberna
        this.time.delayedCall(3000, () => {
            fbText.destroy();
            
            // Si por algún motivo mgFadeOverlay se perdió, creamos uno temporal
            if (!this.mgFadeOverlay) {
                this.mgFadeOverlay = this.add.rectangle(this.cameras.main.scrollX, 0, this.levelWidth, 600, 0x000000).setOrigin(0,0).setAlpha(1);
                this.mgFadeOverlay.setDepth(300);
            }

            this.tweens.add({
                targets: this.mgFadeOverlay,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    this.mgFadeOverlay.destroy();
                    this.lanzarDialogoFinal();
                }
            });
        });
    }

    lanzarDialogoFinal() {
        let lineasFinales = [
            { name: "Hans (dueño de la taberna)", text: "Lo hiciste bien, niño. Toma, te lo has ganado.", color: 0x663333 },
            { name: "Johannes", text: "Gracias, señor. Mi familia se lo agradece.", color: 0x8888ff }
        ];

        this.dialogManager.startDialog("Dueño", 0x663333, lineasFinales, () => {
            this.mostrarCartelNivelCompletado();
        });
    }

    mostrarCartelNivelCompletado() {
        let cartel = this.add.rectangle(this.cameras.main.scrollX, 0, this.levelWidth, 600, 0x000000).setOrigin(0, 0);
        cartel.setDepth(400);
        cartel.setAlpha(0);

        let textoFinal = this.add.text(this.cameras.main.scrollX + 400, 300, 
            "Brahms ganó sus primeras monedas como músico profesional.\n\nPero el destino tenía planes más grandes para él...", {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 10,
            wordWrap: { width: 600 }
        }).setOrigin(0.5);
        textoFinal.setDepth(400);
        textoFinal.setAlpha(0);

        this.tweens.add({
            targets: [cartel, textoFinal],
            alpha: 1,
            duration: 1500,
            onComplete: () => {
                this.time.delayedCall(4000, () => {
                    let textCompletado = this.add.text(this.cameras.main.scrollX + 400, 500, "Nivel 1 Completado", {
                        fontFamily: '"Press Start 2P"',
                        fontSize: '24px',
                        fill: '#ffff00',
                        align: 'center'
                    }).setOrigin(0.5);
                    textCompletado.setDepth(400);
                    
                    this.time.delayedCall(2000, () => {
                        this.cameras.main.fade(1000, 0, 0, 0);
                        this.cameras.main.once('camerafadeoutcomplete', () => {
                            this.scene.start('MenuScene'); 
                        });
                    });
                });
            }
        });
    }
}
