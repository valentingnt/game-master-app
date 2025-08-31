import { useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"
import { useMessages, usePlayers } from "../lib/hooks"
import {
  FiHeart,
  FiDroplet,
  FiActivity,
  FiZap,
  FiBattery,
  FiUser,
  FiCompass,
  FiShield,
  FiSmile,
  FiWind,
  FiTool,
  FiEye,
  FiBook,
  FiFileText,
  FiStar,
  FiCalendar,
  FiMaximize,
  FiPackage,
  FiSun,
} from "react-icons/fi"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"

export default function Player() {
  const params = useParams()
  const playerId = params.id as string
  const { data: players } = usePlayers()

  const player = useMemo(
    () => (players ?? []).find((p) => p.id === playerId) ?? null,
    [players, playerId]
  )

  useEffect(() => {
    if (playerId) {
      try {
        localStorage.setItem("last_player_id", playerId)
      } catch {}
    }
  }, [playerId])

  const { data: messages } = useMessages()
  const activeMessage = useMemo(() => {
    const list = (messages ?? []).filter(
      (m) =>
        m.show &&
        (m.target_player_id === playerId || m.target_player_id == null)
    )
    list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    return list[0] ?? null
  }, [messages, playerId])

  return (
    <div className="space-y-8">
      {activeMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-w-4xl px-6 text-center">
            <div className="text-white font-mono tracking-widest text-3xl sm:text-5xl md:text-6xl leading-snug">
              {activeMessage.content}
            </div>
          </div>
        </div>
      )}
      <section className="card-surface p-5">
        {!player ? (
          <div className="text-sm text-gray-400">Player not found.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-4 md:col-span-2">
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt={`${player.first_name} ${player.last_name}`}
                    className={`w-20 h-20 sm:w-48 sm:h-48 rounded object-cover ${
                      player.is_dead ? "grayscale" : ""
                    }`}
                  />
                ) : (
                  <div
                    className={`w-20 h-20 sm:w-48 sm:h-48 rounded bg-gray-700 ${
                      player.is_dead ? "grayscale" : ""
                    }`}
                  />
                )}
                <div className="flex-1 flex flex-col gap-2">
                  <div className="display-title text-3xl md:text-4xl">
                    {player.first_name} {player.last_name}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="pill">
                      <FiZap className="text-gray-300" /> AP{" "}
                      {player.action_points}
                    </span>
                    {player.age != null && (
                      <span className="pill">
                        <FiCalendar className="text-gray-300" />
                        {player.age}
                      </span>
                    )}
                    {player.size != null && (
                      <span className="pill">
                        <FiMaximize className="text-gray-300" />
                        {player.size}
                      </span>
                    )}
                    {player.weight != null && (
                      <span className="pill">
                        <FiPackage className="text-gray-300" />
                        {player.weight}
                      </span>
                    )}
                    {player.sex != null && (
                      <span className="pill">
                        <FiUser className="text-gray-300" />
                        {player.sex}
                      </span>
                    )}
                    {player.astrological_sign && (
                      <span className="pill">
                        <FiSun className="text-gray-300" />
                        {player.astrological_sign}
                      </span>
                    )}
                  </div>
                </div>
                {player.is_dead && (
                  <div className="text-red-400 text-sm font-semibold tracking-widest">
                    DEAD
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              {(() => {
                const stats = [
                  { key: "orientation", label: "Orientation", Icon: FiCompass },
                  { key: "strength", label: "Strength", Icon: FiStar },
                  { key: "resistance", label: "Resistance", Icon: FiShield },
                  { key: "charisma", label: "Charisma", Icon: FiSmile },
                  { key: "agility", label: "Agility", Icon: FiWind },
                  { key: "dexterity", label: "Dexterity", Icon: FiTool },
                  { key: "intuition", label: "Intuition", Icon: FiEye },
                ] as const
                const radarData = stats.map((s) => ({
                  stat: s.label,
                  value: (player as any)[s.key] as number,
                }))
                const maxVal = Math.max(...radarData.map((d) => d.value))
                const renderTick =
                  (data: { stat: string; value: number }[]) => (props: any) => {
                    const { x, y, payload, textAnchor } = props
                    const item = data.find((d) => d.stat === payload.value)
                    return (
                      <text
                        x={x}
                        y={y}
                        textAnchor={textAnchor}
                        fill="#e5e7eb"
                        fontSize={11}
                      >
                        {payload.value} ({item?.value ?? ""})
                      </text>
                    )
                  }
                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="card-surface p-3 col-span-2">
                      <div className="muted mb-2">Core Stats</div>
                      <div className="w-full h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            data={radarData}
                            cx="50%"
                            cy="50%"
                            outerRadius="90%"
                          >
                            <PolarGrid
                              stroke="rgba(255,255,255,0.2)"
                              radialLines={true}
                            />
                            <PolarAngleAxis
                              dataKey="stat"
                              tick={renderTick(radarData)}
                            />
                            <PolarRadiusAxis
                              domain={[0, maxVal]}
                              tick={false}
                              tickCount={6}
                              axisLine={false}
                            />
                            <Radar
                              name="Stats"
                              dataKey="value"
                              stroke="#ffffff"
                              fill="#ffffff"
                              fillOpacity={0.3}
                              isAnimationActive={false}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 text-sm col-span-2 md:col-span-1">
                      <div className="card-surface p-3">
                        <div className="muted mb-1 flex items-center gap-2">
                          <FiHeart className="text-gray-400" />
                          <span>Health</span>
                        </div>
                        <div className="progress">
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${
                                  (Math.min(player.hp_current, player.hp_max) /
                                    Math.max(player.hp_max, 1)) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-xs mt-1">
                          {Math.min(player.hp_current, player.hp_max)} /{" "}
                          {player.hp_max}
                        </div>
                      </div>
                      <div className="card-surface p-3">
                        <div className="muted mb-1 flex items-center gap-2">
                          <FiDroplet className="text-gray-400" />
                          <span>Hunger</span>
                        </div>
                        <div className="zero-gauge">
                          <div className="zero-track" />
                          <div className="zero-center" />
                          <div
                            className="zero-fill zero-fill-pos"
                            style={{
                              width: `${
                                (Math.max(0, player.hunger) / 2) * 50
                              }%`,
                            }}
                          />
                          <div
                            className="zero-fill zero-fill-neg"
                            style={{
                              width: `${
                                (Math.max(
                                  0,
                                  Math.abs(Math.min(player.hunger, 0))
                                ) /
                                  2) *
                                50
                              }%`,
                            }}
                          />
                        </div>
                        <div className="text-xs mt-1">{player.hunger}</div>
                      </div>
                      <div className="card-surface p-3">
                        <div className="muted mb-1 flex items-center gap-2">
                          <FiActivity className="text-gray-400" />
                          <span>Thirst</span>
                        </div>
                        <div className="zero-gauge">
                          <div className="zero-track" />
                          <div className="zero-center" />
                          <div
                            className="zero-fill zero-fill-pos"
                            style={{
                              width: `${
                                (Math.max(0, player.thirst) / 2) * 50
                              }%`,
                            }}
                          />
                          <div
                            className="zero-fill zero-fill-neg"
                            style={{
                              width: `${
                                (Math.max(
                                  0,
                                  Math.abs(Math.min(player.thirst, 0))
                                ) /
                                  2) *
                                50
                              }%`,
                            }}
                          />
                        </div>
                        <div className="text-xs mt-1">{player.thirst}</div>
                      </div>
                      <div className="card-surface p-3">
                        <div className="muted mb-1 flex items-center gap-2">
                          <FiBattery className="text-gray-400" />
                          <span>Fatigue</span>
                        </div>
                        <div className="text-lg">{player.fatigue}</div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </section>

      {player && (
        <section className="card-surface p-5">
          <div className="muted text-sm mb-2">Additional Information</div>
          <div className="space-y-3 text-sm flex flex-col gap-2">
            {player.history && (
              <div>
                <div className="muted flex items-center gap-2">
                  <FiBook className="text-gray-400" />
                  <span>History</span>
                </div>
                <div className="whitespace-pre-wrap max-h-64 overflow-auto">
                  {player.history}
                </div>
              </div>
            )}
            {player.physical_description && (
              <div>
                <div className="muted flex items-center gap-2">
                  <FiFileText className="text-gray-400" />
                  <span>Physical Description</span>
                </div>
                <div className="whitespace-pre-wrap max-h-64 overflow-auto">
                  {player.physical_description}
                </div>
              </div>
            )}
            {player.character_traits && (
              <div>
                <div className="muted flex items-center gap-2">
                  <FiStar className="text-gray-400" />
                  <span>Character Traits</span>
                </div>
                <div className="whitespace-pre-wrap max-h-64 overflow-auto">
                  {player.character_traits}
                </div>
              </div>
            )}
            {!player.history &&
              !player.physical_description &&
              !player.character_traits && (
                <div className="text-gray-500">No additional information</div>
              )}
          </div>
        </section>
      )}
    </div>
  )
}
