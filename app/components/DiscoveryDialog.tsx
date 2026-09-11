"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { moods, styles } from "../data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (preferences: string[]) => void;
};

const worlds = ["Nature", "Architecture", "People", "Fantasy", "Abstract", "Minimal", "Surreal", "Technology", "Culture"];
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

  const preferences = useMemo(() => [mood, world, color, style, energy[0] > 65 ? "bold" : energy[0] < 35 ? "calm" : "contemporary"], [mood, world, color, style, energy]);
  const loadingLines = ["Reading your mood…", "Understanding your taste…", "Curating your gallery…", "Finding something beautiful…"];

  useEffect(() => {
    if (step !== 5) return;
    const lineTimers = [1, 2, 3].map((line) => window.setTimeout(() => setLoadingLine(line), line * 430));
    const doneTimer = window.setTimeout(() => {
      onComplete(preferences);
      onOpenChange(false);
      setStep(0);
    }, 1900);
    return () => { lineTimers.forEach(window.clearTimeout); window.clearTimeout(doneTimer); };
  }, [step, preferences, onComplete, onOpenChange]);

  const choices = step === 0 ? moods : step === 1 ? worlds : step === 3 ? styles : [];
  const selected = step === 0 ? mood : step === 1 ? world : style;
  const setSelected = (value: string) => step === 0 ? setMood(value) : step === 1 ? setWorld(value) : setStyle(value);
  const titles = ["What mood are you in?", "What kind of world attracts you?", "What colors speak to you?", "What styles do you love?", "Choose your visual energy."];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/15 bg-[#090c12]/95 p-0 text-ivory shadow-2xl backdrop-blur-xl sm:max-w-3xl">
        <div className="border-b border-white/10 px-6 py-5 sm:px-9">
          <div className="flex items-center justify-between gap-6 pr-8">
            <span className="text-xs font-semibold uppercase tracking-[.18em] text-cobalt-light">Taste discovery</span>
            {step < 5 && <span className="text-xs text-white/45">{step + 1} / 5</span>}
          </div>
          {step < 5 && <Progress value={(step + 1) * 20} className="mt-4 h-px bg-white/10 [&>div]:bg-cobalt-light" />}
        </div>

        {step < 5 ? (
          <div className="px-6 py-8 sm:px-9 sm:py-10">
            <DialogHeader>
              <DialogTitle className="font-serif text-4xl font-normal tracking-[-.04em] sm:text-5xl">{titles[step]}</DialogTitle>
              <DialogDescription className="mt-2 text-base text-white/50">There are no wrong answers. Pick what pulls you in.</DialogDescription>
            </DialogHeader>

            {(step === 0 || step === 1 || step === 3) && (
              <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {choices.map((choice) => (
                  <button key={choice} onClick={() => setSelected(choice)} className={`flex min-h-14 items-center justify-between rounded-xl border px-4 text-left text-sm transition ${selected === choice ? "border-cobalt-light bg-cobalt/20 text-white" : "border-white/10 bg-white/[.03] text-white/65 hover:border-white/30 hover:text-white"}`}>
                    {choice} {selected === choice && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="mt-9 grid grid-cols-3 gap-4 sm:grid-cols-6">
                {colors.map((option) => (
                  <button key={option.value} onClick={() => setColor(option.value)} aria-label={option.name} className="group flex flex-col items-center gap-3 text-xs text-white/55">
                    <span className={`grid aspect-square w-full place-items-center rounded-full border-2 transition ${color === option.value ? "scale-90 border-white" : "border-transparent group-hover:scale-95"}`} style={{ background: option.color }}>
                      {color === option.value && <Check size={18} className={option.value === "ivory" ? "text-black" : "text-white"} />}
                    </span>
                    {option.name}
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="mt-10 space-y-10 rounded-2xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
                <div>
                  <div className="mb-5 flex justify-between text-sm"><span>Calm</span><span>Intense</span></div>
                  <Slider value={energy} onValueChange={setEnergy} className="[&_[data-slot=slider-range]]:bg-cobalt-light [&_[data-slot=slider-thumb]]:border-cobalt-light" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/50">
                  <span className={energy[0] < 40 ? "text-cobalt-light" : ""}>Minimal</span>
                  <span className={energy[0] >= 40 && energy[0] <= 65 ? "text-cobalt-light" : ""}>Balanced</span>
                  <span className={energy[0] > 65 ? "text-cobalt-light" : ""}>Detailed</span>
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-between gap-3">
              <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm text-white/60 transition hover:text-white disabled:invisible"><ArrowLeft size={16} /> Back</button>
              <button onClick={() => { if (step === 4) setLoadingLine(0); setStep(step + 1); }} className="inline-flex items-center gap-3 rounded-full bg-ivory px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-cobalt-light">
                {step === 4 ? "Create my gallery" : "Continue"} {step === 4 ? <Sparkles size={16} /> : <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[460px] place-items-center px-8 text-center">
            <div>
              <div className="mx-auto mb-8 grid size-24 place-items-center rounded-full border border-cobalt-light/30 bg-cobalt/10">
                <Sparkles size={30} className="animate-pulse text-cobalt-light" />
              </div>
              <h2 className="font-serif text-4xl tracking-[-.04em]">Creating your personal gallery</h2>
              <p className="mt-4 text-white/55" aria-live="polite">{loadingLines[loadingLine]}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
