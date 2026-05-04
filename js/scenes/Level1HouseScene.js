class Level1HouseScene extends Phaser.Scene {
    constructor() {
        super('Level1HouseScene');
    }

    preload() {
        this.load.spritesheet('brahms_joven', 'assets/img/brahms_joven_sheet.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        // Cargar el sprite del padre
        this.load.image('padre', 'assets/img/padre_idle.png');
    }

    create() {
        // Fondo: interior casa humilde (marrón oscuro)
        this.cameras.main.setBackgroundColor('#2d1b14');
        
        this.levelWidth = 800; // Nivel pequeño
        this.physics.world.setBounds(0, 0, this.levelWidth, 600);
        this.cameras.main.setBounds(0, 0, this.levelWidth, 600);

        // Suelo principal (Madera)
        this.platforms = this.physics.add.staticGroup();
        this.createPlatform(this.levelWidth / 2, 580, this.levelWidth, 40, 0x4a3022); 

        // Decoración básica: ventana y mesa
        // Ventana
        this.add.rectangle(600, 350, 100, 120, 0x1a1a2e).setStrokeStyle(4, 0x222222);
        // Mesa
        let mesa = this.add.rectangle(600, 540, 120, 40, 0x3e2723).setOrigin(0.5, 1);
        mesa.setDepth(-1);

        this.textures.get("brahms_joven").setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get("padre").setFilter(Phaser.Textures.FilterMode.NEAREST);

        if (!this.anims.exists('brahms_idle')) {
            this.anims.create({
                key: 'brahms_idle',
                frames: [{ key: 'brahms_joven', frame: 0 }],
                frameRate: 10
            });
        }
        if (!this.anims.exists('brahms_walk')) {
            this.anims.create({
                key: 'brahms_walk',
                frames: this.anims.generateFrameNumbers('brahms_joven', { start: 1, end: 2 }),
                frameRate: 8,
                repeat: -1
            });
        }

        // Jugador
        this.player = this.physics.add.sprite(100, 560, 'brahms_joven').setOrigin(0.5, 1);
        this.player.setScale(3);
        this.player.body.setSize(16, 30);
        this.player.body.setOffset(8, 0);
        this.player.body.setCollideWorldBounds(true);
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
        this.physics.add.collider(this.player, this.platforms);

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.dialogManager = new DialogManager(this);

        this.npcs = [];
        this.currentInteractableNPC = null;

        // Padre
        this.createNPC(
            450, 560, 0x555555, 'Johann Jakob (padre de Johannes)',
            [
                "Johannes... hijo, ven aquí.", 
                "Sé que solo tienes trece años, pero... necesitamos el dinero.", 
                "Esta noche tocarás en la taberna del puerto.",
                "Toca lo que quieran oír. Marineros, borrachos... a ellos no les importa Bach.",
                "Hazlo por tu madre. Por todos nosotros.",
                { name: "Johannes", text: "...Sí, padre. Lo haré.", color: 0x8888ff }
            ],
            true,
            'padre' // Pasamos el sprite key
        );

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
            npc = this.physics.add.sprite(x, y, spriteKey).setOrigin(0.5, 1);
            npc.setScale(3); // Escalar 3x como indicó el usuario
            npc.body.setSize(npc.width, npc.height - 2);
            npc.body.setOffset(0, 0);
        } else {
            npc = this.add.rectangle(x, y, 32, 48, color).setOrigin(0.5, 1);
            this.physics.add.existing(npc, true);
        }
        
        this.physics.add.collider(npc, this.platforms);

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
        if (this.dialogManager.isActive) {
            this.player.body.setVelocityX(0);
            this.eIndicator.setVisible(false);
            return;
        }

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

        this.checkNPCProximity();

        if (Phaser.Input.Keyboard.JustDown(this.interactKey) && this.currentInteractableNPC) {
            this.iniciarDialogo(this.currentInteractableNPC);
        }
    }

    checkNPCProximity() {
        let closestNPC = null;
        let minDistance = 80;

        for (let npc of this.npcs) {
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
        this.eIndicator.setVisible(false);
        this.currentInteractableNPC = null; 

        this.dialogManager.startDialog(data.name, data.color, data.lines, () => {
            if (data.isGoal) {
                // Fade out a negro por 2 segundos
                this.cameras.main.fade(2000, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    // Pasar a la escena de transición
                    this.scene.start('TransitionScene');
                });
            }
        });
    }
}
