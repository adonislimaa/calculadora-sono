import { useMemo, useState } from "react";
import {
  Moon,
  AlarmClock,
  Sparkles,
  BedDouble,
  Clock3,
  Zap,
  TimerReset,
} from "lucide-react";
import "./styles.css";

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

function Badge({ children, tone = "default" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Panel({ children, className = "" }) {
  return <section className={`panel ${className}`.trim()}>{children}</section>;
}

export default function App() {
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString());
  const [fallAsleepMinutes, setFallAsleepMinutes] = useState("20");
  const [targetWake, setTargetWake] = useState("06:30");
  const [cycleLength, setCycleLength] = useState("90");
  const [priority, setPriority] = useState("energia");

  const parsedFallAsleep = Math.max(
    0,
    Math.min(180, Number(fallAsleepMinutes) || 0)
  );
  const parsedCycleLength = Number(cycleLength) === 50 ? 50 : 90;
  const totalRows = parsedCycleLength === 50 ? 10 : 6;
  const recoveryCycle = parsedCycleLength === 50 ? 10 : 6;

  const minimumFunctionalSleepMinutes = 330; // ~5h30
  const fastCycle = Math.max(
    1,
    Math.ceil(minimumFunctionalSleepMinutes / parsedCycleLength)
  );

  const idealSleepMinutes = 450; // ~7h30
  const bestCycle = Math.max(
    1,
    Math.round(idealSleepMinutes / parsedCycleLength)
  );

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

  const closestToTarget = useMemo(() => {
    const targetClockMinutes = parseTimeToMinutes(targetWake);
    const sleepStartClockMinutes = parseTimeToMinutes(sleepStart);

    if (targetClockMinutes === null || sleepStartClockMinutes === null || rows.length === 0) {
      return null;
    }

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

    return rowsWithAbsoluteMinutes.reduce((best, row) => {
      const bestDiff = Math.abs(best.wakeAbsoluteMinutes - targetAbsoluteMinutes);
      const currentDiff = Math.abs(row.wakeAbsoluteMinutes - targetAbsoluteMinutes);
      return currentDiff < bestDiff ? row : best;
    });
  }, [rows, targetWake, sleepStart]);

  const hasValidInput =
    parseTimeToMinutes(currentTime) !== null &&
    parseTimeToMinutes(sleepStart) !== null;

  const recommendedRow = hasValidInput
    ? priority === "tempo"
      ? fastestOption
      : bestBalanced
    : null;

  const resetContextual = () => {
    setCurrentTime("");
    setFallAsleepMinutes("20");
    setTargetWake("");
  };

  return (
    <div className="app-shell">
      <div className="container">
        <div className="hero-grid">
          <Panel className="hero-panel">
            <div className="hero-head">
              <div className="hero-icon-wrap">
                <Moon size={26} />
              </div>
              <div>
                <h1>Calculadora Premium de Sono</h1>
                <p>
                  Escolha entre ciclos de 50 ou 90 minutos, defina o tempo para
                  adormecer e veja o horário mais estratégico para despertar.
                </p>
              </div>
            </div>

            <div className="control-block">
              <label className="section-label">Qual sua prioridade hoje?</label>
              <div className="toggle-row">
                <button
                  className={`toggle ${priority === "tempo" ? "active amber" : ""}`}
                  onClick={() => setPriority("tempo")}
                  type="button"
                >
                  ⏱️ Tempo
                </button>
                <button
                  className={`toggle ${priority === "energia" ? "active emerald" : ""}`}
                  onClick={() => setPriority("energia")}
                  type="button"
                >
                  ⚡ Energia
                </button>
              </div>
            </div>

            <div className="control-block">
              <label className="section-label">Duração do ciclo</label>
              <div className="toggle-row">
                <button
                  className={`toggle ${cycleLength === "50" ? "active cyan" : ""}`}
                  onClick={() => setCycleLength("50")}
                  type="button"
                >
                  50 min
                </button>
                <button
                  className={`toggle ${cycleLength === "90" ? "active emerald" : ""}`}
                  onClick={() => setCycleLength("90")}
                  type="button"
                >
                  90 min
                </button>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="currentTime">Hora atual</label>
                <input
                  id="currentTime"
                  type="time"
                  value={currentTime}
                  onChange={(e) => setCurrentTime(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="fallAsleepMinutes">Minutos para dormir</label>
                <input
                  id="fallAsleepMinutes"
                  inputMode="numeric"
                  value={fallAsleepMinutes}
                  onChange={(e) =>
                    setFallAsleepMinutes(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="20"
                />
              </div>

              <div className="field">
                <label htmlFor="targetWake">Meta de despertar</label>
                <input
                  id="targetWake"
                  type="time"
                  value={targetWake}
                  onChange={(e) => setTargetWake(e.target.value)}
                />
              </div>
            </div>

            <div className="button-row">
              <button
                className="btn btn-primary"
                onClick={() => setCurrentTime(getCurrentTimeString())}
                type="button"
              >
                Usar horário atual
              </button>

              <button
                className="btn btn-secondary"
                onClick={resetContextual}
                type="button"
              >
                Limpar dados
              </button>
            </div>
          </Panel>

          <div className="side-grid">
            <Panel>
              <div className="info-label">Início estimado do sono</div>
              <div className="info-value">
                <BedDouble size={22} />
                <span>{sleepStart}</span>
              </div>
            </Panel>

            <Panel className="panel-highlight">
              <div className="info-label">Recomendado para você hoje</div>
              <div className="info-value">
                {priority === "tempo" ? <TimerReset size={20} /> : <Zap size={20} />}
                <span>{recommendedRow?.wakeTime ?? "--:--"}</span>
              </div>
              <p className="info-description">
                {recommendedRow
                  ? `${priority === "tempo" ? "Mais rápido" : "Melhor escolha"} • ${
                      recommendedRow.cycles
                    } ciclos de ${parsedCycleLength} min • ${recommendedRow.hoursSlept} de sono`
                  : "Preencha os campos para calcular"}
              </p>
            </Panel>

            <Panel>
              <div className="info-label">Mais próximo da meta informada</div>
              <div className="info-value">
                <AlarmClock size={20} />
                <span>{closestToTarget?.wakeTime ?? "--:--"}</span>
              </div>
              <p className="info-description">
                {closestToTarget
                  ? `${closestToTarget.cycles} ciclos de ${parsedCycleLength} min • ${closestToTarget.hoursSlept} de sono`
                  : "Informe uma meta de despertar para comparar"}
              </p>
            </Panel>
          </div>
        </div>

        <Panel>
          <div className="table-head">
            <div>
              <h2>Tabela de ciclos</h2>
              <p>
                Horário estimado de acordar e quantidade total de sono conforme
                o ciclo selecionado e o tempo para adormecer informado.
              </p>
            </div>

            <div className="badge-wrap">
              <Badge tone="amber">
                Mais rápido = {durationLabel(fastCycle * parsedCycleLength)}
              </Badge>
              <Badge tone="emerald">
                Melhor escolha = {durationLabel(bestCycle * parsedCycleLength)}
              </Badge>
              <Badge tone="violet">
                Recuperação total = {durationLabel(recoveryCycle * parsedCycleLength)}
              </Badge>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ciclos</th>
                  <th>Horário de acordar</th>
                  <th>Horas dormidas</th>
                  <th>Recomendação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isFast = row.cycles === fastCycle;
                  const isBest = row.cycles === bestCycle;
                  const isClosest = row.wakeTime === closestToTarget?.wakeTime;
                  const isRecovery = row.cycles === recoveryCycle;
                  const isRecommended =
                    recommendedRow?.wakeTime && recommendedRow.wakeTime !== "--:--"
                      ? row.wakeTime === recommendedRow.wakeTime
                      : false;

                  return (
                    <tr key={row.cycles} className={isRecommended ? "row-highlight" : ""}>
                      <td>{row.cycles}</td>
                      <td className="strong">{row.wakeTime}</td>
                      <td>{row.hoursSlept}</td>
                      <td>
                        <div className="badge-wrap inline">
                          {isFast && <Badge tone="amber">Mais rápido</Badge>}
                          {isBest && <Badge tone="emerald">Melhor escolha</Badge>}
                          {isRecovery && <Badge tone="violet">Recuperação total</Badge>}
                          {isClosest && <Badge tone="cyan">Mais próximo da meta</Badge>}
                          {isRecommended && (
                            <Badge>
                              Recomendado
                              <br />
                              para hoje
                            </Badge>
                          )}
                          {!isFast &&
                            !isBest &&
                            !isRecovery &&
                            !isClosest &&
                            !isRecommended && (
                              <span className="muted">Opção intermediária</span>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="tips-grid">
          <Panel>
            <h3>
              <TimerReset size={18} /> Mais rápido
            </h3>
            <p>
              Com o ciclo atual de {parsedCycleLength} min, a sugestão mais rápida usa{" "}
              {fastCycle} ciclos e corresponde a aproximadamente{" "}
              {durationLabel(fastCycle * parsedCycleLength)}.
            </p>
          </Panel>

          <Panel>
            <h3>
              <Sparkles size={18} /> Melhor escolha
            </h3>
            <p>
              Com o ciclo atual de {parsedCycleLength} min, {bestCycle} ciclos
              correspondem a aproximadamente {durationLabel(bestCycle * parsedCycleLength)}.
              Em geral, é o melhor equilíbrio entre rotina e recuperação.
            </p>
          </Panel>

          <Panel>
            <h3>
              <Clock3 size={18} /> Recuperação total
            </h3>
            <p>
              Com o ciclo atual de {parsedCycleLength} min, {recoveryCycle} ciclos
              correspondem a aproximadamente {durationLabel(recoveryCycle * parsedCycleLength)}.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
.container {
  padding-bottom: 80px;
}

@media (max-width: 640px) {
  .container {
    padding-bottom: 120px;
  }
}
