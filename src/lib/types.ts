export type AppState = {
  id: string
  day: number
  tokens: number
  led_main_text: string
  led_small_top: string
  led_small_bottom: string
}

export type InventoryItem = {
  id: string
  item_name: string
  quantity: number
}

export type Player = {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  is_dead: boolean
  hp_current: number
  hp_max: number
  action_points: number
  hunger: number
  thirst: number
  fatigue: number
  orientation: number
  strength: number
  resistance: number
  charisma: number
  agility: number
  dexterity: number
  intuition: number
  order: number
  history?: string | null
  physical_description?: string | null
  character_traits?: string | null
  age?: string | null
  size?: string | null
  weight?: string | null
  sex?: string | null
  astrological_sign?: string | null
}

export type Shop = {
  id: string
  unlocked: boolean
  slug: string
}

export type ShopItem = {
  id: string
  shop_id: string
  name: string
  price: number
  bundle_quantity: number
  disabled?: boolean
}

export type Message = {
  id: string
  content: string
  target_player_id: string | null
  show: boolean
  created_at: string
}
