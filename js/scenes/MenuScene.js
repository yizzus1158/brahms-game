class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        // En el futuro aquí cargaremos imágenes de fondo, música (Wiegenlied), etc.
        // Por ahora cargaremos assets gráficos temporales o dibujaremos directamente.
    }

    create() {
        // Obtenemos el ancho y alto de la pantalla para centrar elementos
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        // Color de fondo para dar un ambiente cálido/romántico (color vino tinto oscuro)
        this.cameras.main.setBackgroundColor('#2c0c14');

        // Título del juego
        this.add.text(width / 2, height / 3 - 50, 'Johannes Brahms', {
            fontFamily: '"Press Start 2P"', // Fuente pixel art
            fontSize: '24px',
            fill: '#f0d8a8', // Color crema/dorado
            align: 'center',
            lineSpacing: 15
        }).setOrigin(0.5);

        // Nombres del equipo (abajo a la izquierda)
        const teamText = 'Ludovico Ñáñez, Mathias Hospedales, Santiago Reyes,\nJosecarlo DeFreitas, Themis Martínez y Jesús Zapata';
        this.add.text(10, height - 30, teamText, {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px', // Texto más pequeño para los créditos
            fill: '#aaaaaa',
            lineSpacing: 5
        }).setOrigin(0, 1);

        // Crear botones interactivos
        this.createButton(width / 2, height / 2 + 30, 'Jugar', () => {
            console.log('Iniciar Nivel 1...');
            this.scene.start('Level1HouseScene'); // Transición a la Fase 2 (Casa primero)
        });
    }

    // Función auxiliar para crear botones
    createButton(x, y, text, onClick) {
        // Fondo del botón (rectángulo)
        const btnBg = this.add.rectangle(x, y, 250, 50, 0x4a3022)
            .setInteractive()
            .setOrigin(0.5);

        // Borde del botón (stroke)
        btnBg.setStrokeStyle(4, 0xf0d8a8);

        // Texto del botón
        const btnText = this.add.text(x, y, text, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: '#f0d8a8'
        }).setOrigin(0.5);

        // Efecto Hover (al pasar el ratón)
        btnBg.on('pointerover', () => {
            btnBg.fillColor = 0x6e4531; // Aclarar un poco el color
            this.input.setDefaultCursor('pointer');
        });

        btnBg.on('pointerout', () => {
            btnBg.fillColor = 0x4a3022; // Restaurar color original
            this.input.setDefaultCursor('default');
        });

        // Efecto Click
        btnBg.on('pointerdown', () => {
            btnBg.fillColor = 0x331e13; // Oscurecer
        });

        // Acción al soltar el click
        btnBg.on('pointerup', () => {
            btnBg.fillColor = 0x6e4531; // Volver a estado hover
            onClick(); // Ejecutar la acción pasada por parámetro
        });
    }
}
