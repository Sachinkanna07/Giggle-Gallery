"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { moods, styles } from "../data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (preferences: string[]) => void;
};

const worlds = [
  "Nature",
  "Architecture",
  "People",
  "Fantasy",
  "Abstract",
  "Minimal",
  "Surreal",
  "Technology",
  "Culture",
];

const colors = [
  { name: "Midnight", value: "black", color: "#11151d" },
  { name: "Ocean", value: "blue", color: "#2757ff" },
  { name: "Ember", value: "coral", color: "#c15b48" },
  { name: "Mist", value: "ivory", color: "#e6e0d4" },
  { name: "Forest", value: "teal", color: "#195e60" },
  { name: "Sun", value: "gold", color: "#bf9448" },
];

export function DiscoveryDialog({ open, onOpenChange, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState("Calm");
  const [world, setWorld] = useState("Nature");
  const [color, setColor] = useState("blue");
  const [style, setStyle] = useState("Minimalism");
  const [energy, setEnergy] = useState([38]);
  const [loadingLine, setLoadingLine] = useState(0);

  const preferences = useMemo(
    () => [
      mood,
      world,
      color,
      style,
      energy[0] > 65 ? "bold" : energy[0] < 35 ? "calm" : "contemporary",
    ],
    [mood, world, color, style, energy]
  );

  const loadingLines = [
    "Reading your emotional aesthetic…",
    "Composing your visual architecture…",
    "Curating your private exhibition…",
    "Synchronizing fine art catalog…",
  ];

  useEffect(() => {
    if (step !== 5) return;
    const lineTimers = [1, 2, 3].map((line) =>
      window.setTimeout(() => setLoadingLine(line), line * 430)
    );
    const doneTimer = window.setTimeout(() => {
      onComplete(preferences);
      onOpenChange(false);
      setStep(0);
    }, 1900);
    return () => {
      lineTimers.forEach(window.clearTimeout);
      window.clearTimeout(doneTimer);
    };
  }, [step, preferences, onComplete, onOpenChange]);

  const choices = step === 0 ? moods : step === 1 ? worlds : step === 3 ? styles : [];
  const selected = step === 0 ? mood : step === 1 ? world : style;
  const setSelected = (value: string) =>
    step === 0 ? setMood(value) : step === 1 ? setWorld(value) : setStyle(value);

  const titles = [
    "What mood are you in?",
    "What kind of world attracts you?",
    "What colors speak to you?",
    "What visual styles do you love?",
    "Choose your aesthetic energy.",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-border bg-surface p-0 text-text-primary shadow-2xl backdrop-blur-2xl sm:max-w-3xl">
        <div className="border-b border-border px-6 py-5 sm:px-9">
          <div className="flex items-center justify-between gap-6 pr-8">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">
              Curatorial Discovery
            </span>
            {step < 5 && <span className="text-xs text-text-secondary">{step + 1} / 5</span>}
          </div>
          {step < 5 && (
            <Progress
              value={(step + 1) * 20}
              className="mt-4 h-1 bg-border [&>div]:bg-accent-secondary"
            />
          )}
        </div>

        {step < 5 ? (
          <div className="px-6 py-8 sm:px-9 sm:py-10">
            <DialogHeader>
              <DialogTitle className="font-serif text-4xl sm:text-5xl font-normal tracking-[-0.04em] text-text-primary">
                {titles[step]}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-text-secondary">
                Select the feeling or forms that instinctively draw your focus.
              </DialogDescription>
            </DialogHeader>

            {(step === 0 || step === 1 || step === 3) && (
              <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {choices.map((choice) => (
                  <button
                    key={choice}
                    aria-pressed={selected === choice}
                    onClick={() => setSelected(choice)}
                    className={`flex min-h-14 items-center justify-between rounded-xl border px-4 text-left text-sm transition ${
                      selected === choice
                        ? "border-accent bg-accent/15 text-text-primary font-medium"
                        : "border-border bg-surface-elevated/40 text-text-secondary hover:border-text-primary hover:text-text-primary"
                    }`}
                  >
                    {choice} {selected === choice && <Check size={16} className="text-accent-secondary" />}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="mt-9 grid grid-cols-3 gap-4 sm:grid-cols-6">
                {colors.map((option) => (
                  <button
                    key={option.value}
                    aria-pressed={color === option.value}
                    onClick={() => setColor(option.value)}
                    aria-label={option.name}
                    className="group flex flex-col items-center gap-3 text-xs text-text-secondary"
                  >
                    <span
                      className={`grid aspect-square w-full place-items-center rounded-full border-2 transition ${
                        color === option.value
                          ? "scale-95 border-text-primary ring-2 ring-accent"
                          : "border-transparent group-hover:scale-95 shadow-sm"
                      }`}
                      style={{ background: option.color }}
                    >
                      {color === option.value && (
                        <Check
                          size={18}
                          className={option.value === "ivory" ? "text-black" : "text-white"}
                        />
                      )}
                    </span>
                    <span className="group-hover:text-text-primary transition">{option.name}</span>
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="mt-10 space-y-10 rounded-2xl border border-border bg-surface-elevated/40 p-6 sm:p-8">
                <div>
                  <div className="mb-5 flex justify-between text-xs text-text-secondary uppercase tracking-wider">
                    <span>Quiet Stillness</span>
                    <span>Electric Tension</span>
                  </div>
                  <Slider
                    aria-label="Visual energy"
                    value={energy}
                    onValueChange={setEnergy}
                    className="[&_[data-slot=slider-range]]:bg-accent [&_[data-slot=slider-thumb]]:border-accent"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-text-secondary">
                  <span className={energy[0] < 40 ? "text-accent-secondary font-semibold" : ""}>
                    Minimal
                  </span>
                  <span
                    className={
                      energy[0] >= 40 && energy[0] <= 65
                        ? "text-accent-secondary font-semibold"
                        : ""
                    }
                  >
                    Harmonious
                  </span>
                  <span className={energy[0] > 65 ? "text-accent-secondary font-semibold" : ""}>
                    Dynamic
                  </span>
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-between gap-3">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-xs font-semibold text-text-secondary transition hover:text-text-primary disabled:invisible"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                onClick={() => {
                  if (step === 4) setLoadingLine(0);
                  setStep(step + 1);
                }}
                className="button-light text-xs !py-3 !px-6"
              >
                {step === 4 ? "Curate My Gallery" : "Continue"}{" "}
                {step === 4 ? <Sparkles size={15} /> : <ArrowRight size={15} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[460px] place-items-center px-8 text-center">
            <div>
              <div className="mx-auto mb-8 grid size-24 place-items-center rounded-full border border-accent/30 bg-accent/10">
                <Sparkles size={32} className="animate-pulse text-accent-secondary" />
              </div>
              <h2 className="font-serif text-4xl tracking-[-0.04em] text-text-primary">
                Composing your private gallery
              </h2>
              <p className="mt-4 text-text-secondary text-sm" aria-live="polite">
                {loadingLines[loadingLine]}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
