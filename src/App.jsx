import { useMemo, useState } from "react";
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

function Badge({ children, type }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

export default function App() {
  const [currentTime, setCurrentTime] = useState("22:00");
  const [sleepDelay, setSleepDelay] = useState(20);
  const [targetWake, setTargetWake] = useState("");
  const [cycle, setCycle] = useState(90);

  const cyclesList = useMemo(() => {
    const totalCycles = cycle === 90 ? 6 : 10;

    return Array.from({ length: totalCycles }, (_, i) => {
      const cycles = i + 1;
      const sleepMinutes = cycles * cycle;
      const total = sleepMinutes + sleepDelay;

      const wakeTime = addMinutes(currentTime, total);

      return {
        cycles,
        sleepMinutes,
        total,
        wakeTime,
      };
    });
  }, [currentTime, sleepDelay, cycle]);

  const bestCycle = cycle === 90 ? 5 : 9;
  const recoveryCycle = cycle === 90 ? 6 : 10;

  const recommendedRow = cyclesList.find((r) => r.cycles === bestCycle);

  const closestToTarget = useMemo(() => {
    const target = parseTimeToMinutes(targetWake);
    if (target === null) return null;

    let best = null;
    let minDiff = Infinity;

    cyclesList.forEach((row) => {
      const t = parseTimeToMinutes(row.wakeTime);
      if (t === null) return;

      const diff = t <= target ? target - t : Infinity;

      if (diff < minDiff) {
        minDiff = diff;
        best = row;
      }
    });

    return best;
  }, [cyclesList, targetWake]);

  return (
    <div className="app-shell">
      <div className="container">

        {/* INPUTS */}
        <div className="panel">
          <h2>Calculadora Premium de Sono</h2>

          <div className="form-grid">
            <div className="field">
              <label>Hora atual</label>
              <input
                type="time"
                value={currentTime}
                onChange={(e) => setCurrentTime(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Minutos para dormir</label>
              <input
                type="number"
                value={sleepDelay}
                onChange={(e) => setSleepDelay(Number(e.target.value))}
              />
            </div>

            <div className="field">
              <label>Meta de despertar</label>
              <input
                type="time"
                value={targetWake}
                onChange={(e) => setTargetWake(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* TABELA */}
        <div className="panel">
          <h2>Tabela de ciclos</h2>

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
                {cyclesList.map((row) => {
                  const isBest = row.cycles === bestCycle;
                  const isRecovery = row.cycles === recoveryCycle;

                  const isClosest =
                    closestToTarget &&
                    row.wakeTime === closestToTarget.wakeTime;

                  const isRecommended =
                    recommendedRow?.wakeTime &&
                    recommendedRow.wakeTime !== "--:--" &&
                    row.wakeTime === recommendedRow.wakeTime;

                  return (
                    <tr key={row.cycles}>
                      <td>{row.cycles}</td>
                      <td className="strong">{row.wakeTime}</td>
                      <td>
                        {Math.floor(row.sleepMinutes / 60)}h
                        {row.sleepMinutes % 60 !== 0 &&
                          `${row.sleepMinutes % 60}`}
                      </td>
                      <td>
                        <div className="badge-wrap inline">
                          {isBest && (
                            <Badge type="emerald">Melhor escolha</Badge>
                          )}
                          {isRecovery && (
                            <Badge type="violet">Recuperação total</Badge>
                          )}
                          {isClosest && (
                            <Badge type="cyan">Mais próximo da meta</Badge>
                          )}
                          {isRecommended && (
                            <Badge>
                              Recomendado<br />para hoje
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
