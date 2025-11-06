// src/utils/sounds.js
import { Howl } from "howler";
import clickSoundFile from "../sounds/click.mp3";
import correctSoundFile from "../sounds/correct.mp3";
import wrongSoundFile from "../sounds/wrong.mp3";
import timeoutSoundFile from "../sounds/timeout.mp3";
import bgmFile from "../sounds/bgm.mp3";

export const clickSound = new Howl({ src: [clickSoundFile], volume: 0.6 });
export const correctSound = new Howl({ src: [correctSoundFile], volume: 0.7 });
export const wrongSound = new Howl({ src: [wrongSoundFile], volume: 0.7 });
export const timeoutSound = new Howl({ src: [timeoutSoundFile], volume: 0.6 });
export const bgm = new Howl({ src: [bgmFile], loop: true });

export const playSound = (type, muted = false) => {
  if (muted) return;
  const map = { click: clickSound, correct: correctSound, wrong: wrongSound, timeout: timeoutSound };
  map[type]?.play();
};
