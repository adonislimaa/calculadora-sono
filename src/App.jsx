import React, { useMemo, useState } from "react";
import { Moon, AlarmClock, Sparkles, BedDouble, Clock3, Zap, TimerReset } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function parseTimeToMinutes(time) {
  if (!time || typeof time !== "string" || !time.includes(":")) return null;
  const [h, m] = time.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function addMinutes(time, minutesToAdd) {
  const baseMinutes = parseTimeToMinutes(time);
  if (baseMinutes === null) return "--:--";
  return minutesToTime(baseMinutes + minutesToAdd);
}

function durationLabel(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function getCurrentTimeString() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export default function SleepCyclePremiumApp() {
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString());
  const [fallAsleepMinutes, setFallAsleepMinutes] = useState("20");
  const [targetWake, setTargetWake] = useState("06:30");
  const [cycleLength, setCycleLength] = useState("90");
  const [priority, setPriority] = useState("energia");

  const parsedFallAsleep = Math.max(0, Math.min(180, Number(fallAsleepMinutes) || 0));
  const parsedCycleLength = Number(cycleLength) === 50 ? 50 : 90;
  const totalRows = parsedCycleLength === 50 ? 10 : 6;
  const recoveryCycle = parsedCycleLength === 50 ? 10 : 6;
  const minimumFunctionalSleepMinutes = 330;
  const fastCycle = Math.max(1, Math.ceil(minimumFunctionalSleepMinutes / parsedCycleLength));
  const idealSleepMinutes = 450; // ~7h30
  const bestCycle = Math.max(1, Math.round(idealSleepMinutes / parsedCycleLength));

  const sleepStart = useMemo(
    () => addMinutes(currentTime, parsedFallAsleep),
    [currentTime, parsedFallAsleep]
  );

  const rows = useMemo(() => {
    return Array.from({ length: totalRows }, (_, i) => {
      const cycles = i + 1;
      const sleptMinutes = cycles * parsedCycleLength;
      return {
        cycles,
        wakeTime: addMinutes(sleepStart, sleptMinutes),
        hoursSlept: durationLabel(sleptMinutes),
      };
    });
  }, [sleepStart, parsedCycleLength, totalRows]);

  const fastestOption = rows.find((r) => r.cycles === fastCycle) ?? rows[0] ?? null;
  const bestBalanced = rows.find((r) => r.cycles === bestCycle) ?? rows[0] ?? null;
  const recoveryOption = rows.find((r) => r.cycles === recoveryCycle) ?? rows[rows.length - 1] ?? null;

  const closestToTarget = useMemo(() => {
    const targetClockMinutes = parseTimeToMinutes(targetWake);
    const sleepStartClockMinutes = parseTimeToMinutes(sleepStart);

    if (targetClockMinutes === null || sleepStartClockMinutes === null || rows.length === 0) {
      return null;
    }

    // Se a meta for menor que o horário em que o sono começa, interpretamos como horário do dia seguinte.
    const targetAbsoluteMinutes =
      targetClockMinutes < sleepStartClockMinutes
        ? targetClockMinutes + 1440
        : targetClockMinutes;

    const rowsWithAbsoluteMinutes = rows
      .map((row) => {
        const wakeClockMinutes = parseTimeToMinutes(row.wakeTime);
        if (wakeClockMinutes === null) return null;

        const wakeAbsoluteMinutes =
          wakeClockMinutes < sleepStartClockMinutes
            ? wakeClockMinutes + 1440
            : wakeClockMinutes;

        return {
          ...row,
          wakeAbsoluteMinutes,
        };
      })
      .filter(Boolean);

    const validRows = rowsWithAbsoluteMinutes.filter(
      (row) => row.wakeAbsoluteMinutes <= targetAbsoluteMinutes
    );

    if (validRows.length > 0) {
      return validRows.reduce((best, row) => {
        const bestDiff = targetAbsoluteMinutes - best.wakeAbsoluteMinutes;
        const currentDiff = targetAbsoluteMinutes - row.wakeAbsoluteMinutes;
        return currentDiff < bestDiff ? row : best;
      });
    }

    // Se todas as opções ultrapassarem a meta, retorna a menor ultrapassagem.
    return rowsWithAbsoluteMinutes.reduce((best, row) => {
      const bestDiff = Math.abs(best.wakeAbsoluteMinutes - targetAbsoluteMinutes);
      const currentDiff = Math.abs(row.wakeAbsoluteMinutes - targetAbsoluteMinutes);
      return currentDiff < bestDiff ? row : best;
    });
  }, [rows, targetWake, sleepStart]);

  const recommendedRow = priority === "tempo" ? fastestOption : bestBalanced;

  const fastCycleDuration = durationLabel(fastCycle * parsedCycleLength);
  const bestCycleDuration = durationLabel(bestCycle * parsedCycleLength);
  const recoveryCycleDuration = durationLabel(recoveryCycle * parsedCycleLength);

  // Reset contextual: limpa apenas dados de entrada, mantém preferências (prioridade e duração do ciclo)
  const resetContextual = () => {
    setCurrentTime("");
    setFallAsleepMinutes("20");
    setTargetWake("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 lg:py-12">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 shadow-2xl lg:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Moon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
                  Calculadora Premium de Sono
                </h1>
                <p className="mt-1 text-sm text-slate-300 md:text-base">
                  Escolha entre ciclos de 50 ou 90 minutos, defina o tempo para adormecer e veja o horário mais estratégico para despertar.
                </p>
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <Label>Qual sua prioridade hoje?</Label>
              <ToggleGroup
                type="single"
                value={priority}
                onValueChange={(value) => value && setPriority(value)}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="tempo"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-slate-100 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-100"
                >
                  ⏱️ Tempo
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="energia"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-slate-100 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-100"
                >
                  ⚡ Energia
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="mb-4 space-y-2">
              <Label>Duração do ciclo</Label>
              <ToggleGroup
                type="single"
                value={cycleLength}
                onValueChange={(value) => value && setCycleLength(value)}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="50"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-slate-100 data-[state=on]:bg-cyan-500/20 data-[state=on]:text-cyan-100"
                >
                  50 min
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="90"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-slate-100 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-100"
                >
                  90 min
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="currentTime">Hora atual</Label>
                <Input
                  id="currentTime"
                  type="time"
                  value={currentTime}
                  onChange={(e) => setCurrentTime(e.target.value)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-base [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fallAsleep">Minutos para dormir</Label>
                <Input
                  id="fallAsleep"
                  inputMode="numeric"
                  value={fallAsleepMinutes}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/\D/g, "");
                    setFallAsleepMinutes(sanitized);
                  }}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-base [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetWake">Meta de despertar</Label>
                <Input
                  id="targetWake"
                  type="time"
                  value={targetWake}
                  onChange={(e) => setTargetWake(e.target.value)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-base [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => setCurrentTime(getCurrentTimeString())}
                className="rounded-2xl"
              >
                Usar horário atual
              </Button>
              <Button
                variant="secondary"
                onClick={resetContextual}
                className="rounded-2xl"
              >
                Limpar dados
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl">
              <CardHeader>
                <CardDescription>Início estimado do sono</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl text-slate-100">
                  <BedDouble className="h-6 w-6" /> {sleepStart}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl ring-1 ring-emerald-400/20">
              <CardHeader>
                <CardDescription>Recomendado para você hoje</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl text-slate-100">
                  {priority === "tempo" ? <TimerReset className="h-5 w-5" /> : <Zap className="h-5 w-5" />} {recommendedRow?.wakeTime ?? "--:--"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  {recommendedRow
                    ? `${priority === "tempo" ? "Mais rápido" : "Melhor escolha"} • ${recommendedRow.cycles} ciclos de ${parsedCycleLength} min • ${recommendedRow.hoursSlept} de sono`
                    : "Preencha os campos para calcular"}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-white/10 bg-white/5 shadow-xl">
              <CardHeader>
                <CardDescription>Mais próximo da meta informada</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl text-slate-100">
                  <AlarmClock className="h-5 w-5" /> {closestToTarget?.wakeTime ?? "--:--"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  {closestToTarget ? `${closestToTarget.cycles} ciclos de ${parsedCycleLength} min • ${closestToTarget.hoursSlept} de sono` : "Informe uma meta de despertar para comparar"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="rounded-3xl border-white/10 bg-white/5 shadow-2xl">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl text-slate-100">Tabela de ciclos</CardTitle>
              <CardDescription>
                Horário estimado de acordar + quantidade total de sono conforme o ciclo selecionado e o tempo para adormecer informado.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-xl bg-amber-500/20 text-amber-200 hover:bg-amber-500/20">
                Mais rápido = {fastCycleDuration}
              </Badge>
              <Badge className="rounded-xl bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20">
                Melhor escolha = {bestCycleDuration}
              </Badge>
              <Badge className="rounded-xl bg-violet-500/20 text-violet-200 hover:bg-violet-500/20">
                Recuperação total = {recoveryCycleDuration}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse overflow-hidden text-left text-slate-100">
                <thead className="bg-white/5 text-sm text-slate-300">
                  <tr>
                    <th className="px-4 py-4 font-medium">Ciclos</th>
                    <th className="px-4 py-4 font-medium">Horário de acordar</th>
                    <th className="px-4 py-4 font-medium">Horas dormidas</th>
                    <th className="px-4 py-4 font-medium">Recomendação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isFast = row.cycles === fastCycle;
                    const isBest = row.cycles === bestCycle;
                    const isClosest = row.wakeTime === closestToTarget?.wakeTime;
                    const isRecovery = row.cycles === recoveryCycle;
                    const isRecommended = row.wakeTime === recommendedRow?.wakeTime;

                    return (
                      <tr
                        key={row.cycles}
                        className={`border-t border-white/10 ${
                          isRecommended ? "bg-white/5" : ""
                        }`}
                      >
                        <td className="px-4 py-4 text-base font-medium text-slate-100">{row.cycles}</td>
                        <td className="px-4 py-4 text-base font-semibold text-slate-100">{row.wakeTime}</td>
                        <td className="px-4 py-4 text-base text-slate-100">{row.hoursSlept}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {isFast && (
                              <Badge className="rounded-xl bg-amber-500/20 text-amber-200 hover:bg-amber-500/20">
                                Mais rápido
                              </Badge>
                            )}
                            {isBest && (
                              <Badge className="rounded-xl bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20">
                                Melhor escolha
                              </Badge>
                            )}
                            {isRecovery && (
                              <Badge className="rounded-xl bg-violet-500/20 text-violet-200 hover:bg-violet-500/20">
                                Recuperação total
                              </Badge>
                            )}
                            {isClosest && (
                              <Badge className="rounded-xl bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/20">
                                Mais próximo da meta
                              </Badge>
                            )}
                            {isRecommended && (
                              <Badge className="rounded-xl bg-white/10 text-slate-100 hover:bg-white/10">
                                Recomendado para hoje
                              </Badge>
                            )}
                            {!isFast && !isBest && !isClosest && !isRecovery && !isRecommended && (
                              <span className="text-sm text-slate-400">Opção intermediária</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="rounded-3xl border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-100">
                <TimerReset className="h-5 w-5" /> Mais rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Com o ciclo atual de {parsedCycleLength} min, a sugestão mais rápida usa {fastCycle} ciclos e corresponde a aproximadamente {fastCycleDuration}. Ideal para quando sua prioridade é ganhar tempo sem cair abaixo de uma faixa mínima mais funcional de descanso.
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-100">
                <Sparkles className="h-5 w-5" /> Melhor escolha
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Com o ciclo atual de {parsedCycleLength} min, {bestCycle} ciclos correspondem a aproximadamente {bestCycleDuration}. Em geral, é o melhor equilíbrio entre rotina e recuperação.
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-100">
                <Moon className="h-5 w-5" /> Recuperação total
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Com o ciclo atual de {parsedCycleLength} min, {recoveryCycle} ciclos correspondem a aproximadamente {recoveryCycleDuration}. Ideal para a maior janela de descanso dentro da tabela.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
