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
    this.load.image('jungle-web-board', `${import.meta.env.BASE_URL}art/jungle-web-board.webp`);
    this.load.image('head', `${import.meta.env.BASE_URL}art/serpent-head.png`);
    this.load.image('turret', `${import.meta.env.BASE_URL}art/turret-jade.png`);
    this.load.image('goal-hostage', `${import.meta.env.BASE_URL}art/hostage-cage.png`);
  }
  create() {
    makeTextures(this);
    this.scene.start('Profile');
  }
}
