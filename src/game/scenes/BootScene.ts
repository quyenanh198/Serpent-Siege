import Phaser from 'phaser';
import { makeTextures } from '../textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  preload() {
    this.load.image('jungle-journey', `${import.meta.env.BASE_URL}art/jungle-journey.webp`);
    this.load.image('serpent-armory', `${import.meta.env.BASE_URL}art/serpent-armory.webp`);
    this.load.image('jungle-arena', `${import.meta.env.BASE_URL}art/jungle-arena.webp`);
  }
  create() {
    makeTextures(this);
    this.scene.start('Profile');
  }
}
