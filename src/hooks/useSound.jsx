// src/hooks/useSound.js
import { useEffect, useRef, useState, useCallback } from "react";
import { Howl } from "howler";

import clickSoundFile from "../sounds/click.mp3";
import correctSoundFile from "../sounds/correct.mp3";
import wrongSoundFile from "../sounds/wrong.mp3";
import timeoutSoundFile from "../sounds/timeout.mp3";
import bgmFile from "../sounds/bgm.mp3";

export default function useSound({ initialVolume = 0.4, disableBgm = false } = {}) {
    // refs for Howl instances so they survive re-renders
    const clickRef = useRef(null);
    const correctRef = useRef(null);
    const wrongRef = useRef(null);
    const timeoutRef = useRef(null);
    const bgmRef = useRef(null);

    const [muted, setMuted] = useState(false);
    const [volume, setVolumeState] = useState(initialVolume);

    // create Howl instances only once
    useEffect(() => {
        try {
            clickRef.current = new Howl({ src: [clickSoundFile], volume: 0.6 });
            correctRef.current = new Howl({ src: [correctSoundFile], volume: 0.7 });
            wrongRef.current = new Howl({ src: [wrongSoundFile], volume: 0.7 });
            timeoutRef.current = new Howl({ src: [timeoutSoundFile], volume: 0.6 });

            if (!disableBgm) {
                bgmRef.current = new Howl({
                    src: [bgmFile],
                    loop: true,
                    volume: initialVolume,
                });
            }
        } catch (err) {
            // defensive: Howl might throw if audio files missing
            // keep app running
            // eslint-disable-next-line no-console
            console.warn("useSound: failed to init Howl instances", err);
        }

        return () => {
            try {
                clickRef.current?.unload();
                correctRef.current?.unload();
                wrongRef.current?.unload();
                timeoutRef.current?.unload();
                bgmRef.current?.unload();
            } catch (err) {
                // ignore errors during unload
            }
        };
        // run once
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // sync bgm playback & volume when muted/volume changes
    useEffect(() => {
        const bgm = bgmRef.current;
        if (!bgm) return;

        bgm.volume(volume);
        if (volume === 0) setMuted(true);

        if (!muted && !bgm.playing()) {
            try {
                bgm.play();
            } catch {}
        }
        if (muted) {
            try {
                bgm.pause();
            } catch {}
        }
    }, [muted, volume]);

    // setter that ensures volume bounds and updates muted flag
    const setVolume = useCallback(
        (v) => {
            const vol = Math.max(0, Math.min(1, v || 0));
            setVolumeState(vol);
            if (vol === 0) setMuted(true);
            else setMuted(false);

            if (bgmRef.current) {
                try {
                    bgmRef.current.volume(vol);
                    if (!muted && !bgmRef.current.playing()) bgmRef.current.play();
                } catch {}
            }
        },
        [muted]
    );

    // toggle mute/unmute (keeps previous volume handling simple)
    const toggleMute = useCallback(() => {
        setMuted((m) => {
            const next = !m;
            if (bgmRef.current) {
                try {
                    if (next) bgmRef.current.pause();
                    else {
                        // if unmuting and volume is 0, restore a default
                        if (volume === 0) setVolumeState(0.4);
                        bgmRef.current.play();
                    }
                } catch {}
            }
            return next;
        });
    }, [volume]);

    // play a named sound
    const play = useCallback(
        (type) => {
            if (muted) return;

            try {
                switch (type) {
                    case "click":
                        clickRef.current?.play();
                        break;
                    case "correct":
                        correctRef.current?.play();
                        break;
                    case "wrong":
                        wrongRef.current?.play();
                        break;
                    case "timeout":
                        timeoutRef.current?.play();
                        break;
                    case "bgm":
                        if (bgmRef.current && !bgmRef.current.playing())
                            bgmRef.current.play();
                        break;
                    default:
                        // allow playing raw Howl refs by key if you expand mapping
                        break;
                }
            } catch (err) {
                // avoid crashing the app if playback fails
                // eslint-disable-next-line no-console
                console.warn("useSound.play error:", err);
            }
        },
        [muted]
    );

    return {
        play, // play('click'|'correct'|'wrong'|'timeout'|'bgm')
        muted,
        volume,
        setVolume,
        toggleMute,
        // advanced accessors if you need them:
        _internal: {
            clickRef,
            correctRef,
            wrongRef,
            timeoutRef,
            bgmRef,
        },
    };
}
