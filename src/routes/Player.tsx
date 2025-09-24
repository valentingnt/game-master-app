import { useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"
import {
  useMessages,
  usePlayers,
  useAppState,
  useActiveMaskImage,
  useMaskPointer,
} from "../lib/hooks"
import { usePlayerInventory } from "../lib/hooks"
import {
  FiHeart,
  FiDroplet,
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
} from "react-icons/fi"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"
import { MdOutlineFastfood } from "react-icons/md"
import { RxHeight } from "react-icons/rx"
import { LuWeight } from "react-icons/lu"

export default function Player() {
  const params = useParams()
  const playerId = params.id as string
  const { data: players } = usePlayers()
  const { data: app } = useAppState()
  const { data: activeMask } = useActiveMaskImage()
  const { data: pointer } = useMaskPointer()

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
  const { data: personalInv } = usePlayerInventory(playerId)
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
      {/* Spotlight / image overlay */}
      {activeMask?.url && app?.mask_target_player_ids?.includes(playerId) && (
        <div className="fixed inset-0 z-40 bg-black">
          <img
            src={activeMask.url}
            alt="mask"
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              transform:
                typeof activeMask.rotation_quarters === "number"
                  ? `rotate(${(activeMask.rotation_quarters % 4) * 90}deg)`
                  : activeMask.rotate_90
                  ? "rotate(90deg)"
                  : undefined,
            }}
          />
          {/* If spotlight mode enabled globally, rely on Display for effect; player sees full image or could be extended later */}
        </div>
      )}
      {activeMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-w-4xl px-6 text-center">
            <div className="text-white font-mono tracking-widest text-3xl sm:text-5xl md:text-6xl leading-snug">
              {activeMessage.content}
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div
          className={`${
            personalInv && personalInv.length > 0
              ? "lg:col-span-2"
              : "lg:col-span-3"
          } space-y-8`}
        >
          <section className="card-surface p-5">
            {!player ? (
              <div className="text-sm text-gray-400">Joueur non trouvé.</div>
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
                        {player.age != null && (
                          <span className="pill">
                            <FiCalendar className="text-gray-300" />
                            {player.age}
                          </span>
                        )}
                        {player.size != null && (
                          <span className="pill">
                            <RxHeight className="text-gray-300" />
                            {player.size}
                          </span>
                        )}
                        {player.weight != null && (
                          <span className="pill">
                            <LuWeight className="text-gray-300" />
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
                            <FiStar className="text-gray-300" />
                            {player.astrological_sign}
                          </span>
                        )}
                      </div>
                    </div>
                    {player.is_dead && (
                      <div className="text-red-400 text-sm font-semibold tracking-widest">
                        MORT
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="display-title text-xl md:text-2xl mb-3">
                    Statut & attributs
                  </div>
                  {(() => {
                    const stats = [
                      {
                        key: "orientation",
                        label: "Orientation",
                        Icon: FiCompass,
                      },
                      { key: "strength", label: "Force", Icon: FiStar },
                      {
                        key: "resistance",
                        label: "Résistance",
                        Icon: FiShield,
                      },
                      { key: "charisma", label: "Charisme", Icon: FiSmile },
                      { key: "agility", label: "Agilité", Icon: FiWind },
                      { key: "dexterity", label: "Dextérité", Icon: FiTool },
                      { key: "intuition", label: "Intuition", Icon: FiEye },
                    ] as const
                    const radarData = stats.map((s) => ({
                      stat: s.label,
                      value: (player as any)[s.key] as number,
                    }))
                    const maxVal = Math.max(...radarData.map((d) => d.value))
                    const renderTick =
                      (data: { stat: string; value: number }[]) =>
                      (props: any) => {
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
                          <div className="text-xs uppercase tracking-wider muted mb-2">
                            Statistiques
                          </div>
                          <div className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart
                                data={radarData}
                                cx="50%"
                                cy="50%"
                                outerRadius="80%"
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
                                  domain={[-0.1, maxVal]}
                                  tick={false}
                                  tickCount={5}
                                  axisLine={false}
                                />
                                <Radar
                                  name="Statistiques"
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
                            <div className="text-xs uppercase tracking-wider muted mb-1 flex items-center gap-2">
                              <FiHeart className="text-gray-400" />
                              <span>Santé</span>
                            </div>
                            <div className="progress">
                              <div className="progress-track">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${
                                      (Math.min(
                                        player.hp_current,
                                        player.hp_max
                                      ) /
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
                            <div className="text-xs uppercase tracking-wider muted mb-1 flex items-center gap-2">
                              <FiZap className="text-gray-400" />
                              <span>Points d'action</span>
                            </div>
                            <div className="progress">
                              <div className="progress-track">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${
                                      (Math.max(0, player.action_points) / 3) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                            <div className="text-xs mt-1">
                              {player.action_points} / 3
                            </div>
                          </div>
                          <div className="card-surface p-3">
                            <div className="text-xs uppercase tracking-wider muted mb-1 flex items-center gap-2">
                              <MdOutlineFastfood className="text-gray-400" />
                              <span>Faim</span>
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
                              <FiDroplet className="text-gray-400" />
                              <span>Soif</span>
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
                            <div className="text-xs uppercase tracking-wider muted mb-1 flex items-center gap-2">
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
              <div className="muted text-sm mb-2">
                Informations additionnelles
              </div>
              <div className="space-y-3 text-sm flex flex-col gap-2">
                {player.history && (
                  <div>
                    <div className="muted flex items-center gap-2">
                      <FiBook className="text-gray-400" />
                      <span>Histoire</span>
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
                      <span>Description physique</span>
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
                      <span>Traits de caractère</span>
                    </div>
                    <div className="whitespace-pre-wrap max-h-64 overflow-auto">
                      {player.character_traits}
                    </div>
                  </div>
                )}
                {!player.history &&
                  !player.physical_description &&
                  !player.character_traits && (
                    <div className="text-gray-500">
                      Aucune information additionnelle
                    </div>
                  )}
              </div>
            </section>
          )}
        </div>

        {personalInv && personalInv.length > 0 ? (
          <div className="lg:col-span-1 lg:sticky lg:top-20">
            <section className="card-surface p-5">
              <div className="display-title text-lg mb-2">
                Inventaire du personnage
              </div>
              {!player ? (
                <div className="text-sm text-gray-400">Joueur non trouvé.</div>
              ) : (
                <div className="space-y-2">
                  {personalInv && personalInv.length > 0 ? (
                    <ul className="space-y-2">
                      {personalInv.map((it) => (
                        <li
                          key={it.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="truncate">{it.item_name}</div>
                          <div className="text-right w-14">x{it.quantity}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-400">Aucun objet</div>
                  )}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
