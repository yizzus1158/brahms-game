// Configuración principal de Phaser 3
const config = {
    type: Phaser.AUTO,
    // Resolución típica para juegos arcade/retro escalados
    width: 800,
    height: 600,
    parent: 'game-container',
    // pixelArt: true evita que Phaser difumine las imágenes al escalarlas,
    // manteniendo los bordes duros característicos de los juegos retro (píxeles grandes).
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: false
        }
    },
    scene: [MenuScene, Level1HouseScene, TransitionScene, Level1Scene] // Aquí registramos las escenas
};

// Inicializamos el juego
const game = new Phaser.Game(config);
